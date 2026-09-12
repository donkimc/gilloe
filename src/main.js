import "./styles.css";
import { brand, createCopy } from "./content.js";
import { createStorage, STORAGE_KEY } from "./storage.js";
import { SCREENS, createInitialState, currentPlace, ensureAssembleKit, gridN, needsLiveLocation, reduce } from "./state.js";
import { distanceMeters, placeProgresses } from "./geo.js";
import { createLocationService } from "./location.js";
import { createMapService } from "./map.js";
import { placeOnCell, snapPlacement } from "./assemble.js";
import { pickRandomImage } from "./puzzleImages.js";
import { render } from "./ui/screens.js";
import { createSimulatedGeolocation, parseSim } from "./simulate.js";
import { createGame, deleteGame, fetchWalkingLine, getGame, listGames, resolvePlace, updateGame } from "./api.js";

const ui = document.querySelector("#ui");
const mapHost = document.querySelector(".map-host");
const persist = createStorage();
const sim = parseSim(window.location.search);

let simMinimized = false;
let gpsMode = sim.gps || (sim.panel ? "good" : "live");
let mapFail = sim.map === "fail";
let createDraft = blankDraft();
let createBusy = false;
let createError = "";
let previewPlaying = false;
let previewRaf = 0;
let previewTour = false;
let previewStopIndex = 0;
let previewCard = false;
let previewDone = false;
let previewStops = [];
let tourToken = 0;
let mapReady = false;
let approachAdded = false;

function emptyRows(n) {
  return Array.from({ length: n }, () => ({ url: "", resolved: null, resolving: false }));
}

function blankDraft() {
  return { editingId: null, title: "", placeCount: 4, rows: emptyRows(4), jigsawSource: "final-place", imageDataUrl: null };
}

function draftFromGame(game) {
  return {
    editingId: game.id,
    title: game.title || "",
    placeCount: game.placeCount || 4,
    jigsawSource: game.jigsaw?.source || "system",
    systemImageId: game.jigsaw?.systemImageId || null,
    imageDataUrl: null,
    rows: (game.places || []).map((place) => ({
      url: place.naverUrl || "",
      resolving: false,
      resolved: {
        ok: Number.isFinite(place.lat) && Number.isFinite(place.lng),
        name: place.name,
        lat: place.lat,
        lng: place.lng,
        address: place.address,
        photoUrl: place.photoUrl,
        blurb: place.blurb,
      },
    })),
  };
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
  const showMap =
    needsLiveLocation(next.screen) && !mapFail && next.mapStatus !== "failed" && next.game;
  mapHost.hidden = !showMap;
  mapHost.classList.toggle("is-tour", Boolean(previewTour && showMap));
  document.getElementById("app")?.classList.toggle("is-tour", Boolean(previewTour && showMap));
  if (showMap) {
    ensureMap().then(() => {
      if (next.screen === "preview" && previewTour) return;
      map.invalidate();
      if (next.screen === "preview") map.focusOverview(next.game.places);
      else map.focusStop(currentPlace(next));
    });
  } else if (previewTour) {
    stopPreviewTour();
  }
}

async function walkingLineForGame(game) {
  const places = game.places || [];
  const line = game.routeLine;
  if (Array.isArray(line) && line.length > places.length) return line;
  if (game.id === "cheonho-pieces") {
    try {
      const res = await fetch("/route.geojson");
      const data = await res.json();
      const coords = data?.features?.[0]?.geometry?.coordinates;
      if (Array.isArray(coords) && coords.length > places.length) return coords;
    } catch {
      /* keep stored line */
    }
  }
  return line;
}

async function ensureMap() {
  if (mapFail) {
    if (state.mapStatus !== "failed") dispatch({ type: "MAP_STATUS", status: "failed" });
    return;
  }
  if (mapReady || !state.game) return;
  const ok = await map.mount(document.querySelector("#map"), {
    places: state.game.places,
    routeLine: await walkingLineForGame(state.game),
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
  addApproach(fix);
});

async function addApproach(fix) {
  if (approachAdded || previewTour || !state.game || !mapReady) return;
  const first = state.game.places?.[0];
  if (!first || !Number.isFinite(fix?.lat) || !Number.isFinite(fix?.lng)) return;
  if (distanceMeters({ lat: fix.lat, lng: fix.lng }, first) < 50) {
    approachAdded = true;
    return;
  }
  approachAdded = true;
  try {
    const line = await fetchWalkingLine([{ lat: fix.lat, lng: fix.lng }, first]);
    if (!Array.isArray(line) || line.length < 2) return;
    map.prependLine(line);
    if (state.screen === "preview" && !previewTour) map.setLineProgress(1);
  } catch {
    /* keep the published route without the approach */
  }
}

function onTourViewport() {
  if (previewTour && mapReady) map.fitTour();
}

function stopPreviewTour() {
  tourToken += 1;
  previewPlaying = false;
  previewTour = false;
  previewCard = false;
  previewDone = false;
  previewStopIndex = 0;
  previewStops = [];
  if (previewRaf) cancelAnimationFrame(previewRaf);
  previewRaf = 0;
  window.visualViewport?.removeEventListener("resize", onTourViewport);
  map.setPlaceSelect(null);
  map.showWalker(false);
  mapHost.classList.remove("is-tour");
  document.getElementById("app")?.classList.remove("is-tour");
}

function startPreviewTour() {
  if (!state.game || previewTour) return;
  previewTour = true;
  previewPlaying = true;
  previewCard = false;
  previewDone = false;
  previewStopIndex = 0;
  mapHost.classList.add("is-tour");
  document.getElementById("app")?.classList.add("is-tour");
  window.visualViewport?.addEventListener("resize", onTourViewport);
  paint();
  const startTrace = () => {
    if (!previewTour) return;
    map.fitTour();
    map.showWalker(true);
    map.setLineProgress(0);
    previewStops = placeProgresses(map.routeCoords(), state.game.places);
    map.setPlaceSelect(onTourPlaceSelect);
    runTourLeg(0, 0);
  };
  window.requestAnimationFrame(() => {
    ensureMap().then(() => {
      window.requestAnimationFrame(() => {
        window.setTimeout(startTrace, 120);
      });
    });
  });
}

function onTourPlaceSelect(place) {
  if (!previewTour || previewPlaying || !place) return;
  tourToken += 1;
  previewStopIndex = Math.max(0, (place.order || 1) - 1);
  previewCard = true;
  map.setActive(place.order);
  paint();
}

function finishTourStay() {
  tourToken += 1;
  previewPlaying = false;
  previewCard = false;
  previewDone = true;
  if (previewRaf) cancelAnimationFrame(previewRaf);
  previewRaf = 0;
  map.setLineProgress(1);
  map.showWalker(false);
  map.setActive(null);
  map.fitTour();
  paint();
}

function revealTourStop(index) {
  previewStopIndex = index;
  previewCard = true;
  previewPlaying = false;
  map.setLineProgress(previewStops[index] ?? 1);
  map.setActive((state.game.places?.[index]?.order) ?? index + 1);
  paint();
  const token = tourToken;
  window.setTimeout(() => {
    if (token !== tourToken || !previewTour) return;
    advanceTour();
  }, 4000);
}

function advanceTour() {
  if (!previewTour || !state.game) return;
  const next = previewStopIndex + (previewCard ? 1 : 0);
  if (previewCard && next >= (state.game.places || []).length) {
    finishTourStay();
    return;
  }
  const from = previewCard ? previewStops[previewStopIndex] ?? 0 : 0;
  const index = previewCard ? previewStopIndex + 1 : previewStopIndex;
  previewCard = false;
  previewPlaying = true;
  previewStopIndex = index;
  paint();
  runTourLeg(from, index);
}

function runTourLeg(fromT, stopIndex) {
  const toT = previewStops[stopIndex] ?? 1;
  const start = performance.now();
  const span = Math.max(0.04, toT - fromT);
  const dur = Math.max(2600, span * 5200 + 1600);
  const tick = (now) => {
    if (!previewTour) return;
    const t = Math.min(1, (now - start) / dur);
    map.setLineProgress(fromT + (toT - fromT) * t);
    if (t < 1) previewRaf = requestAnimationFrame(tick);
    else revealTourStop(stopIndex);
  };
  if (previewRaf) cancelAnimationFrame(previewRaf);
  previewRaf = requestAnimationFrame(tick);
}

function openNaverMap(app, web) {
  const https = web || app;
  const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || "");
  if (mobile && app && String(app).startsWith("nmap:")) {
    window.location.href = app;
    window.setTimeout(() => {
      if (document.visibilityState === "visible" && https) window.open(https, "_blank", "noopener,noreferrer");
    }, 900);
    return;
  }
  if (https) window.open(https, "_blank", "noopener,noreferrer");
}

function flyPieceThen(done) {
  const from = ui.querySelector(".piece-award");
  const to = ui.querySelector("[data-action=notebook]");
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (!from || !to || reduced) {
    done();
    return;
  }
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const clone = from.cloneNode(true);
  clone.classList.add("piece-fly");
  clone.style.left = `${a.left}px`;
  clone.style.top = `${a.top}px`;
  clone.style.width = `${a.width}px`;
  clone.style.height = `${a.height}px`;
  document.body.appendChild(clone);
  requestAnimationFrame(() => {
    clone.style.transform = `translate(${b.left + b.width / 2 - a.left - a.width / 2}px, ${b.top + b.height / 2 - a.top - a.height / 2}px) scale(0.18)`;
    clone.style.opacity = "0.15";
  });
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    clone.remove();
    done();
  };
  clone.addEventListener("transitionend", finish, { once: true });
  window.setTimeout(finish, 700);
}

function paint() {
  ui.innerHTML = render({
    ...state,
    createDraft,
    createBusy,
    createError,
    previewPlaying,
    previewTour,
    previewStopIndex,
    previewCard,
    previewDone,
    simPanel: sim.panel,
    simMinimized,
  });
  bindUi();
  bindAssemble();
}

function bindUi() {
  ui.onclick = (event) => {
    const naver = event.target.closest("a.tour-naver");
    if (naver) {
      event.preventDefault();
      event.stopPropagation();
      openNaverMap(naver.getAttribute("href"), naver.getAttribute("data-web"));
      return;
    }
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
    const run = () => onPlaceUrl(Number(input.dataset.index), input.value.trim());
    input.addEventListener("change", run);
    input.addEventListener("paste", () => queueMicrotask(run));
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
  if (!url) return;
  const rows = [...createDraft.rows];
  if (rows[index]?.url === url && (rows[index].resolving || rows[index].resolved?.ok)) return;
  rows[index] = { ...rows[index], url, resolving: true, resolved: null };
  createDraft = { ...createDraft, rows };
  paint();
  try {
    const resolved = await resolvePlace(url);
    if (createDraft.rows[index]?.url !== url) return;
    createDraft = {
      ...createDraft,
      rows: createDraft.rows.map((row, i) => (i === index ? { url, resolved, resolving: false } : row)),
    };
  } catch {
    if (createDraft.rows[index]?.url !== url) return;
    createDraft = {
      ...createDraft,
      rows: createDraft.rows.map((row, i) =>
        i === index ? { url, resolved: { ok: false, error: createCopy.needServer }, resolving: false } : row,
      ),
    };
  }
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
      createDraft = blankDraft();
      createError = "";
      dispatch({ type: "OPEN_CREATE" });
      break;
    case "edit-game":
      try {
        const game = await getGame(dataset.id);
        createDraft = draftFromGame(game);
        createError = "";
        dispatch({ type: "OPEN_CREATE" });
      } catch {
        dispatch({ type: "GAMES_ERROR", error: "load" });
      }
      break;
    case "ask-delete-game":
      dispatch({ type: "OPEN_DELETE", id: dataset.id, title: dataset.title });
      break;
    case "confirm-delete-game":
      await confirmDelete(dataset.id);
      break;
    case "back-library":
      createDraft = blankDraft();
      createError = "";
      dispatch({ type: "RESET" });
      break;
    case "select-game":
      try {
        const game = await getGame(dataset.id);
        persist.clear();
        mapReady = false;
        approachAdded = false;
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
      dispatch({ type: "LOCATION_ASKED" });
      break;
    case "continue":
      stopPreviewTour();
      dispatch({ type: "CONTINUE" });
      break;
    case "start-preview":
      startPreviewTour();
      break;
    case "close-preview":
      stopPreviewTour();
      if (mapReady && state.game) map.focusOverview(state.game.places);
      paint();
      break;
    case "tour-next":
      tourToken += 1;
      advanceTour();
      break;
    case "skip-locate":
      location.stop();
      dispatch({
        type: "LOCATION_STATUS",
        status: ["denied", "unavailable", "timeout"].includes(state.locationStatus) ? state.locationStatus : "timeout",
        manualAvailable: true,
      });
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
      flyPieceThen(() => dispatch({ type: "COLLECT_PIECE", pieceId: `piece-${state.currentStop}` }));
      break;
    case "reset":
      location.stop();
      persist.clear();
      mapReady = false;
      approachAdded = false;
      stopPreviewTour();
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
    const payload = {
      title: createDraft.title,
      placeCount: createDraft.placeCount,
      places,
      jigsaw: {
        source: createDraft.jigsawSource,
        imageDataUrl: createDraft.imageDataUrl,
        systemImageId: createDraft.systemImageId || pickRandomImage(),
      },
    };
    const game = createDraft.editingId
      ? await updateGame(createDraft.editingId, payload)
      : await createGame(payload);
    if (createDraft.editingId && persist.load({ allowedScreens: SCREENS })?.gameId === createDraft.editingId) {
      persist.clear();
    }
    const games = await listGames();
    createDraft = blankDraft();
    createBusy = false;
    dispatch({ type: "CREATE_SAVED", message: `${game.title} · ${game.walkLabel}`, games });
  } catch (error) {
    createBusy = false;
    createError = error.message || "만들기에 실패했습니다.";
    paint();
  }
}

async function confirmDelete(id) {
  const target = id || state.deleteGameId;
  if (!target) return;
  try {
    await deleteGame(target);
    if (persist.load({ allowedScreens: SCREENS })?.gameId === target) persist.clear();
    const games = await listGames();
    createDraft = blankDraft();
    dispatch({ type: "CREATE_SAVED", message: createCopy.deleted, games });
  } catch (error) {
    dispatch({ type: "GAMES_ERROR", error: error.message || "delete" });
    dispatch({ type: "CLOSE_OVERLAY" });
  }
}

async function bootLibrary() {
  try {
    const games = await listGames();
    state = reduce(state, { type: "GAMES", games });
    if (state.gameId && !state.game) {
      try {
        const game = await getGame(state.gameId);
        state = ensureAssembleKit({ ...state, game });
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
