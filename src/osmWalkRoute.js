import { distanceMeters } from "./geo.js";
import { fetchOsmMap } from "./osmPlace.js";

const PAD_DEG = 0.0018;
const CELL_DEG = 0.0036;
const MAX_TILES = 16;
const SNAP_M = 160;
const SIMPLIFY_M = 4;
const FOOT_HIGHWAYS = new Set([
  "footway",
  "path",
  "pedestrian",
  "steps",
  "corridor",
  "living_street",
  "residential",
  "unclassified",
  "service",
  "track",
  "tertiary",
  "secondary",
  "primary",
  "tertiary_link",
  "secondary_link",
  "primary_link",
  "cycleway",
  "bridleway",
  "road",
  "crossing",
]);
const BLOCKED_HIGHWAYS = new Set(["motorway", "motorway_link", "trunk", "trunk_link", "raceway", "bus_guideway"]);

export function isWalkableWay(tags) {
  if (!tags?.highway) return false;
  if (tags.area === "yes") return false;
  const foot = String(tags.foot || "");
  const access = String(tags.access || "");
  if (foot === "no") return false;
  if ((access === "no" || access === "private" || access === "customers") && foot !== "yes" && foot !== "designated") {
    return false;
  }
  if (BLOCKED_HIGHWAYS.has(tags.highway)) {
    return foot === "yes" || foot === "designated";
  }
  if (FOOT_HIGHWAYS.has(tags.highway)) return true;
  return foot === "yes" || foot === "designated";
}

function nodeCoords(elements) {
  const nodes = new Map();
  for (const el of elements || []) {
    if (el.type === "node" && Number.isFinite(el.lat) && Number.isFinite(el.lon)) {
      nodes.set(el.id, { lat: el.lat, lng: el.lon });
    }
  }
  return nodes;
}

function addEdge(adj, a, b, w) {
  if (!adj.has(a)) adj.set(a, []);
  if (!adj.has(b)) adj.set(b, []);
  adj.get(a).push({ to: b, w });
  adj.get(b).push({ to: a, w });
}

export function buildWalkGraph(elements) {
  const nodes = nodeCoords(elements);
  const adj = new Map();
  for (const el of elements || []) {
    if (el.type !== "way" || !isWalkableWay(el.tags || {})) continue;
    const ids = el.nodes || [];
    for (let i = 1; i < ids.length; i += 1) {
      const a = ids[i - 1];
      const b = ids[i];
      if (!nodes.has(a) || !nodes.has(b)) continue;
      const w = distanceMeters(nodes.get(a), nodes.get(b));
      if (!Number.isFinite(w) || w <= 0) continue;
      addEdge(adj, a, b, w);
    }
  }
  return { nodes, adj };
}

function nearestNode(graph, point, maxM = SNAP_M) {
  let best = null;
  for (const [id, coord] of graph.nodes) {
    if (!graph.adj.has(id) || !graph.adj.get(id).length) continue;
    const d = distanceMeters(point, coord);
    if (!Number.isFinite(d) || d > maxM) continue;
    if (!best || d < best.d) best = { id, d, ...coord };
  }
  return best;
}

function dijkstra(graph, start, goal) {
  const dist = new Map([[start, 0]]);
  const prev = new Map();
  const heap = [[0, start]];
  const push = (item) => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (!heap.length) return top;
    heap[0] = last;
    let i = 0;
    while (true) {
      let s = i;
      const l = i * 2 + 1;
      const r = l + 1;
      if (l < heap.length && heap[l][0] < heap[s][0]) s = l;
      if (r < heap.length && heap[r][0] < heap[s][0]) s = r;
      if (s === i) break;
      [heap[i], heap[s]] = [heap[s], heap[i]];
      i = s;
    }
    return top;
  };
  while (heap.length) {
    const [d, u] = pop();
    if (d !== dist.get(u)) continue;
    if (u === goal) break;
    for (const { to, w } of graph.adj.get(u) || []) {
      const nd = d + w;
      if (nd < (dist.get(to) ?? Infinity)) {
        dist.set(to, nd);
        prev.set(to, u);
        push([nd, to]);
      }
    }
  }
  if (!dist.has(goal)) return null;
  const ids = [];
  for (let cur = goal; cur != null; cur = prev.get(cur)) {
    ids.push(cur);
    if (cur === start) break;
  }
  ids.reverse();
  if (ids[0] !== start) return null;
  return ids.map((id) => {
    const n = graph.nodes.get(id);
    return [n.lng, n.lat];
  });
}

function pointToSegmentDistance(point, a, b) {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  const len2 = dx * dx + dy * dy;
  let t = 0;
  if (len2 > 0) {
    t = ((point.lng - a.lng) * dx + (point.lat - a.lat) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
  }
  return distanceMeters(point, { lat: a.lat + t * dy, lng: a.lng + t * dx });
}

export function simplifyLine(coords, epsilonM = SIMPLIFY_M) {
  if (!coords || coords.length <= 2) return coords || [];
  const keep = new Array(coords.length).fill(false);
  keep[0] = true;
  keep[coords.length - 1] = true;
  const stack = [[0, coords.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop();
    let maxD = -1;
    let idx = -1;
    const a = { lng: coords[start][0], lat: coords[start][1] };
    const b = { lng: coords[end][0], lat: coords[end][1] };
    for (let i = start + 1; i < end; i += 1) {
      const d = pointToSegmentDistance({ lng: coords[i][0], lat: coords[i][1] }, a, b);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx >= 0 && maxD > epsilonM) {
      keep[idx] = true;
      stack.push([start, idx], [idx, end]);
    }
  }
  return coords.filter((_, i) => keep[i]);
}

function appendLeg(vertices, leg) {
  if (!leg?.length) return;
  if (!vertices.length) {
    vertices.push(...leg);
    return;
  }
  const last = vertices[vertices.length - 1];
  const start = leg[0];
  const skipFirst = last[0] === start[0] && last[1] === start[1];
  vertices.push(...leg.slice(skipFirst ? 1 : 0));
}

function straightLeg(a, b) {
  return [
    [a.lng, a.lat],
    [b.lng, b.lat],
  ];
}

export function walkVerticesForStops(elements, stops) {
  const graph = buildWalkGraph(elements);
  const vertices = [];
  let usedStreets = false;
  for (let i = 1; i < stops.length; i += 1) {
    const from = stops[i - 1];
    const to = stops[i];
    const a = nearestNode(graph, from);
    const b = nearestNode(graph, to);
    const street = a && b ? dijkstra(graph, a.id, b.id) : null;
    if (street?.length >= 2) {
      usedStreets = true;
      const leg = [];
      if (distanceMeters(from, a) > 4) leg.push([from.lng, from.lat]);
      leg.push(...street);
      if (distanceMeters(to, b) > 4) leg.push([to.lng, to.lat]);
      appendLeg(vertices, simplifyLine(leg));
    } else {
      appendLeg(vertices, straightLeg(from, to));
    }
  }
  return { vertices: simplifyLine(vertices), usedStreets };
}

function coverBboxes(stops) {
  const lats = stops.map((s) => s.lat);
  const lngs = stops.map((s) => s.lng);
  const minLat = Math.min(...lats) - PAD_DEG;
  const maxLat = Math.max(...lats) + PAD_DEG;
  const minLng = Math.min(...lngs) - PAD_DEG;
  const maxLng = Math.max(...lngs) + PAD_DEG;
  const boxes = [];
  for (let lat = minLat; lat < maxLat - 1e-9; lat += CELL_DEG) {
    for (let lng = minLng; lng < maxLng - 1e-9; lng += CELL_DEG) {
      boxes.push([lng, lat, Math.min(lng + CELL_DEG, maxLng), Math.min(lat + CELL_DEG, maxLat)]);
    }
  }
  if (boxes.length > MAX_TILES) {
    return [[minLng, minLat, maxLng, maxLat]];
  }
  return boxes.length ? boxes : [[minLng, minLat, maxLng, maxLat]];
}

function mergeElements(batches) {
  const seen = new Set();
  const elements = [];
  for (const batch of batches) {
    for (const el of batch.elements || []) {
      const key = `${el.type}:${el.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      elements.push(el);
    }
  }
  return elements;
}

export async function lookupOsmWalkRoute(stopsInput) {
  const stops = (stopsInput || [])
    .map((s) => ({ lat: Number(s.lat), lng: Number(s.lng) }))
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
  if (stops.length < 2) throw new Error("정류장이 부족합니다.");
  const boxes = coverBboxes(stops);
  const batches = [];
  for (const [west, south, east, north] of boxes) {
    batches.push(await fetchOsmMap(`${west},${south},${east},${north}`));
  }
  const { vertices, usedStreets } = walkVerticesForStops(mergeElements(batches), stops);
  if (!vertices || vertices.length < 2) throw new Error("보행 경로를 만들지 못했습니다.");
  return { vertices, usedStreets };
}

export const GPS_STREET_GAP_M = 45;

export async function fillGpsPointsWithStreets(points, routeLookup = lookupOsmWalkRoute) {
  const list = Array.isArray(points) ? points : [];
  if (list.length < 2) return list;
  const out = [list[0]];
  for (let i = 1; i < list.length; i += 1) {
    const prev = list[i - 1];
    const cur = list[i];
    const gap = distanceMeters(prev, cur);
    if (!prev.filled && !cur.filled && Number.isFinite(gap) && gap >= GPS_STREET_GAP_M) {
      try {
        const result = await routeLookup([prev, cur]);
        const vertices = result?.vertices || [];
        if (result?.usedStreets && vertices.length >= 3) {
          const mid = vertices.slice(1, -1).map(([lng, lat]) => ({
            lat,
            lng,
            at: prev.at,
            filled: true,
          }));
          out.push(...mid);
        }
      } catch {
        /* keep the GPS endpoints if streets cannot be read */
      }
    }
    out.push(cur);
  }
  return out;
}
