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
