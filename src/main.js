import "./styles.css";
import { brand, createCopy } from "./content.js";
import { createStorage, STORAGE_KEY } from "./storage.js";
import { SCREENS, createInitialState, currentPlace, ensureAssembleKit, gridN, needsLiveLocation, placeCount, reduce } from "./state.js";
import { distanceMeters, placeProgresses } from "./geo.js";
import { createLocationService } from "./location.js";
import { createMapService } from "./map.js";
import { placeOnCell, snapPlacement } from "./assemble.js";
import { pickRandomImage } from "./puzzleImages.js";
import { render } from "./ui/screens.js";
import { createSimulatedGeolocation, parseSim } from "./simulate.js";
import { createGame, deleteGame, getGame, listGames, lookupOsmPlace, lookupOsmWalkRoute, updateGame } from "./api.js";
import { fillGpsPointsWithStreets, GPS_STREET_GAP_M } from "./osmWalkRoute.js";
import { createParty, fetchParty, joinParty, partyAction } from "./partyApi.js";
import { TEAM_PIECE, piecesForStop } from "./coopPieces.js";
import { createRouteEditor } from "./routeEditor.js";
import { defaultDraft, draftPreview } from "./ui/screens.js";
import {
  emptyDrawState,
  emptyGpsSession,
  gpsSessionToLine,
  parseGpxTrack,
  reduceDrawState,
  reduceGpsSession,
  routeVerticesFromStops,
} from "./routeSchema.js";

const ui = document.querySelector("#ui");
const mapHost = document.querySelector(".map-host");
const editorHost = document.querySelector(".editor-host");
const persist = createStorage();
const sim = parseSim(window.location.search);

let simMinimized = false;
let gpsMode = sim.gps || (sim.panel ? "good" : "live");
let mapFail = sim.map === "fail";
let createDraft = blankDraft();
let createBusy = false;
let createError = "";
let partyError = "";
let partyWait = null;
let memberToken = "";
let partyPollId = 0;
let previewPlaying = false;
let previewRaf = 0;
let previewTour = false;
let previewStopIndex = 0;
let previewCard = false;
let previewDone = false;
let previewStops = [];
let tourToken = 0;
let walkRouteToken = 0;
let walkRouteTimer = 0;
let mapReady = false;
let approachAdded = false;

function blankDraft() {
  return defaultDraft();
}

function draftFromGame(game) {
  const vertices = Array.isArray(game.routeLine) ? game.routeLine : [];
  const stops = (game.places || []).map((place, i) => ({
    id: `stop-${i + 1}`,
    order: i + 1,
    lat: place.lat,
    lng: place.lng,
    title: place.name,
    directions: place.blurb || place.directions || "",
    publicStopConfirmed: place.publicStopConfirmed !== false,
    photoDataUrl: null,
    coordinateSource: place.coordinateSource,
  }));
  return {
    ...defaultDraft(),
    editingId: game.id,
    title: game.title || "",
    method: game.source?.method || "openstreetmap-assisted-drawing",
    step: "review",
    jigsawSource: game.jigsaw?.source === "upload" ? "upload" : "system",
    systemImageId: game.jigsaw?.systemImageId || null,
    imageDataUrl: null,
    draw: { mode: "stops", stops, vertices, stopTarget: Math.max(stops.length, 2), autoRouted: false },
    gps: { ...emptyGpsSession(), stops, points: vertices.map(([lng, lat]) => ({ lat, lng })) },
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
const editor = createRouteEditor();
let editorMounted = false;
let recordWatchId = null;
let gpsFillToken = 0;
let screenWakeLock = null;
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
  syncEditor();
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
  if (Array.isArray(line) && line.length >= 2) return line;
  return places.map((p) => [p.lng, p.lat]);
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

function addApproach(fix) {
  if (approachAdded || previewTour || !state.game || !mapReady) return;
  const first = state.game.places?.[0];
  if (!first || !Number.isFinite(fix?.lat) || !Number.isFinite(fix?.lng)) return;
  approachAdded = true;
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
  if (!state.game) return;
  const firstOpen = !previewTour;
  previewTour = true;
  mapHost.classList.add("is-tour");
  document.getElementById("app")?.classList.add("is-tour");
  if (firstOpen) window.visualViewport?.addEventListener("resize", onTourViewport);
  restartTourTrace(firstOpen);
}

function restartTourTrace(waitLayout) {
  tourToken += 1;
  previewPlaying = true;
  previewCard = false;
  previewDone = false;
  previewStopIndex = 0;
  if (previewRaf) cancelAnimationFrame(previewRaf);
  previewRaf = 0;
  paint();
  const startTrace = () => {
    if (!previewTour) return;
    map.fitTour();
    map.showWalker(true);
    map.setLineProgress(0);
    map.setActive(null);
    previewStops = placeProgresses(map.routeCoords(), state.game.places);
    map.setPlaceSelect(onTourPlaceSelect);
    runTourLeg(0, 0);
  };
  if (!waitLayout && mapReady) {
    startTrace();
    return;
  }
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

const mediaBlobs = new Map();
const mediaBlobUrls = new Map();

async function mediaBlob(src) {
  if (mediaBlobs.has(src)) return mediaBlobs.get(src);
  const res = await fetch(src);
  if (!res.ok) throw new Error("media");
  const blob = await res.blob();
  if (blob.size < 32) throw new Error("media");
  mediaBlobs.set(src, blob);
  mediaBlobUrls.set(src, URL.createObjectURL(blob));
  return blob;
}

async function hydrateMediaImages(root) {
  const mediaNodes = [
    ...root.querySelectorAll("img"),
    ...root.querySelectorAll("image"),
  ].filter((node) => {
    const href = node.getAttribute("src") || node.getAttribute("href") || "";
    return href.startsWith("/uploads/");
  });
  const tiles = [...root.querySelectorAll("[data-photo]")];
  const srcs = new Set([
    ...mediaNodes.map((node) => node.getAttribute("src") || node.getAttribute("href")),
    ...tiles.map((tile) => tile.dataset.photo),
  ]);
  await Promise.all(
    [...srcs].map(async (src) => {
      if (!src) return;
      try {
        await mediaBlob(src);
        const url = mediaBlobUrls.get(src);
        mediaNodes
          .filter((node) => (node.getAttribute("src") || node.getAttribute("href")) === src)
          .forEach((node) => {
            if (node.tagName.toLowerCase() === "img") node.src = url;
            else {
              node.setAttribute("href", url);
              node.setAttributeNS("http://www.w3.org/1999/xlink", "href", url);
            }
          });
      } catch {
        /* keep original src */
      }
    }),
  );
}

function editorVisible() {
  return state.screen === "create" && ["record", "draw", "review"].includes(createDraft.step);
}

function scheduleWalkRoute() {
  clearTimeout(walkRouteTimer);
  walkRouteTimer = setTimeout(() => {
    void applyOsmWalkRoute();
  }, 400);
}

async function applyOsmWalkRoute() {
  const draw = createDraft.draw;
  if (createDraft.step !== "draw" || !draw?.autoRouted) return;
  const stops = draw.stops || [];
  if (stops.length < 2) return;
  const token = ++walkRouteToken;
  createDraft = { ...createDraft, draw: { ...draw, routing: true, routingError: "" } };
  paint();
  try {
    const result = await lookupOsmWalkRoute(stops);
    if (token !== walkRouteToken) return;
    createDraft = {
      ...createDraft,
      draw: reduceDrawState(createDraft.draw, {
        type: "SET_WALK_VERTICES",
        vertices: result.vertices,
        autoRouted: true,
        error: result.usedStreets ? "" : "일부 구간은 보행 길을 찾지 못해 직선으로 이었습니다.",
      }),
    };
  } catch (error) {
    if (token !== walkRouteToken) return;
    createDraft = {
      ...createDraft,
      draw: reduceDrawState(createDraft.draw, {
        type: "SET_WALK_VERTICES",
        vertices: routeVerticesFromStops(createDraft.draw.stops),
        autoRouted: true,
        error: error.message || "보행 경로를 만들지 못했습니다.",
      }),
    };
  }
  refreshEditor();
  paint();
}

async function onEditorClick(lat, lng) {
  if (createDraft.step !== "draw") return;
  if (createDraft.osmPick) return;
  if (createDraft.draw.routing) return;
  if (createDraft.draw.mode === "path") {
    walkRouteToken += 1;
    createDraft = { ...createDraft, draw: reduceDrawState(createDraft.draw, { type: "ADD_VERTEX", lat, lng }) };
    refreshEditor();
    paint();
    return;
  }
  const target = createDraft.draw.stopTarget || 4;
  if ((createDraft.draw.stops || []).length >= target) return;
  createDraft = { ...createDraft, osmPick: { loading: true, lat, lng, name: "", description: "", found: false } };
  paint();
  try {
    const place = await lookupOsmPlace(lat, lng);
    if (!createDraft.osmPick?.loading) return;
    createDraft = {
      ...createDraft,
      osmPick: {
        loading: false,
        lat: Number.isFinite(place.lat) ? place.lat : lat,
        lng: Number.isFinite(place.lng) ? place.lng : lng,
        name: place.name || "",
        description: place.description || "",
        found: Boolean(place.found),
      },
    };
  } catch (error) {
    if (!createDraft.osmPick?.loading) return;
    createDraft = {
      ...createDraft,
      osmPick: {
        loading: false,
        lat,
        lng,
        name: "",
        description: "",
        found: false,
        error: error.message || "장소를 찾지 못했습니다.",
      },
    };
  }
  paint();
}

function editorGeometry() {
  const preview = draftPreview(createDraft);
  return { line: preview.routeLine, stops: preview.places.map((p, i) => ({ ...p, id: `stop-${i + 1}`, order: i + 1, title: p.name })) };
}

function syncEditor() {
  const show = editorVisible();
  if (editorHost) editorHost.hidden = !show;
  if (!show) {
    if (editorMounted) {
      editor.unmount();
      editorMounted = false;
    }
    stopGpsWatch();
    return;
  }
  if (!editorMounted) {
    editor.mount(document.querySelector("#route-editor"));
    editorMounted = true;
    editor.setClick((lat, lng) => {
      void onEditorClick(lat, lng);
    });
    editor.setStopDrag((id, lat, lng) => {
      createDraft = { ...createDraft, draw: reduceDrawState(createDraft.draw, { type: "MOVE_STOP", id, lat, lng }) };
      refreshEditor();
      if (createDraft.draw.autoRouted) scheduleWalkRoute();
    });
  }
  refreshEditor();
}

function refreshEditor() {
  if (!editorMounted) return;
  const { line, stops } = editorGeometry();
  editor.setLine(line);
  editor.setStops(stops, createDraft.step === "draw");
  editor.setVertices(createDraft.draw?.vertices || [], createDraft.step === "draw");
  editor.fit(line, stops);
}

function stopGpsWatch() {
  if (recordWatchId != null && navigator.geolocation) {
    navigator.geolocation.clearWatch(recordWatchId);
    recordWatchId = null;
  }
}

async function holdScreenWakeLock() {
  try {
    if (document.hidden || !navigator.wakeLock?.request) return;
    screenWakeLock = await navigator.wakeLock.request("screen");
    screenWakeLock.addEventListener("release", () => {
      screenWakeLock = null;
    });
  } catch {
    screenWakeLock = null;
  }
}

function releaseScreenWakeLock() {
  try {
    screenWakeLock?.release();
  } catch {
    /* already released */
  }
  screenWakeLock = null;
}

function refreshGpsEditor(lat, lng) {
  if (!editorMounted) return;
  editor.setLine(gpsSessionToLine(createDraft.gps));
  if (Number.isFinite(lat) && Number.isFinite(lng)) editor.setPlayer(lat, lng);
  editor.setStops(createDraft.gps.stops, false);
}

async function stitchGpsStreetGaps() {
  if (createDraft.step !== "record" || !createDraft.gps?.recording) return createDraft.gps?.points || [];
  const token = ++gpsFillToken;
  const points = await fillGpsPointsWithStreets(createDraft.gps.points || [], lookupOsmWalkRoute);
  if (token !== gpsFillToken || createDraft.step !== "record") return points;
  createDraft = { ...createDraft, gps: { ...createDraft.gps, points, filling: false } };
  refreshGpsEditor();
  return points;
}

function startGpsWatch() {
  stopGpsWatch();
  const geo = typeof navigator !== "undefined" ? navigator.geolocation : null;
  if (!geo) {
    createError = "이 기기에서 위치를 쓸 수 없습니다.";
    paint();
    return;
  }
  recordWatchId = geo.watchPosition(
    (pos) => {
      const previous = createDraft.gps.points?.at(-1);
      createDraft = {
        ...createDraft,
        gps: reduceGpsSession(createDraft.gps, {
          type: "SAMPLE",
          reading: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy },
        }),
      };
      refreshGpsEditor(pos.coords.latitude, pos.coords.longitude);
      const next = createDraft.gps.points?.at(-1);
      const gap = previous && next ? distanceMeters(previous, next) : 0;
      if (Number.isFinite(gap) && gap >= GPS_STREET_GAP_M) {
        createDraft = { ...createDraft, gps: { ...createDraft.gps, filling: true } };
        void stitchGpsStreetGaps().then(() => paint());
      }
    },
    () => {
      createDraft = { ...createDraft, gps: { ...createDraft.gps, lastRejected: "gps-error" } };
    },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 12000 },
  );
}

function paint() {
  ui.innerHTML = render({
    ...state,
    createDraft,
    createBusy,
    createError,
    partyError,
    partyWait: partyWait || state.partyWait,
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
  syncEditor();
  void hydrateMediaImages(ui);
  if (state.playMode === "coop" && memberToken && state.party?.id) startPartyPoll();
  else stopPartyPoll();
}

function storePartySession(session) {
  try {
    sessionStorage.setItem("gilloe.party", JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

function loadPartySession() {
  try {
    return JSON.parse(sessionStorage.getItem("gilloe.party") || "null");
  } catch {
    return null;
  }
}

function clearPartySession() {
  try {
    sessionStorage.removeItem("gilloe.party");
  } catch {
    /* ignore */
  }
  memberToken = "";
  partyWait = null;
  stopPartyPoll();
}

function stopPartyPoll() {
  if (partyPollId) window.clearInterval(partyPollId);
  partyPollId = 0;
}

function startPartyPoll() {
  if (partyPollId) return;
  const tick = async () => {
    if (!memberToken || !state.party?.id) return;
    try {
      const data = await fetchParty(state.party.id, memberToken, state.party.version || 0);
      if (data.unchanged) return;
      if (data.party) applyParty(data.party);
    } catch (error) {
      partyError = error.message || "연결을 확인하세요.";
      paint();
    }
  };
  partyPollId = window.setInterval(tick, document.hidden ? 8000 : 2000);
  void tick();
}

function applyParty(party, extra = {}) {
  const me = party.members?.find((m) => m.role === party.you?.role);
  const collected = me?.collectedPieceIds || state.collectedPieceIds;
  let screen = extra.screen || state.screen;
  if (party.status === "waiting" || party.status === "ready") screen = state.safetyAccepted ? "party" : state.screen === "safety" ? "safety" : "party";
  if (party.status === "active" && ["party", "safety", "mode"].includes(screen)) screen = "preview";
  if (party.status === "assembling") screen = "assemble";
  if (party.status === "complete") screen = "resolution";
  const placement = { ...state.assemblePlacement, ...(party.board || {}) };
  dispatch({
    type: "PARTY",
    party,
    wait: extra.wait !== undefined ? extra.wait : partyWait,
    screen,
    collectedPieceIds: collected,
    currentStop: party.currentStop,
    placement,
  });
}

async function withParty(path, body) {
  const data = await partyAction(state.party.id, memberToken, path, body);
  if (data.party) applyParty(data.party);
  return data;
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
    if (input.name === "jigsawSource") {
      createDraft = { ...createDraft, jigsawSource: input.value };
      paint();
      return;
    }
    if (input.name === "jigsawFile" && input.files?.[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        createDraft = { ...createDraft, imageDataUrl: reader.result };
      };
      reader.readAsDataURL(input.files[0]);
    }
    if (input.name === "gpxFile" && input.files?.[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const vertices = parseGpxTrack(String(reader.result));
          createDraft = {
            ...createDraft,
            method: "creator-gpx-import",
            step: "draw",
            gpxError: "",
            draw: reduceDrawState(emptyDrawState(), { type: "LOAD", vertices, stops: [] }),
          };
        } catch (error) {
          createDraft = { ...createDraft, gpxError: error.message || "GPX를 읽지 못했습니다." };
        }
        paint();
      };
      reader.readAsText(input.files[0]);
    }
    if (input.name === "ownership") createDraft = { ...createDraft, ownershipConfirmed: input.checked };
    if (input.name === "public-stop") {
      const i = Number(input.dataset.index);
      patchReviewPlace(i, { publicStopConfirmed: input.checked });
    }
    if (input.name === "check-walked") patchCheck("walked", input.checked);
    if (input.name === "check-public") patchCheck("public", input.checked);
    if (input.name === "check-private") patchCheck("noPrivate", input.checked);
    if (input.name === "check-alley") patchCheck("noAlley", input.checked);
    if (input.name === "check-purchase") patchCheck("noPurchase", input.checked);
    if (input.name === "stop-target") {
      createDraft = { ...createDraft, draw: reduceDrawState(createDraft.draw, { type: "SET_STOP_TARGET", stopTarget: Number(input.value) }) };
      refreshEditor();
      paint();
      if (createDraft.draw.autoRouted) scheduleWalkRoute();
    }
  };
  ui.oninput = (event) => {
    const input = event.target;
    if (input.name === "title") createDraft = { ...createDraft, title: input.value };
    if (input.name === "party-code") partyWait = { ...(partyWait || {}), joinMode: true, code: input.value };
    if (input.name === "osm-pick-name" && createDraft.osmPick) {
      createDraft = { ...createDraft, osmPick: { ...createDraft.osmPick, name: input.value } };
    }
    if (input.name === "osm-pick-description" && createDraft.osmPick) {
      createDraft = { ...createDraft, osmPick: { ...createDraft.osmPick, description: input.value } };
    }
    if (input.name === "stop-title") patchDrawStop(input.dataset.id, { title: input.value });
    if (input.name === "stop-directions") patchDrawStop(input.dataset.id, { directions: input.value });
    if (input.name === "review-name") patchReviewPlace(Number(input.dataset.index), { name: input.value });
    if (input.name === "review-blurb") patchReviewPlace(Number(input.dataset.index), { blurb: input.value });
  };
  const arrive = ui.querySelector('[data-action="arrive"]');
  if (arrive && !state.canAutoArrive) arrive.disabled = true;
}

function patchCheck(key, value) {
  createDraft = { ...createDraft, checklist: { ...createDraft.checklist, [key]: value } };
}

function patchDrawStop(id, patch) {
  createDraft = { ...createDraft, draw: reduceDrawState(createDraft.draw, { type: "UPDATE_STOP", id, patch }) };
}

function patchReviewPlace(index, patch) {
  if (createDraft.method === "creator-gps-recording") {
    const stops = (createDraft.gps.stops || []).map((s, i) => (i === index ? { ...s, title: patch.name ?? s.title, directions: patch.blurb ?? s.directions, publicStopConfirmed: patch.publicStopConfirmed ?? s.publicStopConfirmed } : s));
    createDraft = { ...createDraft, gps: { ...createDraft.gps, stops } };
    return;
  }
  const stops = (createDraft.draw.stops || []).map((s, i) =>
    i === index ? { ...s, title: patch.name ?? s.title, directions: patch.blurb ?? s.directions, publicStopConfirmed: patch.publicStopConfirmed ?? s.publicStopConfirmed } : s,
  );
  createDraft = { ...createDraft, draw: { ...createDraft.draw, stops } };
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
    case "choose-solo":
      dispatch({ type: "CHOOSE_SOLO" });
      break;
    case "choose-coop":
      dispatch({ type: "CHOOSE_COOP" });
      break;
    case "party-create":
      try {
        partyError = "";
        const created = await createParty(state.gameId);
        memberToken = created.memberToken;
        partyWait = { inviteCode: created.inviteCode, inPersonCode: created.inPersonCode, invitePath: created.invitePath };
        storePartySession({ partyId: created.party.id, memberToken, gameId: state.gameId, ...partyWait });
        applyParty(created.party, { wait: partyWait, screen: "safety" });
      } catch (error) {
        partyError = error.message || "파티를 만들지 못했습니다.";
        paint();
      }
      break;
    case "party-join-form":
      partyWait = { joinMode: true, code: "" };
      dispatch({ type: "PARTY", party: null, wait: partyWait, screen: "party" });
      break;
    case "party-join":
      try {
        partyError = "";
        const joined = await joinParty(partyWait?.code || "");
        memberToken = joined.memberToken;
        partyWait = {};
        storePartySession({ partyId: joined.party.id, memberToken, gameId: joined.party.gameId });
        if (!state.game || state.gameId !== joined.party.gameId) {
          const game = await getGame(joined.party.gameId);
          dispatch({ type: "SELECT_GAME", game });
        }
        applyParty(joined.party, { wait: {}, screen: "safety" });
      } catch (error) {
        partyError = error.message || "참여하지 못했습니다.";
        paint();
      }
      break;
    case "party-copy":
      try {
        await navigator.clipboard.writeText(partyWait?.inviteCode || "");
      } catch {
        partyError = "코드를 복사하지 못했습니다.";
      }
      paint();
      break;
    case "party-share": {
      const url = `${window.location.origin}/?party=${encodeURIComponent(partyWait?.inviteCode || "")}`;
      try {
        if (navigator.share) await navigator.share({ title: "Gilloe", url });
        else await navigator.clipboard.writeText(url);
      } catch {
        /* cancelled */
      }
      break;
    }
    case "party-near":
      dispatch({ type: "LOCATION_ASKED" });
      try {
        partyError = "";
        await withParty("arrive", {
          stop: state.party?.currentStop || 1,
          near: Boolean(state.canAutoArrive),
          accuracyBand: state.locationStatus === "good" ? "good" : state.locationStatus === "low-accuracy" ? "weak" : "unavailable",
        });
      } catch (error) {
        partyError = error.message || "도착 상태를 보내지 못했습니다.";
        paint();
      }
      break;
    case "party-ready":
      try {
        partyError = "";
        await withParty("ready");
      } catch (error) {
        partyError = error.message || "아직 시작할 수 없습니다.";
        paint();
      }
      break;
    case "party-leave":
      try {
        if (state.party?.id && memberToken) await withParty("leave");
      } catch {
        /* still leave locally */
      }
      clearPartySession();
      dispatch({ type: "RESET" });
      break;
    case "party-solo":
      try {
        await withParty("convert-to-solo");
      } catch (error) {
        partyError = error.message || "혼자 계속할 수 없습니다.";
        paint();
      }
      break;
    case "party-complete-ready":
      try {
        await withParty("complete-ready");
      } catch (error) {
        partyError = error.message || "아직 가운데 조각을 열 수 없습니다.";
        paint();
      }
      break;
    case "create-landing":
      stopGpsWatch();
      createDraft = { ...createDraft, step: "landing" };
      paint();
      break;
    case "create-method-gps":
      createDraft = { ...createDraft, method: "creator-gps-recording", step: "record", gps: emptyGpsSession() };
      paint();
      break;
    case "create-method-osm":
      createDraft = { ...createDraft, method: "openstreetmap-assisted-drawing", step: "draw", draw: emptyDrawState() };
      paint();
      break;
    case "osm-pick-cancel":
      createDraft = { ...createDraft, osmPick: null };
      paint();
      break;
    case "osm-pick-confirm": {
      const pick = createDraft.osmPick;
      if (!pick || pick.loading) break;
      createDraft = {
        ...createDraft,
        osmPick: null,
        draw: reduceDrawState(createDraft.draw, {
          type: "ADD_STOP",
          lat: pick.lat,
          lng: pick.lng,
          title: pick.name,
          directions: pick.description,
        }),
      };
      refreshEditor();
      paint();
      if (createDraft.draw.autoRouted) void applyOsmWalkRoute();
      break;
    }
    case "gps-start":
      createDraft = { ...createDraft, gps: reduceGpsSession(createDraft.gps, { type: "START" }) };
      startGpsWatch();
      void holdScreenWakeLock();
      paint();
      break;
    case "gps-pause":
      createDraft = { ...createDraft, gps: reduceGpsSession(createDraft.gps, { type: "PAUSE" }) };
      releaseScreenWakeLock();
      paint();
      break;
    case "gps-resume":
      createDraft = { ...createDraft, gps: reduceGpsSession(createDraft.gps, { type: "RESUME" }) };
      startGpsWatch();
      void holdScreenWakeLock();
      paint();
      break;
    case "gps-add-stop":
      createDraft = { ...createDraft, gps: reduceGpsSession(createDraft.gps, { type: "ADD_STOP", title: "", publicStopConfirmed: false }) };
      paint();
      break;
    case "gps-cancel":
      stopGpsWatch();
      releaseScreenWakeLock();
      gpsFillToken += 1;
      createDraft = { ...createDraft, gps: emptyGpsSession(), step: "landing" };
      paint();
      break;
    case "gps-finish": {
      stopGpsWatch();
      releaseScreenWakeLock();
      createDraft = { ...createDraft, gps: { ...createDraft.gps, filling: true } };
      paint();
      const token = ++gpsFillToken;
      try {
        const points = await fillGpsPointsWithStreets(createDraft.gps.points || [], lookupOsmWalkRoute);
        if (token !== gpsFillToken) break;
        createDraft = { ...createDraft, gps: { ...createDraft.gps, points, filling: false }, step: "review" };
      } catch {
        if (token !== gpsFillToken) break;
        createDraft = { ...createDraft, gps: { ...createDraft.gps, filling: false }, step: "review" };
      }
      paint();
      break;
    }
    case "draw-mode-stops":
      createDraft = { ...createDraft, draw: reduceDrawState(createDraft.draw, { type: "SET_MODE", mode: "stops" }) };
      paint();
      break;
    case "draw-mode-path":
      createDraft = { ...createDraft, draw: reduceDrawState(createDraft.draw, { type: "SET_MODE", mode: "path" }) };
      paint();
      break;
    case "draw-undo":
      createDraft = { ...createDraft, draw: reduceDrawState(createDraft.draw, { type: "UNDO_VERTEX" }) };
      paint();
      break;
    case "draw-finish":
      createDraft = { ...createDraft, step: "review" };
      paint();
      break;
    case "create-back-method":
      createDraft = {
        ...createDraft,
        step: createDraft.method === "creator-gps-recording" ? "record" : "draw",
      };
      paint();
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
        if (game.quarantined || game.playable === false) {
          dispatch({ type: "GAMES_ERROR", error: "quarantined" });
          break;
        }
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
    case "replay-preview":
      if (previewTour) restartTourTrace(false);
      else startPreviewTour();
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
      if (!state.canAutoArrive) break;
      if (state.playMode === "coop") {
        try {
          await withParty("arrive", { stop: state.currentStop, near: true, accuracyBand: "good" });
        } catch {
          /* still allow local place card if GPS already gated */
        }
      }
      dispatch({ type: "ARRIVE", manual: false });
      break;
    case "manual":
      dispatch({ type: "OPEN_MANUAL" });
      break;
    case "confirm-manual":
      if (state.playMode === "coop") {
        try {
          await withParty("arrive", { stop: state.currentStop, near: false, manualConfirmed: true, accuracyBand: "unavailable" });
        } catch (error) {
          partyError = error.message || "도착을 확인하지 못했습니다.";
          paint();
          break;
        }
      }
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
      const pieceId = state.assembleSelected;
      const placement = placeOnCell(state.assemblePlacement, pieceId, dataset.cell, gridN(state));
      dispatch({ type: "PLACE_PIECE", placement });
      if (state.playMode === "coop" && placement[pieceId]) {
        try {
          await withParty("place", { pieceId, cell: placement[pieceId], correct: true });
        } catch {
          /* keep local snap; poll restores */
        }
      }
      break;
    }
    case "collect-piece":
      flyPieceThen(() => {
        if (state.playMode === "coop") {
          const ids = piecesForStop(state.currentStop, state.party?.you?.role || "A", placeCount(state));
          void (async () => {
            if (!ids.length) await withParty("collect", { stop: state.currentStop, pieceId: "" });
            for (const pieceId of ids) await withParty("collect", { stop: state.currentStop, pieceId });
          })();
          return;
        }
        dispatch({ type: "COLLECT_PIECE" });
      });
      break;
    case "reset":
      location.stop();
      persist.clear();
      clearPartySession();
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
  const preview = draftPreview(createDraft);
  const checks = createDraft.checklist || {};
  const checklistComplete = Boolean(checks.walked && checks.public && checks.noPrivate && checks.noAlley && checks.noPurchase);
  const places = preview.places.map((p) => ({
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    blurb: p.blurb,
    publicStopConfirmed: p.publicStopConfirmed,
    photoUrl: p.photoUrl || "",
    coordinateSource: p.coordinateSource,
    arrivalRadiusMeters: p.arrivalRadiusMeters || 60,
    directions: p.blurb,
  }));
  try {
    const payload = {
      title: createDraft.title,
      placeCount: preview.places.length,
      places,
      routeLine: preview.routeLine,
      checklistComplete,
      warnings: preview.warnings || [],
      sources: preview.sources || [],
      source: {
        method: preview.method,
        proprietaryProviderDerived: false,
        mapDataAttribution: "© OpenStreetMap contributors",
        mapDataLicense: "ODbL-1.0",
        generatedBy: null,
      },
      jigsaw: {
        source: createDraft.jigsawSource === "upload" ? "upload" : "system",
        imageDataUrl: createDraft.imageDataUrl,
        ownershipConfirmed: Boolean(createDraft.ownershipConfirmed),
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
  const invite = new URLSearchParams(window.location.search).get("party");
  const savedParty = loadPartySession();
  if (invite) {
    partyWait = { joinMode: true, code: invite };
    dispatch({ type: "PARTY", party: null, wait: partyWait, screen: "party" });
  } else if (savedParty?.partyId && savedParty.memberToken) {
    memberToken = savedParty.memberToken;
    partyWait = { inviteCode: savedParty.inviteCode, inPersonCode: savedParty.inPersonCode };
    try {
      const data = await fetchParty(savedParty.partyId, memberToken, 0);
      if (data.party) {
        if (!state.game || state.gameId !== data.party.gameId) {
          const game = await getGame(data.party.gameId);
          dispatch({ type: "SELECT_GAME", game });
        }
        applyParty(data.party, { wait: partyWait });
      }
    } catch {
      clearPartySession();
    }
  }
  paint();
  mapHost.hidden = !needsLiveLocation(state.screen) || mapFail || !state.game;
  if (needsLiveLocation(state.screen) && state.locationPermissionAsked) startWatch();
  if (needsLiveLocation(state.screen) && state.game && !mapFail) ensureMap();
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    location.stop();
    return;
  }
  if (needsLiveLocation(state.screen) && state.locationPermissionAsked) startWatch();
  if (createDraft.step === "record" && createDraft.gps?.recording && !createDraft.gps?.paused) {
    startGpsWatch();
    void holdScreenWakeLock();
    void stitchGpsStreetGaps();
  }
});
window.addEventListener("pagehide", () => location.stop());
window.addEventListener("popstate", () => dispatch({ type: "BACK" }));

bootLibrary();
