export const SCHEMA_VERSION = 3;
export const STORAGE_KEY = "gilloe.progress";

const PERSIST_KEYS = [
  "schemaVersion",
  "gameId",
  "screen",
  "currentStop",
  "collectedPieceIds",
  "hintsUsed",
  "startedAt",
  "safetyAccepted",
  "locationPermissionAsked",
];

export function serializeProgress(state) {
  const out = {};
  for (const key of PERSIST_KEYS) out[key] = structuredClone(state[key]);
  return out;
}

export function validateProgress(raw, { gameId, allowedScreens }) {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "missing" };
  if (raw.schemaVersion !== SCHEMA_VERSION) return { ok: false, reason: "schema" };
  if (gameId && raw.gameId !== gameId) return { ok: false, reason: "game" };
  if (typeof raw.screen !== "string" || !allowedScreens.includes(raw.screen)) {
    return { ok: false, reason: "screen" };
  }
  if (raw.currentStop != null && (!Number.isInteger(raw.currentStop) || raw.currentStop < 1)) {
    return { ok: false, reason: "stop" };
  }
  if (raw.collectedPieceIds && !Array.isArray(raw.collectedPieceIds)) {
    return { ok: false, reason: "pieces" };
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
        /* ignore */
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
