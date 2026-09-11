export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = "gilloe.mvp01.progress";

const PERSIST_KEYS = [
  "schemaVersion",
  "gameId",
  "playerMode",
  "screen",
  "currentStop",
  "solvedPuzzleIds",
  "collectedCameraClueIds",
  "cameraFallbackIds",
  "hintsUsed",
  "startedAt",
  "duoPhase",
  "safetyAccepted",
  "locationPermissionAsked",
  "discussedStops",
];

export function serializeProgress(state) {
  const out = {};
  for (const key of PERSIST_KEYS) {
    out[key] = structuredClone(state[key]);
  }
  return out;
}

export function validateProgress(raw, { gameId, allowedScreens }) {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "missing" };
  if (raw.schemaVersion !== SCHEMA_VERSION) return { ok: false, reason: "schema" };
  if (raw.gameId !== gameId) return { ok: false, reason: "game" };
  if (!["solo", "duo"].includes(raw.playerMode) && raw.screen !== "cover" && raw.screen !== "mode") {
    if (raw.screen !== "cover" && raw.screen !== "mode") {
      return { ok: false, reason: "mode" };
    }
  }
  if (typeof raw.screen !== "string" || !allowedScreens.includes(raw.screen)) {
    return { ok: false, reason: "screen" };
  }
  if (raw.currentStop != null && ![1, 2, 3, 4].includes(raw.currentStop)) {
    return { ok: false, reason: "stop" };
  }
  if (raw.solvedPuzzleIds && !Array.isArray(raw.solvedPuzzleIds)) {
    return { ok: false, reason: "puzzles" };
  }
  if (raw.collectedCameraClueIds && !Array.isArray(raw.collectedCameraClueIds)) {
    return { ok: false, reason: "camera" };
  }
  if (raw.hintsUsed && typeof raw.hintsUsed !== "object") {
    return { ok: false, reason: "hints" };
  }
  return { ok: true };
}

export function createStorage({
  storage = typeof localStorage === "undefined" ? null : localStorage,
  key = STORAGE_KEY,
} = {}) {
  return {
    load(options) {
      if (!storage) return null;
      try {
        const raw = storage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const check = validateProgress(parsed, options);
        if (!check.ok) return null;
        return parsed;
      } catch {
        return null;
      }
    },
    save(state) {
      if (!storage) return;
      try {
        storage.setItem(key, JSON.stringify(serializeProgress(state)));
      } catch {
        /* quota or private mode — progress recovery is best-effort */
      }
    },
    clear() {
      if (!storage) return;
      try {
        storage.removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
}
