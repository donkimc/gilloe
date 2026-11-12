import { distanceMeters } from "./geo.js";

export const LIBRARY_PAGE_SIZE = 4;

const SORTS = new Set(["date-desc", "date-asc", "distance", "time", "near"]);

export function normalizeLibrarySort(sort) {
  return SORTS.has(sort) ? sort : "date-desc";
}

function text(value) {
  return String(value || "").toLocaleLowerCase("ko");
}

export function filterLibraryGames(games, query) {
  const q = text(query).trim();
  const list = Array.isArray(games) ? games : [];
  if (!q) return list.slice();
  return list.filter((game) => text(`${game.title || ""} ${game.keywords || ""}`).includes(q));
}

function metric(value, missing) {
  if (value == null || value === "") return missing;
  const n = Number(value);
  return Number.isFinite(n) ? n : missing;
}

function awayMeters(game, origin) {
  if (!origin) return null;
  return distanceMeters(origin, { lat: Number(game?.startLat), lng: Number(game?.startLng) });
}

export function sortLibraryGames(games, sort, origin) {
  const mode = normalizeLibrarySort(sort);
  return games
    .map((game, index) => ({ game, index }))
    .sort((a, b) => {
      let diff = 0;
      if (mode === "date-asc") diff = metric(a.game.createdAt, Infinity) - metric(b.game.createdAt, Infinity);
      else if (mode === "distance") diff = metric(a.game.walkingMeters, Infinity) - metric(b.game.walkingMeters, Infinity);
      else if (mode === "time") diff = metric(a.game.durationMinutes, Infinity) - metric(b.game.durationMinutes, Infinity);
      else if (mode === "near") diff = metric(awayMeters(a.game, origin), Infinity) - metric(awayMeters(b.game, origin), Infinity);
      else diff = metric(b.game.createdAt, -Infinity) - metric(a.game.createdAt, -Infinity);
      return diff || a.index - b.index;
    })
    .map((item) => item.game);
}

export function pageLibraryGames(games, page, size = LIBRARY_PAGE_SIZE) {
  const total = games.length;
  const pages = Math.max(1, Math.ceil(total / size) || 1);
  const current = Math.min(pages, Math.max(1, Number(page) || 1));
  const start = (current - 1) * size;
  return {
    items: games.slice(start, start + size),
    total,
    page: current,
    pages,
    from: total ? start + 1 : 0,
    to: Math.min(start + size, total),
  };
}

export function librarySelection(games, { query = "", sort = "date-desc", page = 1, origin = null } = {}) {
  return pageLibraryGames(sortLibraryGames(filterLibraryGames(games, query), sort, origin), page);
}
