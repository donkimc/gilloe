import { distanceMeters, lineLength } from "./geo.js";

export const SCHEMA_VERSION = 1;
export const MIN_STOP_COUNT = 2;
export const MAX_STOP_COUNT = 8;
export const DEFAULT_STOP_COUNT = 4;
export const MVP_STOP_COUNT = DEFAULT_STOP_COUNT;

export function clampStopCount(value, fallback = DEFAULT_STOP_COUNT) {
  const n = Number(value);
  if (!Number.isInteger(n)) return fallback;
  return Math.min(MAX_STOP_COUNT, Math.max(MIN_STOP_COUNT, n));
}
export const WALK_METERS_PER_MIN = 67;
export const MINUTES_PER_STOP = 2;
export const MAX_AI_JSON_BYTES = 80_000;
export const MAX_TITLE = 80;
export const MAX_NOTE = 200;
export const KR_BOUNDS = { minLat: 33, maxLat: 39.5, minLng: 124, maxLng: 132 };
export const GPS_RULES = {
  maxAccuracyM: 30,
  minDistanceM: 5,
  minIntervalMs: 3000,
  maxSpeedMps: 8,
};

export const METHODS = [
  "creator-gps-recording",
  "openstreetmap-assisted-drawing",
  "ai-assisted-draft",
  "creator-gpx-import",
];

export const FIELD_STATUS = ["draft", "verification-required", "field-verified"];

const RESTRICTED_HINT =
  /naver\.|kakao\.|google\.(com|co)|maps\.apple|apple\.com\/maps|pstatic\.net|phinf|nmap:\/\/|kakaomap:\/\/|comgooglemaps:\/\//i;

export function looksLikeKorea(lat, lng) {
  return lat >= KR_BOUNDS.minLat && lat <= KR_BOUNDS.maxLat && lng >= KR_BOUNDS.minLng && lng <= KR_BOUNDS.maxLng;
}

export function isReversedKorea(lat, lng) {
  return looksLikeKorea(lng, lat) && !looksLikeKorea(lat, lng);
}

export function containsRestrictedSource(value) {
  return RESTRICTED_HINT.test(String(value || ""));
}

export function isAllowedLocalImage(url) {
  const src = String(url || "").trim();
  if (!src) return true;
  return src.startsWith("/uploads/") && !src.includes("..");
}

export function walkingStatsFromLine(routeLine, stopCount = MVP_STOP_COUNT) {
  const meters = Math.round(lineLength(routeLine || []) || 0);
  const durationMinutes = Math.max(1, Math.round(meters / WALK_METERS_PER_MIN + MINUTES_PER_STOP * stopCount));
  return { walkingMeters: meters, durationMinutes };
}

export function formatWalkLabel(stats) {
  const km = stats.walkingMeters >= 1000 ? `${(stats.walkingMeters / 1000).toFixed(1)}km` : `${stats.walkingMeters}m`;
  return `약 ${km} · 약 ${stats.durationMinutes}분`;
}

export function considerGpsSample(previous, reading, now = Date.now(), rules = GPS_RULES) {
  const lat = Number(reading?.lat);
  const lng = Number(reading?.lng);
  const accuracy = Number(reading?.accuracy);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { accept: false, reason: "invalid" };
  }
  if (Number.isFinite(accuracy) && accuracy > rules.maxAccuracyM) {
    return { accept: false, reason: "low-accuracy", accuracy };
  }
  const point = { lat, lng, at: now };
  if (!previous) return { accept: true, reason: "ok", point };
  const dt = Math.max(0, now - (previous.at || 0)) / 1000;
  const dist = distanceMeters(previous, point);
  if (Number.isFinite(dist) && dt > 0 && dist / dt > rules.maxSpeedMps) {
    return { accept: false, reason: "jump", distance: dist };
  }
  const farEnough = Number.isFinite(dist) && dist >= rules.minDistanceM;
  const longEnough = now - (previous.at || 0) >= rules.minIntervalMs;
  if (!farEnough && !longEnough) return { accept: false, reason: "too-close", distance: dist };
  return { accept: true, reason: "ok", point };
}

export function emptyGpsSession() {
  return {
    recording: false,
    paused: false,
    startedAt: null,
    pausedMs: 0,
    pauseStartedAt: null,
    points: [],
    stops: [],
    lastRejected: null,
  };
}

export function reduceGpsSession(session, action) {
  const now = action.at || Date.now();
  switch (action.type) {
    case "START":
      return { ...emptyGpsSession(), recording: true, startedAt: now };
    case "PAUSE":
      if (!session.recording || session.paused) return session;
      return { ...session, paused: true, pauseStartedAt: now };
    case "RESUME":
      if (!session.recording || !session.paused) return session;
      return {
        ...session,
        paused: false,
        pausedMs: session.pausedMs + (now - (session.pauseStartedAt || now)),
        pauseStartedAt: null,
      };
    case "SAMPLE": {
      if (!session.recording || session.paused) return session;
      const result = considerGpsSample(session.points.at(-1), action.reading, now);
      if (!result.accept) return { ...session, lastRejected: result.reason };
      return { ...session, points: [...session.points, result.point], lastRejected: null };
    }
    case "ADD_STOP": {
      const last = session.points.at(-1);
      if (!last || session.stops.length >= MVP_STOP_COUNT) return session;
      const stop = {
        id: `stop-${session.stops.length + 1}`,
        order: session.stops.length + 1,
        lat: last.lat,
        lng: last.lng,
        title: action.title || "",
        directions: action.directions || "",
        safeStandingNote: action.safeStandingNote || "",
        publicStopConfirmed: Boolean(action.publicStopConfirmed),
        photoDataUrl: action.photoDataUrl || null,
        coordinateSource: "creator-gps-recording",
      };
      return { ...session, stops: [...session.stops, stop] };
    }
    case "CANCEL":
      return emptyGpsSession();
    default:
      return session;
  }
}

export function gpsSessionToLine(session) {
  return (session.points || []).map((p) => [p.lng, p.lat]);
}

export function emptyDrawState() {
  return {
    mode: "stops",
    stops: [],
    vertices: [],
    selected: null,
    stopTarget: DEFAULT_STOP_COUNT,
    autoRouted: false,
    routing: false,
    routingError: "",
  };
}

export function routeVerticesFromStops(stops) {
  return (stops || []).map((s) => [s.lng, s.lat]);
}

function withAutoRoute(state) {
  const target = clampStopCount(state.stopTarget);
  if ((state.stops || []).length === target && target >= MIN_STOP_COUNT) {
    return { ...state, stopTarget: target, mode: "path", autoRouted: true, routing: true, routingError: "" };
  }
  return { ...state, stopTarget: target, autoRouted: false, routing: false };
}

export function reduceDrawState(state, action) {
  const next = { ...state, stops: [...state.stops], vertices: [...state.vertices] };
  switch (action.type) {
    case "SET_MODE":
      return { ...next, mode: action.mode };
    case "SET_STOP_TARGET": {
      const stopTarget = clampStopCount(action.stopTarget, next.stopTarget || DEFAULT_STOP_COUNT);
      next.stopTarget = stopTarget;
      if (next.stops.length > stopTarget) {
        next.stops = next.stops.slice(0, stopTarget).map((s, i) => ({ ...s, id: `stop-${i + 1}`, order: i + 1 }));
      }
      return withAutoRoute(next);
    }
    case "ADD_STOP": {
      const target = clampStopCount(next.stopTarget);
      if (next.stops.length >= target) return state;
      const stop = {
        id: `stop-${next.stops.length + 1}`,
        order: next.stops.length + 1,
        lat: action.lat,
        lng: action.lng,
        title: action.title || "",
        directions: action.directions || "",
        safeStandingNote: action.safeStandingNote || "",
        publicStopConfirmed: Boolean(action.publicStopConfirmed),
        photoDataUrl: action.photoDataUrl || null,
        coordinateSource: "openstreetmap-assisted-drawing",
      };
      next.stops.push(stop);
      return withAutoRoute(next);
    }
    case "MOVE_STOP": {
      const stop = next.stops.find((s) => s.id === action.id);
      if (!stop) return state;
      stop.lat = action.lat;
      stop.lng = action.lng;
      if (next.autoRouted) {
        next.routing = true;
        next.routingError = "";
      }
      return next;
    }
    case "SET_WALK_VERTICES": {
      next.vertices = (action.vertices || []).map((v) => [v[0], v[1]]);
      next.routing = false;
      next.routingError = action.error || "";
      if (next.vertices.length >= 2) {
        next.mode = "path";
        next.autoRouted = action.autoRouted !== false;
      }
      return next;
    }
    case "DELETE_STOP": {
      next.stops = next.stops.filter((s) => s.id !== action.id).map((s, i) => ({ ...s, id: `stop-${i + 1}`, order: i + 1 }));
      next.selected = null;
      return withAutoRoute(next);
    }
    case "REORDER_STOPS": {
      const from = next.stops.findIndex((s) => s.id === action.id);
      if (from < 0) return state;
      const [item] = next.stops.splice(from, 1);
      next.stops.splice(Math.max(0, action.to), 0, item);
      next.stops = next.stops.map((s, i) => ({ ...s, id: `stop-${i + 1}`, order: i + 1 }));
      return next;
    }
    case "UPDATE_STOP": {
      const stop = next.stops.find((s) => s.id === action.id);
      if (!stop) return state;
      Object.assign(stop, action.patch || {});
      return next;
    }
    case "ADD_VERTEX":
      next.vertices.push([action.lng, action.lat]);
      next.autoRouted = false;
      return next;
    case "MOVE_VERTEX":
      if (!next.vertices[action.index]) return state;
      next.vertices[action.index] = [action.lng, action.lat];
      return next;
    case "DELETE_VERTEX":
      next.vertices.splice(action.index, 1);
      return next;
    case "UNDO_VERTEX":
      next.vertices.pop();
      return next;
    case "CLEAR":
      return emptyDrawState();
    case "LOAD": {
      const stops = (action.stops || []).map((s, i) => ({ ...s, id: s.id || `stop-${i + 1}`, order: i + 1 }));
      const stopTarget = clampStopCount(action.stopTarget || stops.length || DEFAULT_STOP_COUNT);
      return {
        mode: stops.length >= stopTarget ? "path" : "stops",
        stops,
        vertices: (action.vertices || []).map((v) => [v[0], v[1]]),
        selected: null,
        stopTarget,
        autoRouted: Boolean(action.autoRouted),
        routing: false,
        routingError: "",
      };
    }
    default:
      return state;
  }
}

const SOURCE_KEYS = ["name", "url", "licence", "licenceUrl", "supports"];
const SOURCE_EXTRA_KEYS = ["attribution", "limitations", "notes", "note", "description", "accessedAt", "retrievedAt", "licenceName", "fieldsSupported"];
const ROOT_KEYS = [
  "schemaVersion",
  "status",
  "title",
  "area",
  "requestedDurationMinutes",
  "source",
  "sources",
  "route",
  "stops",
  "warnings",
];
const STOP_KEYS = [
  "id",
  "order",
  "title",
  "coordinates",
  "coordinateSource",
  "fieldVerified",
  "arrivalRadiusMeters",
  "directions",
  "safeStandingNote",
  "sourceIndexes",
];

function unknownKeys(obj, allowed) {
  return Object.keys(obj || {}).filter((k) => !allowed.includes(k));
}

function requireString(value, max) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function normalizeAiSource(src) {
  const next = { ...(src || {}) };
  if (!next.licence && next.licenceName) next.licence = next.licenceName;
  if (!Array.isArray(next.supports) && Array.isArray(next.fieldsSupported)) next.supports = next.fieldsSupported;
  if (!next.notes && next.note) next.notes = next.note;
  if (!requireString(next.name, 180) && next.url) {
    try {
      next.name = new URL(String(next.url).replace(/\\:/g, ":")).hostname || "Open data source";
    } catch {
      next.name = "Open data source";
    }
  }
  if (typeof next.url === "string") next.url = next.url.replace(/\\:/g, ":").replace(/\\\./g, ".");
  if (typeof next.licenceUrl === "string") next.licenceUrl = next.licenceUrl.replace(/\\:/g, ":").replace(/\\\./g, ".");
  return next;
}

export function sanitizeAiJsonText(raw) {
  let text = String(raw || "").trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  text = text.replace(/\\:/g, ":").replace(/\\\./g, ".");
  text = text.replace(/[\u201C\u201D\u201E\u201F]/g, '"').replace(/[\u2018\u2019]/g, "'");
  return text;
}

export function validateAiDraft(raw, { maxBytes = MAX_AI_JSON_BYTES } = {}) {
  const errors = [];
  const warnings = [];
  if (typeof raw !== "string") return { ok: false, errors: ["JSON 텍스트가 필요합니다."], warnings, draft: null };
  const text = sanitizeAiJsonText(raw);
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > maxBytes) return { ok: false, errors: ["입력이 너무 큽니다."], warnings, draft: null };
  if (/<script|javascript:|onerror=/i.test(text)) {
    return { ok: false, errors: ["실행 가능한 내용이 포함되어 있습니다."], warnings, draft: null };
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["올바른 JSON이 아닙니다."], warnings, draft: null };
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, errors: ["JSON 객체가 필요합니다."], warnings, draft: null };
  }
  const extra = unknownKeys(data, ROOT_KEYS);
  if (extra.length) errors.push("지원하지 않는 필드가 있습니다.");
  if (data.schemaVersion !== 1) errors.push("schemaVersion은 1이어야 합니다.");
  if (!["draft", "needs_source_data"].includes(data.status)) errors.push("status가 올바르지 않습니다.");
  if (data.source?.method !== "ai-assisted-draft") errors.push("source.method가 ai-assisted-draft가 아닙니다.");
  if (data.source?.proprietaryProviderDerived !== false) errors.push("proprietaryProviderDerived는 false여야 합니다.");
  if (data.route?.properties?.fieldVerified === true) errors.push("현장 확인된 초안은 가져올 수 없습니다.");
  if (!Array.isArray(data.sources) || (data.status === "draft" && data.sources.length < 1)) {
    errors.push("sources가 필요합니다.");
  }
  data.sources = (data.sources || []).map(normalizeAiSource);
  (data.sources || []).forEach((src, i) => {
    const extraSource = unknownKeys(src, [...SOURCE_KEYS, ...SOURCE_EXTRA_KEYS]);
    if (extraSource.length) errors.push(`sources[${i}]에 알 수 없는 필드가 있습니다.`);
    if (!requireString(src?.name, 180) || !requireString(src?.url, 400) || !requireString(src?.licence, 180) || !requireString(src?.licenceUrl, 400)) {
      errors.push(`sources[${i}] 라이선스 정보가 부족합니다.`);
    }
    if (!Array.isArray(src?.supports) || !src.supports.length) errors.push(`sources[${i}] supports가 필요합니다.`);
    if (containsRestrictedSource(JSON.stringify(src))) errors.push(`sources[${i}]에 제한된 지도 출처가 있습니다.`);
  });
  if (containsRestrictedSource(raw)) errors.push("네이버·카카오·구글·애플 지도 출처는 허용되지 않습니다.");
  if (/https?:\/\/[^\s"]+\.(jpg|jpeg|png|webp|gif)/i.test(raw) || /pstatic|phinf/i.test(raw)) {
    errors.push("원격 이미지는 허용되지 않습니다.");
  }

  const coords = data.route?.geometry?.coordinates;
  const stops = data.stops;
  if (data.status === "needs_source_data") {
    if (Array.isArray(coords) && coords.length) errors.push("자료 부족 초안은 경로 좌표가 비어 있어야 합니다.");
    if (Array.isArray(stops) && stops.length) errors.push("자료 부족 초안은 정류장이 비어 있어야 합니다.");
    const info = [
      "공개 자료만으로는 정류장 4곳과 경로를 확정하지 못했습니다. 좌표를 추측하지 않은 정상적인 결과입니다.",
      "GPS로 걸으며 기록하거나, OpenStreetMap에서 직접 그리세요.",
    ];
    return {
      ok: errors.length === 0,
      errors,
      warnings: [...info, ...warnings, ...(Array.isArray(data.warnings) ? data.warnings : [])],
      draft: data,
      playable: false,
      needsSourceData: true,
    };
  }

  if (data.route?.geometry?.type !== "LineString" || !Array.isArray(coords) || coords.length < 2) {
    errors.push("유효한 GeoJSON LineString이 필요합니다.");
  } else {
    for (const pair of coords) {
      if (!Array.isArray(pair) || pair.length < 2 || !Number.isFinite(pair[0]) || !Number.isFinite(pair[1])) {
        errors.push("경로 좌표가 올바르지 않습니다.");
        break;
      }
      if (isReversedKorea(pair[1], pair[0])) errors.push("경로 좌표의 위경도가 뒤바뀐 것 같습니다.");
      else if (data.area?.countryCode === "KR" && !looksLikeKorea(pair[1], pair[0])) {
        errors.push("경로 좌표가 한국 범위가 아닙니다.");
      }
    }
  }
  if (!Array.isArray(stops) || stops.length !== MVP_STOP_COUNT) errors.push("정류장은 정확히 4곳이어야 합니다.");
  (stops || []).forEach((stop, i) => {
    if (unknownKeys(stop, STOP_KEYS).length) errors.push(`${i + 1}번째 정류장에 알 수 없는 필드가 있습니다.`);
    if (stop.id !== `stop-${i + 1}` || stop.order !== i + 1) errors.push(`${i + 1}번째 정류장 순서가 올바르지 않습니다.`);
    if (stop.fieldVerified === true) errors.push("정류장의 현장 확인 값은 false여야 합니다.");
    const lat = Number(stop.coordinates?.lat);
    const lng = Number(stop.coordinates?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) errors.push(`${i + 1}번째 정류장 좌표가 없습니다.`);
    else if (isReversedKorea(lat, lng)) errors.push(`${i + 1}번째 좌표의 위경도가 뒤바뀐 것 같습니다.`);
    else if (data.area?.countryCode === "KR" && !looksLikeKorea(lat, lng)) errors.push(`${i + 1}번째 좌표가 한국 범위가 아닙니다.`);
    const radius = Number(stop.arrivalRadiusMeters);
    if (!Number.isFinite(radius) || radius < 40 || radius > 100) errors.push(`${i + 1}번째 도착 반경이 올바르지 않습니다.`);
    if (stop.coordinateSource !== "ai-assisted-open-data") errors.push(`${i + 1}번째 coordinateSource가 올바르지 않습니다.`);
    (stop.sourceIndexes || []).forEach((idx) => {
      if (!Number.isInteger(idx) || idx < 0 || idx >= (data.sources || []).length) {
        errors.push(`${i + 1}번째 sourceIndexes가 올바르지 않습니다.`);
      }
    });
    if (typeof stop.title === "string" && /<[^>]+>/.test(stop.title)) errors.push("정류장 제목에 마크업을 넣을 수 없습니다.");
  });

  if (Array.isArray(coords) && coords.length >= 2 && Array.isArray(stops) && stops.length === MVP_STOP_COUNT) {
    const claimed = Number(data.route?.properties?.estimatedDistanceMeters);
    const actual = lineLength(coords);
    if (Number.isFinite(claimed) && claimed > 0 && actual > 0 && Math.abs(claimed - actual) / actual > 0.6) {
      warnings.push("표시된 거리와 경로 길이가 크게 다릅니다.");
    }
    if (actual > 8000) warnings.push("경로가 너무 깁니다.");
    for (let i = 1; i < stops.length; i += 1) {
      const a = stops[i - 1].coordinates;
      const b = stops[i].coordinates;
      const d = distanceMeters({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng });
      if (d != null && d > 2500) warnings.push("정류장 사이 간격이 비정상적으로 큽니다.");
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings: [...warnings, ...(Array.isArray(data.warnings) ? data.warnings : [])],
    draft: data,
    playable: errors.length === 0 && data.status === "draft",
  };
}

export function validateGamePayload(body) {
  const title = String(body?.title || "").trim();
  if (!title) return { ok: false, error: "제목을 입력하세요." };
  if (title.length > MAX_TITLE) return { ok: false, error: "제목이 너무 깁니다." };
  const rawCount = Number(body?.placeCount);
  const placeCount = Number.isInteger(rawCount) ? rawCount : DEFAULT_STOP_COUNT;
  if (placeCount < MIN_STOP_COUNT || placeCount > MAX_STOP_COUNT) {
    return { ok: false, error: `정류장은 ${MIN_STOP_COUNT}~${MAX_STOP_COUNT}곳이어야 합니다.` };
  }
  const method = body?.source?.method;
  if (!METHODS.includes(method)) return { ok: false, error: "경로 작성 방법을 고르세요." };
  if (body?.source?.proprietaryProviderDerived !== false) {
    return { ok: false, error: "제한된 지도 출처는 저장할 수 없습니다." };
  }
  const places = Array.isArray(body?.places) ? body.places : [];
  if (places.length !== placeCount) return { ok: false, error: `정류장 ${placeCount}곳이 필요합니다.` };
  const routeLine = Array.isArray(body?.routeLine) ? body.routeLine : [];
  if (routeLine.length < 2) return { ok: false, error: "경로 선이 필요합니다." };
  for (const pair of routeLine) {
    if (!Array.isArray(pair) || !Number.isFinite(pair[0]) || !Number.isFinite(pair[1])) {
      return { ok: false, error: "경로 좌표가 올바르지 않습니다." };
    }
    if (containsRestrictedSource(JSON.stringify(pair))) return { ok: false, error: "제한된 출처가 있습니다." };
    if (!looksLikeKorea(pair[1], pair[0])) return { ok: false, error: "경로 좌표가 한국 범위가 아닙니다." };
  }
  for (let i = 0; i < places.length; i += 1) {
    const p = places[i];
    if (!Number.isFinite(p?.lat) || !Number.isFinite(p?.lng)) {
      return { ok: false, error: `${i + 1}번째 정류장의 위치를 확인하세요.` };
    }
    if (isReversedKorea(p.lat, p.lng)) return { ok: false, error: `${i + 1}번째 좌표의 위경도가 뒤바뀐 것 같습니다.` };
    if (!looksLikeKorea(p.lat, p.lng)) return { ok: false, error: `${i + 1}번째 좌표가 한국 범위가 아닙니다.` };
    if (containsRestrictedSource(JSON.stringify(p))) return { ok: false, error: "제한된 지도 출처는 저장할 수 없습니다." };
    if (p.photoUrl && !isAllowedLocalImage(p.photoUrl) && !String(p.photoUrl).startsWith("data:image/")) {
      return { ok: false, error: "사진은 직접 올린 파일만 사용할 수 있습니다." };
    }
    if (!p.publicStopConfirmed) return { ok: false, error: `${i + 1}번째 정류장이 공개 보행 공간인지 확인하세요.` };
  }
  const jigsaw = body?.jigsaw || {};
  if (!["upload", "system"].includes(jigsaw.source)) return { ok: false, error: "퍼즐 그림을 고르세요." };
  if (jigsaw.source === "upload" && !jigsaw.ownershipConfirmed) {
    return { ok: false, error: "사진 사용 권한을 확인하세요." };
  }
  if (body?.fieldVerified === true && method !== "creator-gps-recording") {
    return { ok: false, error: "현장 확인은 서버가 기록합니다." };
  }
  if (Array.isArray(body?.sources) && body.sources.some((s) => containsRestrictedSource(JSON.stringify(s)))) {
    return { ok: false, error: "제한된 지도 출처는 저장할 수 없습니다." };
  }
  return { ok: true, title, placeCount, places, jigsaw, method, routeLine, body };
}

export function gameHasRestrictedSource(game) {
  const blob = JSON.stringify(game || {});
  return containsRestrictedSource(blob) || /\bnaverUrl\b/.test(blob);
}

export function migrateGameRecord(game) {
  if (!game || typeof game !== "object") return game;
  const restricted = gameHasRestrictedSource(game);
  const places = (game.places || []).map((p, i) => {
    const next = { ...p };
    delete next.naverUrl;
    if (next.photoUrl && !isAllowedLocalImage(next.photoUrl)) {
      next.photoUrl = "";
      next.photoStripped = true;
    }
    next.order = i + 1;
    next.coordinateSource = next.coordinateSource || game.source?.method || "unknown";
    next.fieldVerified = false;
    return next;
  });
  const jigsaw = { ...(game.jigsaw || {}) };
  if (jigsaw.imageUrl && !isAllowedLocalImage(jigsaw.imageUrl)) {
    jigsaw.imageUrl = "";
    jigsaw.source = "system";
    jigsaw.systemImageId = jigsaw.systemImageId || "station";
  }
  if (jigsaw.source === "final-place") {
    jigsaw.source = jigsaw.imageUrl ? "upload" : "system";
  }
  const fieldStatus = restricted
    ? "draft"
    : game.fieldStatus || (game.fieldVerified ? "field-verified" : "verification-required");
  return {
    ...game,
    schemaVersion: SCHEMA_VERSION,
    places,
    jigsaw,
    source: {
      method: game.source?.method && METHODS.includes(game.source.method) ? game.source.method : "openstreetmap-assisted-drawing",
      proprietaryProviderDerived: false,
      mapDataAttribution: game.source?.mapDataAttribution || "© OpenStreetMap contributors",
      mapDataLicense: game.source?.mapDataLicense || "ODbL-1.0",
    },
    fieldVerified: fieldStatus === "field-verified",
    fieldStatus: restricted ? "draft" : fieldStatus,
    quarantined: Boolean(restricted || game.quarantined),
    quarantineReason: restricted ? "restricted-source-migration-required" : game.quarantineReason || null,
    puzzleCount: 9,
    playable: !restricted && game.playable !== false,
    warnings: game.warnings || ["현장 검증 전 임시 경로"],
  };
}

export function isPlayableGame(game) {
  const count = (game.places || []).length;
  return Boolean(
    game &&
      game.playable !== false &&
      !game.quarantined &&
      count === (game.placeCount || count) &&
      count >= MIN_STOP_COUNT &&
      count <= MAX_STOP_COUNT,
  );
}

export function publicationBlockedReason(game) {
  if (game?.quarantined) return "제한된 출처 데이터가 있어 공개할 수 없습니다.";
  if (game?.fieldStatus !== "field-verified") return "현장 확인이 끝나기 전에는 외부 테스트·공개를 할 수 없습니다.";
  return null;
}

export function parseGpxTrack(xmlText) {
  const text = String(xmlText || "");
  if (text.length > 2_000_000) throw new Error("파일이 너무 큽니다.");
  if (!/<gpx[\s>]/i.test(text)) throw new Error("GPX 파일이 아닙니다.");
  const points = [];
  const re = /<trkpt[^>]*lat=["'](-?\d+(?:\.\d+)?)["'][^>]*lon=["'](-?\d+(?:\.\d+)?)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(text))) {
    points.push([Number(m[2]), Number(m[1])]);
  }
  if (points.length < 2) {
    const re2 = /<trkpt[^>]*lon=["'](-?\d+(?:\.\d+)?)["'][^>]*lat=["'](-?\d+(?:\.\d+)?)["'][^>]*>/gi;
    while ((m = re2.exec(text))) points.push([Number(m[1]), Number(m[2])]);
  }
  if (points.length < 2) throw new Error("경로 점을 찾지 못했습니다.");
  return points;
}

export function placesMoved(prev, next) {
  if (!Array.isArray(prev) || !Array.isArray(next) || prev.length !== next.length) return true;
  return prev.some(
    (p, i) => Math.abs(Number(p.lat) - Number(next[i].lat)) > 1e-6 || Math.abs(Number(p.lng) - Number(next[i].lng)) > 1e-6,
  );
}
