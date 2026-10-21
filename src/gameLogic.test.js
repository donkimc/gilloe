import { describe, expect, it } from "vitest";
import { placesMoved, walkingStats } from "../server/gameLogic.js";
import { validateGamePayload } from "../src/routeSchema.js";

describe("game payload", () => {
  const places = [
    { lat: 37.53865, lng: 127.12385, publicStopConfirmed: true },
    { lat: 37.53891, lng: 127.12755, publicStopConfirmed: true },
    { lat: 37.54078, lng: 127.12936, publicStopConfirmed: true },
    { lat: 37.54239, lng: 127.12949, publicStopConfirmed: true },
  ];

  it("accepts a four-place puzzle with OSM provenance", () => {
    const result = validateGamePayload({
      title: "테스트",
      placeCount: 4,
      places,
      routeLine: places.map((p) => [p.lng, p.lat]),
      source: { method: "openstreetmap-assisted-drawing", proprietaryProviderDerived: false },
      jigsaw: { source: "system", systemImageId: "park" },
    });
    expect(result.ok).toBe(true);
  });

  it("rejects the wrong place count", () => {
    const result = validateGamePayload({
      title: "테스트",
      placeCount: 9,
      places,
      routeLine: places.map((p) => [p.lng, p.lat]),
      source: { method: "openstreetmap-assisted-drawing", proprietaryProviderDerived: false },
      jigsaw: { source: "system" },
    });
    expect(result.ok).toBe(false);
  });

  it("detects when stop coordinates change", () => {
    expect(placesMoved(places, places)).toBe(false);
    expect(placesMoved(places, places.map((p, i) => (i ? p : { ...p, lat: p.lat + 0.01 })))).toBe(true);
  });

  it("estimates walk time from distance plus stops", () => {
    const stats = walkingStats(places);
    expect(stats.walkingMeters).toBeGreaterThan(400);
    expect(stats.durationMinutes).toBeGreaterThan(8);
  });
});
