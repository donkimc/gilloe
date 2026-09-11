import "./styles.css";
import { game, stopByOrder, stops } from "./content.js";
import { createStorage, STORAGE_KEY } from "./storage.js";
import { SCREENS, createInitialState, needsCamera, needsLiveLocation, reduce } from "./state.js";
import { createLocationService } from "./location.js";
import { createCameraService } from "./camera.js";
import { createMapService } from "./map.js";
import { placeOnCell, snapPlacement } from "./assemble.js";
import { render } from "./ui/screens.js";
import { downloadJson } from "./ui/components.js";
import { createSimulatedGeolocation, createSimulatedMedia, parseSim } from "./simulate.js";
import { applyWorldAnchorStyle, createWorldAnchor, updateLookGuidance } from "./worldAnchor.js";

const ui = document.querySelector("#ui");
const mapHost = document.querySelector(".map-host");
const persist = createStorage();
const sim = parseSim(window.location.search);

let simMinimized = false;
let gpsMode = sim.gps || (sim.panel ? "good" : "live");
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
  worldAnchor.setPlayerFix(fix);
  if (mapReady) map.setPlayer(fix.lat, fix.lng, fix.accuracyMeters);
});

function paint() {
  ui.innerHTML = render({ ...state, simPanel: sim.panel, simMinimized });
  bindUi();
  if (needsCamera(state.screen) && camera.hasActiveStream()) {
    camera.attach(document.querySelector("#camera-video"));
  }
  syncWorldAnchor();
  bindAssemble();
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
    }
  };

  const arrive = ui.querySelector('[data-action="arrive"]');
  if (arrive && !state.canAutoArrive) arrive.disabled = true;
}

function bindAssemble() {
  if (state.screen !== "assemble" || state.assembleComplete) return;
  const board = ui.querySelector("[data-assemble-board]");
  if (!board) return;

  ui.querySelectorAll(".assemble-piece").forEach((node) => {
    node.addEventListener("pointerdown", (event) => {
      const pieceId = node.dataset.piece;
      const startX = event.clientX;
      const startY = event.clientY;
      let ghost = null;
      let dragging = false;
      node.setPointerCapture(event.pointerId);

      const move = (moveEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (!dragging && Math.hypot(dx, dy) < 10) return;
        dragging = true;
        if (!ghost) {
          ghost = node.cloneNode(true);
          ghost.classList.add("assemble-ghost");
          document.body.appendChild(ghost);
        }
        ghost.style.left = `${moveEvent.clientX - 40}px`;
        ghost.style.top = `${moveEvent.clientY - 40}px`;
      };
      const up = (upEvent) => {
        node.removeEventListener("pointermove", move);
        node.removeEventListener("pointerup", up);
        node.removeEventListener("pointercancel", up);
        ghost?.remove();
        if (!dragging) return;
        const next = snapPlacement(
          state.assemblePlacement,
          pieceId,
          upEvent.clientX,
          upEvent.clientY,
          board.getBoundingClientRect(),
        );
        dispatch({ type: "PLACE_PIECE", placement: next });
      };
      node.addEventListener("pointermove", move);
      node.addEventListener("pointerup", up);
      node.addEventListener("pointercancel", up);
    });
  });
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
    case "hint":
      dispatch({ type: "USE_HINT", puzzleId: "assemble" });
      break;
    case "select-piece":
      dispatch({ type: "SELECT_PIECE", pieceId: dataset.piece });
      break;
    case "place-cell": {
      if (!state.assembleSelected) break;
      const placement = placeOnCell(state.assemblePlacement, state.assembleSelected, dataset.cell);
      dispatch({ type: "PLACE_PIECE", placement });
      break;
    }
    case "collect-piece":
      dispatch({ type: "COLLECT_PIECE", pieceId: stop.pieceId });
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

async function startCamera() {
  await worldAnchor.requestPermission().catch(() => false);
  if (state.locationPermissionAsked) startWatch();
  dispatch({ type: "CAMERA_STATUS", status: "starting" });
  try {
    const video = document.querySelector("#camera-video");
    await camera.start(video);
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
    const guide = document.querySelector("#ar-guide");
    if (guide) guide.hidden = true;
    return;
  }
  const stop = stopByOrder(2);
  const geo = stop?.cameraClue?.geoAnchor || stop?.coordinates;
  worldAnchor.setGeoTarget(geo);
  worldAnchor.setPlayerFix(location.getLastFix());
  const onPose = (pose) => {
    const node = document.querySelector("[data-ar-clue]");
    const vf = document.querySelector(".viewfinder");
    const tip = document.querySelector("#ar-hint");
    const guide = document.querySelector("#ar-guide");
    if (!node) return;
    const guidance = applyWorldAnchorStyle(node, pose, vf);
    const onScreen = Boolean(guidance?.onScreen);
    node.classList.toggle("is-world-locked", Boolean(pose.ready));
    if (tip) tip.hidden = true;
    updateLookGuidance(guide, pose, onScreen);
  };
  if (forceStart || !worldAnchor.isListening()) {
    await worldAnchor.start(onPose, { viewfinder });
  } else {
    worldAnchor.setHandler(onPose);
    worldAnchor.bindViewfinder(viewfinder);
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
