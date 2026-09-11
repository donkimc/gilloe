import { distanceMeters } from "../src/geo.js";

export const ALLOWED_COUNTS = [4, 9, 16, 25];
export const WALK_METERS_PER_MIN = 67;
export const MINUTES_PER_STOP = 2;

export function gridSizeForCount(placeCount) {
  const n = Math.sqrt(placeCount);
  return Number.isInteger(n) ? n : null;
}

/** Place id from map.naver.com / naver.me redirect targets. */
export function extractNaverPlaceId(raw) {
  if (!raw || typeof raw !== "string") return null;
  const m = raw.match(
    /\/(?:p\/entry\/)?(?:place|restaurant|hospital|hairshop|attraction|accommodation)\/(\d{5,})/i,
  );
  return m ? m[1] : null;
}

export function placePageUrl(placeId) {
  return `https://pcmap.place.naver.com/place/${placeId}/home`;
}

/** Prefer the listing file (ldb-phinf); skip generic map OG and blog review shots. */
export function listingPhotoUrl(raw) {
  if (!raw) return "";
  let value = decodeHtml(raw);
  try {
    const url = new URL(value);
    const nested = url.searchParams.get("src");
    if (nested && /pstatic\.net|phinf/.test(nested)) value = nested;
  } catch {
    /* keep value */
  }
  if (/og-map-400x200|blog\.naver|post\.naver|cafe\.naver|review/i.test(value)) return "";
  return value;
}

function cleanPlaceName(name) {
  return String(name || "")
    .replace(/\u001c/g, "")
    .replace(/\s*:\s*네이버\s*$/u, "")
    .trim()
    .slice(0, 80);
}

function sliceJsonObject(source, braceIndex) {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = braceIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(braceIndex, i + 1);
    }
  }
  return "";
}

/** Name, address, coords, listing photo from a Naver Place HTML page. */
export function parsePlaceDetailHtml(html) {
  const empty = { name: "", address: "", blurb: "", photoUrl: "", lat: null, lng: null };
  if (!html) return empty;
  const meta = decodeMeta(html);
  let name = cleanPlaceName(meta.title);
  let address = "";
  let lat = null;
  let lng = null;

  const marker = html.match(/"PlaceDetailBase:\d+"\s*:\s*\{/);
  if (marker) {
    const blob = sliceJsonObject(html, marker.index + marker[0].length - 1);
    try {
      const obj = JSON.parse(blob);
      name = cleanPlaceName(obj.name || name);
      address = String(obj.roadAddress || obj.address || "").slice(0, 120);
      const x = Number(obj.coordinate?.x);
      const y = Number(obj.coordinate?.y);
      if (looksLikeKorea(y, x)) {
        lat = y;
        lng = x;
      }
    } catch {
      /* fall through */
    }
  }

  if (lat == null) {
    const xy = html.match(/"x"\s*:\s*"?(12[4-9]\.\d+)"?[\s\S]{0,80}"y"\s*:\s*"?(3[3-9]\.\d+)"?/);
    if (xy && looksLikeKorea(Number(xy[2]), Number(xy[1]))) {
      lng = Number(xy[1]);
      lat = Number(xy[2]);
    }
  }

  return {
    name,
    address,
    blurb: String(meta.description || "").slice(0, 160),
    photoUrl: listingPhotoUrl(meta.image),
    lat,
    lng,
  };
}

/** Parse lat/lng from common Naver Map / share URLs. Does not invent coordinates. */
export function parseCoordsFromNaverUrl(raw) {
  if (!raw || typeof raw !== "string") return null;
  let url;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");
  if (!host.includes("naver.")) return null;

  const latQ = url.searchParams.get("lat") || url.searchParams.get("latitude");
  const lngQ = url.searchParams.get("lng") || url.searchParams.get("longitude");
  if (finiteCoord(latQ) && finiteCoord(lngQ)) {
    return { lat: Number(latQ), lng: Number(lngQ) };
  }

  const c = url.searchParams.get("c");
  if (c) {
    const parts = c.split(",").map((p) => Number(p));
    // zoom, lng, lat, ...
    if (parts.length >= 3 && Number.isFinite(parts[1]) && Number.isFinite(parts[2])) {
      const lng = parts[1];
      const lat = parts[2];
      if (looksLikeKorea(lat, lng)) return { lat, lng };
      if (looksLikeKorea(lng, lat)) return { lat: lng, lng: lat };
    }
  }

  const pin = url.pathname.match(/\/(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (pin) {
    const a = Number(pin[1]);
    const b = Number(pin[2]);
    if (looksLikeKorea(a, b)) return { lat: a, lng: b };
    if (looksLikeKorea(b, a)) return { lat: b, lng: a };
  }

  return null;
}

function finiteCoord(v) {
  return v != null && v !== "" && Number.isFinite(Number(v));
}

function looksLikeKorea(lat, lng) {
  return lat >= 33 && lat <= 39.5 && lng >= 124 && lng <= 132;
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

/** True when the stored line is missing or only pin-to-pin segments. */
export function needsWalkingLine(routeLine, placeCount) {
  const n = Number(placeCount) || 0;
  return !Array.isArray(routeLine) || routeLine.length <= Math.max(n, 1);
}

export function decodeMeta(html) {
  const pick = (prop) => {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i");
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i");
    return (html.match(re) || html.match(re2) || [])[1] || "";
  };
  const title = decodeHtml(pick("og:title") || pick("twitter:title") || (html.match(/<title>([^<]+)<\/title>/i) || [])[1] || "");
  const image = decodeHtml(pick("og:image") || pick("twitter:image"));
  const description = decodeHtml(pick("og:description") || pick("description"));
  return { title: title.slice(0, 80), image, description: description.slice(0, 160) };
}

function decodeHtml(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export function validateGamePayload(body) {
  const title = String(body?.title || "").trim();
  const placeCount = Number(body?.placeCount);
  if (!title) return { ok: false, error: "제목을 입력하세요." };
  if (!ALLOWED_COUNTS.includes(placeCount)) return { ok: false, error: "장소 수는 4, 9, 16, 25만 가능합니다." };
  const places = Array.isArray(body?.places) ? body.places : [];
  if (places.length !== placeCount) return { ok: false, error: `장소 ${placeCount}곳이 필요합니다.` };
  for (let i = 0; i < places.length; i += 1) {
    const p = places[i];
    if (!Number.isFinite(p?.lat) || !Number.isFinite(p?.lng)) {
      return { ok: false, error: `${i + 1}번째 장소의 위치를 확인하세요.` };
    }
    if (!looksLikeKorea(p.lat, p.lng)) {
      return { ok: false, error: `${i + 1}번째 좌표가 한국 범위가 아닙니다.` };
    }
  }
  const jigsaw = body?.jigsaw || {};
  if (!["final-place", "upload", "system"].includes(jigsaw.source)) {
    return { ok: false, error: "퍼즐 그림을 고르세요." };
  }
  return { ok: true, title, placeCount, places, jigsaw };
}

export function formatWalkLabel(stats) {
  const km = stats.walkingMeters >= 1000 ? `${(stats.walkingMeters / 1000).toFixed(1)}km` : `${stats.walkingMeters}m`;
  return `약 ${km} · 약 ${stats.durationMinutes}분`;
}

export function placesMoved(prev, next) {
  if (!Array.isArray(prev) || !Array.isArray(next) || prev.length !== next.length) return true;
  return prev.some(
    (p, i) => Math.abs(Number(p.lat) - Number(next[i].lat)) > 1e-6 || Math.abs(Number(p.lng) - Number(next[i].lng)) > 1e-6,
  );
}
