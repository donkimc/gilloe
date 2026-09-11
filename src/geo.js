const EARTH_RADIUS_M = 6371000;

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function toDeg(radians) {
  return (radians * 180) / Math.PI;
}

/** @param {{lat:number, lng:number}} a @param {{lat:number, lng:number}} b */
export function distanceMeters(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(a.lng) || !Number.isFinite(b.lat) || !Number.isFinite(b.lng)) {
    return null;
  }
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from `a` to `b` in degrees (0 = north, clockwise). */
export function bearingDegrees(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(a.lng) || !Number.isFinite(b.lat) || !Number.isFinite(b.lng)) {
    return null;
  }
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** GeoJSON [lng, lat] pair distance */
export function distanceLngLat(a, b) {
  return distanceMeters({ lng: a[0], lat: a[1] }, { lng: b[0], lat: b[1] });
}

/**
 * Arrival unlocks only when the latest reading is inside the stop radius
 * and reported accuracy is within the configured ceiling.
 */
export function isArrivalEligible({
  distanceMeters: distance,
  accuracyMeters,
  radiusMeters,
  accuracyCeilingMeters,
}) {
  if (!Number.isFinite(distance) || !Number.isFinite(accuracyMeters)) return false;
  if (!Number.isFinite(radiusMeters) || !Number.isFinite(accuracyCeilingMeters)) return false;
  if (accuracyMeters > accuracyCeilingMeters) return false;
  return distance <= radiusMeters;
}

export function formatApproxDistance(meters) {
  if (!Number.isFinite(meters)) return "거리 미확인";
  if (meters < 20) return "약 20m 이내";
  if (meters < 100) return `약 ${Math.round(meters / 5) * 5}m`;
  if (meters < 1000) return `약 ${Math.round(meters / 10) * 10}m`;
  return `약 ${(meters / 1000).toFixed(1)}km`;
}

export function shortestAngleDelta(fromDeg, toDeg) {
  let d = toDeg - fromDeg;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

export function lineLength(coords) {
  let total = 0;
  for (let i = 1; i < coords.length; i += 1) {
    total += distanceLngLat(coords[i - 1], coords[i]);
  }
  return total;
}

export function pointAlong(coords, t) {
  const target = Math.max(0, Math.min(1, t)) * lineLength(coords);
  if (target <= 0) return { coord: coords[0] };
  let traveled = 0;
  for (let i = 1; i < coords.length; i += 1) {
    const a = coords[i - 1];
    const b = coords[i];
    const seg = distanceLngLat(a, b) || 0;
    if (traveled + seg >= target || i === coords.length - 1) {
      const u = seg === 0 ? 0 : (target - traveled) / seg;
      return {
        coord: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u],
      };
    }
    traveled += seg;
  }
  return { coord: coords[coords.length - 1] };
}

export function sliceLine(coords, t) {
  const target = Math.max(0, Math.min(1, t)) * lineLength(coords);
  if (t <= 0) return [coords[0], coords[0]];
  if (t >= 1) return coords;
  const out = [coords[0]];
  let traveled = 0;
  for (let i = 1; i < coords.length; i += 1) {
    const a = coords[i - 1];
    const b = coords[i];
    const seg = distanceLngLat(a, b) || 0;
    if (traveled + seg >= target) {
      const u = seg === 0 ? 0 : (target - traveled) / seg;
      out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
      return out;
    }
    out.push(b);
    traveled += seg;
  }
  return coords;
}
