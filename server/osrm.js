import { needsWalkingLine, straightRouteLine } from "./gameLogic.js";

const OSRM_FOOT = "https://routing.openstreetmap.de/routed-foot/route/v1/foot";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function coordPath(places) {
  return places.map((p) => `${p.lng},${p.lat}`).join(";");
}

async function routeOnce(places, fetchFn, timeoutMs) {
  const url = `${OSRM_FOOT}/${coordPath(places)}?overview=full&geometries=geojson`;
  const res = await fetchFn(url, {
    headers: { "user-agent": UA, accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error("osrm");
  const data = await res.json();
  const line = data?.routes?.[0]?.geometry?.coordinates;
  if (!Array.isArray(line) || line.length < 2) throw new Error("empty");
  return line;
}

export async function fetchOsrmLine(places, { fetchFn = fetch, timeoutMs = 15000 } = {}) {
  if (!Array.isArray(places) || places.length < 2) return straightRouteLine(places || []);
  try {
    return await routeOnce(places, fetchFn, timeoutMs);
  } catch {
    const parts = [];
    for (let i = 0; i < places.length - 1; i += 1) {
      const seg = await routeOnce([places[i], places[i + 1]], fetchFn, timeoutMs);
      if (parts.length) parts.push(...seg.slice(1));
      else parts.push(...seg);
    }
    if (parts.length < 2) throw new Error("osrm");
    return parts;
  }
}

export async function withWalkingLine(game, fetchLine = fetchOsrmLine) {
  if (!game || !needsWalkingLine(game.routeLine, game.placeCount || game.places?.length)) {
    return { game, changed: false };
  }
  try {
    const routeLine = await fetchLine(game.places);
    if (needsWalkingLine(routeLine, game.places.length)) return { game, changed: false };
    return { game: { ...game, routeLine }, changed: true };
  } catch {
    return { game, changed: false };
  }
}
