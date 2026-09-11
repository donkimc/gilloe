import { describe, expect, it } from "vitest";
import { parseCoordsFromNaverUrl, validateGamePayload, walkingStats } from "../server/gameLogic.js";

describe("naver url coords", () => {
  it("reads lat/lng query params", () => {
    expect(parseCoordsFromNaverUrl("https://map.naver.com/p?lat=37.53865&lng=127.12385")).toEqual({
      lat: 37.53865,
      lng: 127.12385,
    });
  });

  it("reads the c= zoom,lng,lat parameter", () => {
    const parsed = parseCoordsFromNaverUrl("https://map.naver.com/p?c=16,127.12755,37.53891,0,0,0,dh");
    expect(parsed.lng).toBeCloseTo(127.12755);
    expect(parsed.lat).toBeCloseTo(37.53891);
  });

  it("rejects non-naver urls", () => {
    expect(parseCoordsFromNaverUrl("https://openstreetmap.org/?mlat=37.5&mlon=127.1")).toBe(null);
  });
});

describe("game payload", () => {
  const places = [
    { lat: 37.53865, lng: 127.12385 },
    { lat: 37.53891, lng: 127.12755 },
    { lat: 37.54078, lng: 127.12936 },
    { lat: 37.54239, lng: 127.12949 },
  ];

  it("accepts a four-place puzzle", () => {
    const result = validateGamePayload({
      title: "테스트",
      placeCount: 4,
      places,
      jigsaw: { source: "system", systemImageId: "park" },
    });
    expect(result.ok).toBe(true);
  });

  it("rejects the wrong place count", () => {
    const result = validateGamePayload({
      title: "테스트",
      placeCount: 9,
      places,
      jigsaw: { source: "system" },
    });
    expect(result.ok).toBe(false);
  });

  it("estimates walk time from distance plus stops", () => {
    const stats = walkingStats(places);
    expect(stats.walkingMeters).toBeGreaterThan(400);
    expect(stats.durationMinutes).toBeGreaterThan(8);
  });
});
