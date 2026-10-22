import { distanceMeters } from "./geo.js";

export const OSM_UA = "Gilloe/0.1 (https://gilloe.com)";
const MAX_SNAP_M = 80;

export async function fetchOsmMap(bbox) {
  const res = await fetch(`https://api.openstreetmap.org/api/0.6/map.json?bbox=${bbox}`, {
    headers: { "User-Agent": OSM_UA, Accept: "application/json" },
  });
  if (!res.ok) throw new Error("OpenStreetMap을 읽지 못했습니다.");
  return res.json();
}

function featureName(tags) {
  return String(tags?.name || tags?.["name:ko"] || tags?.["name:en"] || "").trim();
}

function featureDescription(tags) {
  return String(tags?.description || tags?.["description:ko"] || tags?.note || tags?.inscription || "").trim();
}

function nodeMap(elements) {
  const map = new Map();
  for (const el of elements || []) {
    if (el.type === "node" && Number.isFinite(el.lat) && Number.isFinite(el.lon)) {
      map.set(el.id, { lat: el.lat, lng: el.lon });
    }
  }
  return map;
}

function wayCenter(way, nodes) {
  const pts = (way.nodes || []).map((id) => nodes.get(id)).filter(Boolean);
  if (!pts.length) return null;
  return {
    lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length,
    lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length,
  };
}

export function pickNearestNamed(elements, lat, lng) {
  const origin = { lat, lng };
  const nodes = nodeMap(elements);
  const candidates = [];
  for (const el of elements || []) {
    const tags = el.tags || {};
    const name = featureName(tags);
    if (!name) continue;
    let point = null;
    if (el.type === "node" && Number.isFinite(el.lat) && Number.isFinite(el.lon)) {
      point = { lat: el.lat, lng: el.lon };
    } else if (el.type === "way") {
      point = wayCenter(el, nodes);
    }
    if (!point) continue;
    const dist = distanceMeters(origin, point);
    if (dist == null || dist > MAX_SNAP_M) continue;
    candidates.push({
      name,
      description: featureDescription(tags),
      lat: point.lat,
      lng: point.lng,
      osmType: el.type,
      osmId: el.id,
      distanceMeters: Math.round(dist),
    });
  }
  candidates.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return candidates[0] || null;
}

export async function lookupOsmPlace(lat, lng) {
  const click = { lat: Number(lat), lng: Number(lng) };
  if (!Number.isFinite(click.lat) || !Number.isFinite(click.lng)) {
    throw new Error("좌표가 올바르지 않습니다.");
  }
  const pads = [0.0006, 0.0012];
  let nearest = null;
  for (const pad of pads) {
    const bbox = `${click.lng - pad},${click.lat - pad},${click.lng + pad},${click.lat + pad}`;
    const data = await fetchOsmMap(bbox);
    nearest = pickNearestNamed(data.elements || [], click.lat, click.lng);
    if (nearest) break;
  }
  if (!nearest) {
    return {
      name: "",
      description: "",
      lat: click.lat,
      lng: click.lng,
      found: false,
    };
  }
  return { ...nearest, found: true };
}
