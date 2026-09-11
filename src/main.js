import "./styles.css";
import { accusation, game, stopByOrder, stops } from "./content.js";
import { createStorage, STORAGE_KEY } from "./storage.js";
import { SCREENS, createInitialState, needsCamera, needsLiveLocation, reduce } from "./state.js";
import { createLocationService } from "./location.js";
import { createCameraService } from "./camera.js";
import { createMapService } from "./map.js";
import { checkAccusation, checkChoice, checkMatchPuzzle, checkOrder, moveItem } from "./puzzles.js";
import { render } from "./ui/screens.js";
import { bindHoldToReveal, downloadJson } from "./ui/components.js";
import { createSimulatedGeolocation, createSimulatedMedia, parseSim } from "./simulate.js";
import { applyWorldAnchorStyle, createWorldAnchor } from "./worldAnchor.js";

const ui = document.querySelector("#ui");
const mapHost = document.querySelector(".map-host");
const persist = createStorage();
const sim = parseSim(window.location.search);

let simMinimized = false;
let gpsMode = sim.gps || (sim.panel ? "good" : "live");
// In ?sim=1 default to a visible fake camera feed so desktop/prototype demos work.
let cameraMode = sim.camera || (sim.panel ? "ok" : "live");
let mapFail = sim.map === "fail";
const fakeGeo = createSimulatedGeolocation(gpsMode, { stop: stops[0] });

function geoApi() {
  if (sim.panel || (sim.gps && sim.gps !== "live")) return fakeGeo;
  return typeof navigator !== "undefined" ? navigator.geolocation : null;
}

function mediaApi() {
  if (cameraMode !== "live") return createSimulatedMedia(cameraMode);
  return typeof navigator !== "undefined" ? navigator.mediaDevices : null;
}

const location = createLocationService({ geolocation: geoApi() });
const camera = createCameraService({
  mediaDevices: {
    getUserMedia: (opts) => {
      const media = mediaApi();
      if (!media) {
        const err = new Error("unavailable");
        err.name = "NotFoundError";
        throw err;
      }
      return media.getUserMedia(opts);
    },
  },
});
const map = createMapService();
const worldAnchor = createWorldAnchor();

let state = restore();
let mapReady = false;

function restore() {
  const saved = persist.load({ gameId: game.id, allowedScreens: SCREENS });
  if (!saved) {
    try {
      if (localStorage.getItem(STORAGE_KEY)) {
        return reduce(createInitialState(), { type: "INVALID_SAVE" });
      }
    } catch {
      /* ignore */
    }
    return createInitialState();
  }
  return reduce(createInitialState(), { type: "RESTORE", saved });
}

function dispatch(action) {
  const prev = state;
  state = reduce(state, action);
  persistIfNeeded();
  syncDevices(prev, state);
  paint();
}

function persistIfNeeded() {
  if (state.screen === "cover" && !state.playerMode) return;
  persist.save(state);
}

function syncDevices(prev, next) {
  const leavingCamera = needsCamera(prev.screen) && !needsCamera(next.screen);
  const overlayOnCamera = needsCamera(next.screen) && Boolean(next.overlay);
  if (leavingCamera || overlayOnCamera) {
    worldAnchor.stop();
    camera.stop();
  }
  if (needsLiveLocation(next.screen) && next.locationPermissionAsked) {
    const restart =
      prev.screen !== next.screen ||
      prev.currentStop !== next.currentStop ||
      (!prev.locationPermissionAsked && next.locationPermissionAsked);
    if (restart) startWatch();
  } else if (!needsLiveLocation(next.screen)) {
    location.stop();
  }
  const showMap = needsLiveLocation(next.screen) && !mapFail && next.mapStatus !== "failed";
  mapHost.hidden = !showMap;
  if (needsLiveLocation(next.screen) && !mapFail) {
    ensureMap().then(() => {
      map.invalidate();
      if (next.screen === "route-overview") map.focusOverview(stops);
      else map.focusStop(stopByOrder(next.currentStop));
    });
  }
}

async function ensureMap() {
  if (mapFail) {
    if (state.mapStatus !== "failed") dispatch({ type: "MAP_STATUS", status: "failed" });
    return;
  }
  if (mapReady) return;
  const ok = await map.mount(document.querySelector("#map"), {
    stops,
    geoJsonUrl: game.geoJsonUrl,
    onError() {
      mapReady = false;
      state = reduce(state, { type: "MAP_STATUS", status: "failed" });
      persistIfNeeded();
      paint();
    },
    onTilesFailed() {
      state = reduce(state, { type: "MAP_STATUS", status: "tiles" });
      persistIfNeeded();
      paint();
    },
  });
  mapReady = ok;
  if (ok && state.mapStatus !== "ok") {
    state = reduce(state, { type: "MAP_STATUS", status: "ok" });
    persistIfNeeded();
    paint();
  }
}

function startWatch() {
  const stop = stopByOrder(state.currentStop) || stops[0];
  fakeGeo._setMode(gpsMode === "live" ? "good" : gpsMode, { stop });
  location.start({
    stop,
    options: game.locationOptions,
    accuracyCeilingMeters: game.accuracyCeilingMeters,
    manualFallbackAfterMs: game.manualFallbackAfterMs,
  });
}

location.onChange((payload) => {
  state = reduce(state, { type: "LOCATION_STATUS", ...payload });
  paint();
});

location.onFix((fix) => {
  if (mapReady) map.setPlayer(fix.lat, fix.lng, fix.accuracyMeters);
});

function paint() {
  ui.innerHTML = render({ ...state, simPanel: sim.panel, simMinimized });
  bindUi();
  // Full HTML re-renders replace <video>; keep the live stream attached.
  if (needsCamera(state.screen) && camera.hasActiveStream()) {
    camera.attach(document.querySelector("#camera-video"));
  }
  syncWorldAnchor();
}

function bindUi() {
  ui.onclick = (event) => {
    const simBtn = event.target.closest("[data-sim]");
    if (simBtn) {
      handleSim(simBtn.dataset.sim, simBtn.dataset.value);
      return;
    }
    const button = event.target.closest("[data-action]");
    if (button) handleAction(button.dataset.action, button.dataset);
  };

  ui.onchange = (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== "radio") return;
    if (["understand", "walk", "gps", "camera", "another", "duo"].includes(input.name)) {
      dispatch({ type: "FEEDBACK", id: input.name, value: input.value });
      return;
    }
    dispatch({ type: "PUZZLE_DRAFT", draft: { [input.name]: input.value } });
  };

  ui.querySelectorAll("[data-choice]").forEach((node) => {
    const choose = () =>
      dispatch({ type: "PUZZLE_DRAFT", draft: { hotspot: node.dataset.choice, choice: node.dataset.choice } });
    node.addEventListener("click", choose);
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        choose();
      }
    });
  });

  bindHoldToReveal(ui);
  const arrive = ui.querySelector('[data-action="arrive"]');
  if (arrive && !state.canAutoArrive) arrive.disabled = true;
}

function handleSim(kind, value) {
  if (kind === "gps") {
    gpsMode = value;
    if (state.locationPermissionAsked) startWatch();
  }
  if (kind === "camera") {
    cameraMode = value;
    camera.stop();
  }
  if (kind === "map") {
    mapFail = true;
    map.unmount();
    mapReady = false;
    mapHost.hidden = true;
    dispatch({ type: "MAP_STATUS", status: "failed" });
  }
}

function handleAction(action, dataset) {
  const stop = stopByOrder(state.currentStop);
  switch (action) {
    case "sim-toggle":
      simMinimized = !simMinimized;
      paint();
      break;
    case "start":
      dispatch({ type: "GOTO", screen: "mode" });
      break;
    case "resume":
      dispatch({
        type: "GOTO",
        screen: state.safetyAccepted ? "briefing" : "safety",
      });
      break;
    case "reset":
      camera.stop();
      location.stop();
      persist.clear();
      dispatch({ type: "RESET" });
      break;
    case "mode":
      dispatch({ type: "SELECT_MODE", mode: dataset.mode });
      break;
    case "accept-safety":
      dispatch({ type: "ACCEPT_SAFETY" });
      break;
    case "continue":
      dispatch({ type: "CONTINUE" });
      break;
    case "notebook":
      dispatch({ type: "OPEN_NOTEBOOK" });
      break;
    case "close-overlay":
      dispatch({ type: "CLOSE_OVERLAY" });
      break;
    case "help":
      dispatch({ type: "OPEN_HELP" });
      break;
    case "exit":
      dispatch({ type: "OPEN_EXIT" });
      break;
    case "find-location":
    case "retry-location":
      dispatch({ type: "LOCATION_ASKED" });
      break;
    case "arrive":
      if (state.canAutoArrive) dispatch({ type: "ARRIVE", manual: false });
      break;
    case "manual":
      dispatch({ type: "OPEN_MANUAL" });
      break;
    case "confirm-manual":
      dispatch({ type: "ARRIVE", manual: true });
      break;
    case "stopped":
      dispatch({ type: "STOP_WALKING" });
      break;
    case "to-puzzle":
      dispatch({
        type: "GOTO",
        screen: state.currentStop === 4 ? "accusation" : `puzzle-stop-${state.currentStop}`,
      });
      break;
    case "duo-pass-evidence":
      dispatch({ type: "SET_DUO_PHASE", phase: "pass-evidence" });
      break;
    case "duo-evidence":
      dispatch({ type: "SET_DUO_PHASE", phase: "evidence" });
      break;
    case "duo-pass-discuss":
      dispatch({ type: "SET_DUO_PHASE", phase: "pass-discuss" });
      break;
    case "duo-discuss":
      dispatch({ type: "SET_DUO_PHASE", phase: "discuss" });
      break;
    case "discussed":
    case "duo-alone":
      dispatch({ type: "DISCUSSED" });
      break;
    case "hint":
      dispatch({ type: "USE_HINT", puzzleId: stop.id });
      break;
    case "check-match":
      checkMatch();
      break;
    case "check-hotspot":
      checkHotspot();
      break;
    case "check-order":
      checkTimeline();
      break;
    case "check-accusation":
      dispatch({ type: "ACCUSATION_RESULT", check: checkAccusation(state.puzzleDraft, accusation.solution) });
      break;
    case "move-up":
      moveOrder(-1, Number(dataset.index));
      break;
    case "move-down":
      moveOrder(1, Number(dataset.index));
      break;
    case "start-camera":
      startCamera();
      break;
    case "skip-camera":
      worldAnchor.stop();
      camera.stop();
      dispatch({ type: "CAMERA_STATUS", status: "fallback" });
      break;
    case "collect-camera":
      worldAnchor.stop();
      camera.stop();
      dispatch({
        type: "COLLECT_CAMERA",
        fallback: state.cameraStatus !== "active",
      });
      break;
    case "after-puzzle":
      dispatch({ type: "AFTER_PUZZLE" });
      break;
    case "download-feedback":
      downloadJson("gilloe-feedback.json", {
        gameId: game.id,
        playerMode: state.playerMode,
        answers: state.feedbackAnswers,
        hintsUsed: state.hintsUsed,
        cameraFallback: state.cameraFallbackIds,
        fieldVerified: false,
        note: "No coordinates or media included.",
      });
      break;
    default:
      break;
  }
}

function checkMatch() {
  const puzzleStop = stopByOrder(1);
  const result = checkMatchPuzzle(state.puzzleDraft, puzzleStop.puzzle.solution);
  if (!result.complete || !result.correct) {
    dispatch({ type: "PUZZLE_MESSAGE", message: puzzleStop.puzzle.wrong });
    return;
  }
  dispatch({ type: "SOLVE", puzzleId: puzzleStop.id, message: puzzleStop.puzzle.success });
}

function checkHotspot() {
  const puzzleStop = stopByOrder(2);
  const answer = state.puzzleDraft.choice || state.puzzleDraft.hotspot;
  const result = checkChoice(answer, puzzleStop.puzzle.solution);
  if (!result.correct) {
    const choice = puzzleStop.puzzle.choices.find((c) => c.id === answer);
    dispatch({ type: "PUZZLE_MESSAGE", message: choice?.wrong || "다시 고르세요." });
    return;
  }
  dispatch({ type: "SOLVE", puzzleId: puzzleStop.id, message: puzzleStop.puzzle.success });
}

function checkTimeline() {
  const puzzleStop = stopByOrder(3);
  const ids = state.puzzleDraft.order || puzzleStop.puzzle.items.map((item) => item.id);
  const result = checkOrder(ids, puzzleStop.puzzle.solution);
  if (!result.correct) {
    dispatch({ type: "PUZZLE_MESSAGE", message: puzzleStop.puzzle.wrong });
    return;
  }
  dispatch({ type: "SOLVE", puzzleId: puzzleStop.id, message: puzzleStop.puzzle.success });
}

function moveOrder(direction, index) {
  const puzzleStop = stopByOrder(3);
  const ids = state.puzzleDraft.order || puzzleStop.puzzle.items.map((item) => item.id);
  dispatch({ type: "PUZZLE_DRAFT", draft: { order: moveItem(ids, index, direction) } });
}

async function startCamera() {
  dispatch({ type: "CAMERA_STATUS", status: "starting" });
  try {
    const video = document.querySelector("#camera-video");
    await camera.start(video);
    // Mark active, then re-bind after paint so the navy umbrella sits on live video.
    dispatch({ type: "CAMERA_STATUS", status: "active" });
    camera.attach(document.querySelector("#camera-video"));
    await syncWorldAnchor(true);
  } catch (error) {
    worldAnchor.stop();
    camera.stop();
    const status = error?.name === "NotAllowedError" ? "denied" : "unavailable";
    dispatch({ type: "CAMERA_STATUS", status });
    dispatch({ type: "CAMERA_STATUS", status: "fallback" });
  }
}

async function syncWorldAnchor(forceStart = false) {
  const clue = document.querySelector("[data-ar-clue]");
  const viewfinder = document.querySelector(".viewfinder");
  const hint = document.querySelector("#ar-hint");
  const live = needsCamera(state.screen) && state.cameraStatus === "active" && camera.hasActiveStream();
  if (!live || !clue) {
    worldAnchor.stop();
    if (hint) hint.hidden = true;
    return;
  }
  const onPose = (pose) => {
    applyWorldAnchorStyle(clue, pose, viewfinder);
    clue.classList.toggle("is-world-locked", Boolean(pose.ready));
    if (hint) hint.hidden = Boolean(pose.visible);
  };
  if (forceStart || !worldAnchor.isListening()) {
    await worldAnchor.start(onPose);
  } else {
    worldAnchor.setHandler(onPose);
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    worldAnchor.stop();
    camera.stop();
    location.stop();
    if (needsCamera(state.screen)) {
      state = reduce(state, { type: "CAMERA_STATUS", status: "interrupted" });
      paint();
    }
  } else if (needsLiveLocation(state.screen) && state.locationPermissionAsked) {
    startWatch();
  }
});

window.addEventListener("pagehide", () => {
  worldAnchor.stop();
  camera.stop();
  location.stop();
});

window.addEventListener("popstate", () => dispatch({ type: "BACK" }));

function boot() {
  paint();
  mapHost.hidden = !needsLiveLocation(state.screen) || mapFail;
  if (needsLiveLocation(state.screen) && state.locationPermissionAsked) startWatch();
  if (needsLiveLocation(state.screen) && !mapFail) ensureMap();
}

boot();
