import "./styles.css";
import { brand } from "./content.js";
import { createStorage, STORAGE_KEY } from "./storage.js";
import { SCREENS, createInitialState, currentPlace, gridN, needsLiveLocation, reduce } from "./state.js";
import { createLocationService } from "./location.js";
import { createMapService } from "./map.js";
import { placeOnCell, snapPlacement } from "./assemble.js";
import { pickRandomImage } from "./puzzleImages.js";
import { render } from "./ui/screens.js";
import { createSimulatedGeolocation, parseSim } from "./simulate.js";
import { createGame, getGame, listGames, resolvePlace } from "./api.js";

const ui = document.querySelector("#ui");
const mapHost = document.querySelector(".map-host");
const persist = createStorage();
const sim = parseSim(window.location.search);

let simMinimized = false;
let gpsMode = sim.gps || (sim.panel ? "good" : "live");
let mapFail = sim.map === "fail";
let createDraft = { title: "", placeCount: 4, rows: emptyRows(4), jigsawSource: "final-place", imageDataUrl: null };
let createBusy = false;
let createError = "";
let previewPlaying = false;
let previewRaf = 0;
let mapReady = false;

function emptyRows(n) {
  return Array.from({ length: n }, () => ({ url: "", resolved: null, resolving: false }));
}

function asStop(place) {
  if (!place) return { coordinates: { lat: 37.53865, lng: 127.12385 }, arrivalRadiusMeters: 60 };
  return {
    coordinates: { lat: place.lat, lng: place.lng },
    arrivalRadiusMeters: place.arrivalRadiusMeters || 60,
  };
}

const fakeGeo = createSimulatedGeolocation(gpsMode, { stop: asStop(null) });

function geoApi() {
  if (sim.panel || (sim.gps && sim.gps !== "live")) return fakeGeo;
  return typeof navigator !== "undefined" ? navigator.geolocation : null;
}

const location = createLocationService({ geolocation: geoApi() });
const map = createMapService();
let state = restore();

function restore() {
  const saved = persist.load({ allowedScreens: SCREENS });
  if (!saved) {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return reduce(createInitialState(), { type: "INVALID_SAVE" });
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
  if (!state.gameId || state.screen === "library" || state.screen === "create") return;
  persist.save(state);
}

function syncDevices(prev, next) {
  if (needsLiveLocation(next.screen) && next.locationPermissionAsked) {
    const restart = prev.screen !== next.screen || prev.currentStop !== next.currentStop;
    if (restart) startWatch();
  } else if (!needsLiveLocation(next.screen)) {
    location.stop();
  }
  const showMap = needsLiveLocation(next.screen) && !mapFail && next.mapStatus !== "failed" && next.game;
  mapHost.hidden = !showMap;
  if (showMap) {
    ensureMap().then(() => {
      map.invalidate();
      if (next.screen === "preview") {
        map.focusOverview(next.game.places);
        if (previewPlaying) return;
        runPreview();
      } else {
        stopPreview();
        map.focusStop(currentPlace(next));
      }
    });
  } else {
    stopPreview();
  }
}

async function ensureMap() {
  if (mapFail) {
    if (state.mapStatus !== "failed") dispatch({ type: "MAP_STATUS", status: "failed" });
    return;
  }
  if (mapReady || !state.game) return;
  const ok = await map.mount(document.querySelector("#map"), {
    places: state.game.places,
    routeLine: state.game.routeLine,
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
  const stop = asStop(currentPlace(state));
  fakeGeo._setMode(gpsMode === "live" ? "good" : gpsMode, { stop });
  location.start({
    stop,
    options: brand.locationOptions,
    accuracyCeilingMeters: brand.accuracyCeilingMeters,
    manualFallbackAfterMs: brand.manualFallbackAfterMs,
  });
}

location.onChange((payload) => {
  state = reduce(state, { type: "LOCATION_STATUS", ...payload });
  paint();
});

location.onFix((fix) => {
  if (mapReady) map.setPlayer(fix.lat, fix.lng, fix.accuracyMeters);
});

function runPreview() {
  stopPreview();
  previewPlaying = true;
  map.showWalker(true);
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    map.setLineProgress(1);
    previewPlaying = false;
    paint();
    return;
  }
  const start = performance.now();
  const dur = 5200;
  const tick = (now) => {
    const t = Math.min(1, (now - start) / dur);
    map.setLineProgress(t);
    if (t < 1 && previewPlaying) previewRaf = requestAnimationFrame(tick);
    else {
      previewPlaying = false;
      map.showWalker(false);
      paint();
    }
  };
  previewRaf = requestAnimationFrame(tick);
  paint();
}

function stopPreview() {
  previewPlaying = false;
  if (previewRaf) cancelAnimationFrame(previewRaf);
  previewRaf = 0;
}

function paint() {
  ui.innerHTML = render({
    ...state,
    createDraft,
    createBusy,
    createError,
    previewPlaying,
    simPanel: sim.panel,
    simMinimized,
  });
  bindUi();
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
    if (!(input instanceof HTMLInputElement)) return;
    if (input.name === "placeCount") {
      const n = Number(input.value);
      createDraft = { ...createDraft, placeCount: n, rows: padRows(createDraft.rows, n) };
      paint();
      return;
    }
    if (input.name === "jigsawSource") {
      createDraft = { ...createDraft, jigsawSource: input.value };
      paint();
      return;
    }
    if (input.name === "jigsawFile" && input.files?.[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        createDraft = { ...createDraft, imageDataUrl: reader.result };
      };
      reader.readAsDataURL(file);
    }
  };
  ui.oninput = (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.name === "title") createDraft = { ...createDraft, title: input.value };
  };
  ui.querySelectorAll("input[name='place-url']").forEach((input) => {
    input.addEventListener("change", () => onPlaceUrl(Number(input.dataset.index), input.value));
  });
  const arrive = ui.querySelector('[data-action="arrive"]');
  if (arrive && !state.canAutoArrive) arrive.disabled = true;
}

function padRows(rows, n) {
  const next = rows.slice(0, n);
  while (next.length < n) next.push({ url: "", resolved: null, resolving: false });
  return next;
}

async function onPlaceUrl(index, url) {
  const rows = [...createDraft.rows];
  rows[index] = { ...rows[index], url, resolving: true };
  createDraft = { ...createDraft, rows };
  paint();
  try {
    const resolved = await resolvePlace(url);
    rows[index] = { url, resolved, resolving: false };
  } catch {
    rows[index] = { url, resolved: { ok: false }, resolving: false };
  }
  createDraft = { ...createDraft, rows };
  paint();
}

function bindAssemble() {
  if (state.screen !== "assemble" || state.assembleComplete) return;
  const board = ui.querySelector("[data-assemble-board]");
  if (!board) return;
  const n = gridN(state);
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
        const next = snapPlacement(state.assemblePlacement, pieceId, upEvent.clientX, upEvent.clientY, board.getBoundingClientRect(), n);
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
  if (kind === "map") {
    mapFail = true;
    map.unmount();
    mapReady = false;
    mapHost.hidden = true;
    dispatch({ type: "MAP_STATUS", status: "failed" });
  }
}

async function handleAction(action, dataset) {
  switch (action) {
    case "sim-toggle":
      simMinimized = !simMinimized;
      paint();
      break;
    case "open-create":
      dispatch({ type: "OPEN_CREATE" });
      break;
    case "back-library":
      dispatch({ type: "RESET" });
      break;
    case "select-game":
      try {
        const game = await getGame(dataset.id);
        persist.clear();
        mapReady = false;
        map.unmount();
        dispatch({ type: "SELECT_GAME", game });
      } catch {
        dispatch({ type: "GAMES_ERROR", error: "load" });
      }
      break;
    case "submit-create":
      await submitCreate();
      break;
    case "accept-safety":
      dispatch({ type: "ACCEPT_SAFETY" });
      break;
    case "continue":
    case "skip-preview":
      stopPreview();
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
    case "prev-place":
      dispatch({ type: "PREV_PLACE" });
      break;
    case "hint":
      dispatch({ type: "USE_HINT", puzzleId: "assemble" });
      break;
    case "select-piece":
      dispatch({ type: "SELECT_PIECE", pieceId: dataset.piece });
      break;
    case "place-cell": {
      if (!state.assembleSelected) break;
      const placement = placeOnCell(state.assemblePlacement, state.assembleSelected, dataset.cell, gridN(state));
      dispatch({ type: "PLACE_PIECE", placement });
      break;
    }
    case "collect-piece":
      dispatch({ type: "COLLECT_PIECE", pieceId: `piece-${state.currentStop}` });
      break;
    case "reset":
      location.stop();
      persist.clear();
      mapReady = false;
      map.unmount();
      dispatch({ type: "RESET" });
      break;
    default:
      break;
  }
}

async function submitCreate() {
  createBusy = true;
  createError = "";
  paint();
  const places = (createDraft.rows || []).slice(0, createDraft.placeCount).map((row) => ({
    naverUrl: row.url,
    name: row.resolved?.name,
    lat: row.resolved?.lat,
    lng: row.resolved?.lng,
    address: row.resolved?.address,
    photoUrl: row.resolved?.photoUrl,
    blurb: row.resolved?.blurb,
  }));
  try {
    const game = await createGame({
      title: createDraft.title,
      placeCount: createDraft.placeCount,
      places,
      jigsaw: {
        source: createDraft.jigsawSource,
        imageDataUrl: createDraft.imageDataUrl,
        systemImageId: pickRandomImage(),
      },
    });
    const games = await listGames();
    createDraft = { title: "", placeCount: 4, rows: emptyRows(4), jigsawSource: "final-place", imageDataUrl: null };
    createBusy = false;
    dispatch({ type: "CREATE_SAVED", message: `${game.title} · ${game.walkLabel}`, games });
  } catch (error) {
    createBusy = false;
    createError = error.message || "만들기에 실패했습니다.";
    paint();
  }
}

async function bootLibrary() {
  try {
    const games = await listGames();
    state = reduce(state, { type: "GAMES", games });
    if (state.gameId && !state.game) {
      try {
        const game = await getGame(state.gameId);
        state = { ...state, game };
      } catch {
        state = reduce(createInitialState(), { type: "GAMES", games });
        persist.clear();
      }
    }
  } catch {
    state = reduce(state, { type: "GAMES_ERROR", error: "list" });
  }
  paint();
  mapHost.hidden = !needsLiveLocation(state.screen) || mapFail || !state.game;
  if (needsLiveLocation(state.screen) && state.locationPermissionAsked) startWatch();
  if (needsLiveLocation(state.screen) && state.game && !mapFail) ensureMap();
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) location.stop();
  else if (needsLiveLocation(state.screen) && state.locationPermissionAsked) startWatch();
});
window.addEventListener("pagehide", () => location.stop());
window.addEventListener("popstate", () => dispatch({ type: "BACK" }));

bootLibrary();
