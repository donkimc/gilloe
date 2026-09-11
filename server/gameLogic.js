import { distanceMeters } from "../src/geo.js";

export const ALLOWED_COUNTS = [4, 9, 16, 25];
export const WALK_METERS_PER_MIN = 67;
export const MINUTES_PER_STOP = 2;

export function gridSizeForCount(placeCount) {
  const n = Math.sqrt(placeCount);
  return Number.isInteger(n) ? n : null;
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

  const pin = url.pathname.match(/\/(\d+\.\d+),(\d+\.\d+)/);
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
