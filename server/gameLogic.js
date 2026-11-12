import { distanceMeters } from "../src/geo.js";
import {
  formatWalkLabel,
  migrateGameRecord,
  placesMoved,
  validateGamePayload,
  walkingStatsFromLine,
} from "../src/routeSchema.js";

export { formatWalkLabel, migrateGameRecord, placesMoved, validateGamePayload, walkingStatsFromLine };
export { walkingStatsFromLine as walkingStatsLine };

export const ALLOWED_COUNTS = [4];
export const WALK_METERS_PER_MIN = 67;
export const MINUTES_PER_STOP = 2;

export function gridSizeForCount(placeCount) {
  const n = Math.sqrt(placeCount);
  return Number.isInteger(n) ? n : null;
}

export function walkingStats(places) {
  let meters = 0;
  for (let i = 1; i < places.length; i += 1) {
    const a = places[i - 1];
    const b = places[i];
    const d = distanceMeters({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng });
    if (Number.isFinite(d)) meters += d;
  }
  const durationMinutes = Math.max(1, Math.round(meters / WALK_METERS_PER_MIN + MINUTES_PER_STOP * places.length));
  return { walkingMeters: Math.round(meters), durationMinutes };
}

export function straightRouteLine(places) {
  return places.map((p) => [p.lng, p.lat]);
}

export function mergeSeedGames(existing, seed) {
  const list = Array.isArray(existing) ? existing : [];
  const have = new Set(list.map((game) => game?.id).filter(Boolean));
  const missing = [];
  for (const game of seed || []) {
    if (!game || typeof game !== "object" || !game.id || have.has(game.id)) continue;
    missing.push(game);
    have.add(game.id);
  }
  return missing.length ? [...missing, ...list] : list;
}
