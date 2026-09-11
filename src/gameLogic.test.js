import { describe, expect, it } from "vitest";
import {
  extractNaverPlaceId,
  listingPhotoUrl,
  needsWalkingLine,
  parseCoordsFromNaverUrl,
  parsePlaceDetailHtml,
  placesMoved,
  validateGamePayload,
  walkingStats,
} from "../server/gameLogic.js";
import { fetchOsrmLine, withWalkingLine } from "../server/osrm.js";

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

  it("reads coordinates from an address path", () => {
    const parsed = parseCoordsFromNaverUrl("https://map.naver.com/p/entry/address/127.0713,37.5424,서울");
    expect(parsed.lat).toBeCloseTo(37.5424);
    expect(parsed.lng).toBeCloseTo(127.0713);
  });

  it("extracts a place id from a map entry url", () => {
    expect(extractNaverPlaceId("https://map.naver.com/p/entry/place/36262946")).toBe("36262946");
    expect(extractNaverPlaceId("https://pcmap.place.naver.com/restaurant/36262946/home")).toBe("36262946");
  });

  it("reads name, address, and coords from place html", () => {
    const html = `
      <meta property="og:title" content="투썸플레이스 건대입구점 : 네이버" />
      <meta property="og:image" content="https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2Fphoto.jpeg" />
      window.__APOLLO_STATE__ = {"PlaceDetailBase:36262946":{"__typename":"PlaceDetailBase","id":"36262946","name":"투썸플레이스 건대입구점","roadAddress":"서울 광진구 능동로13길 5 1층","address":"서울 광진구 화양동 5-12","coordinate":{"__typename":"Coordinate","x":"127.0713063","y":"37.5424242"}}};
    `;
    const place = parsePlaceDetailHtml(html);
    expect(place.name).toBe("투썸플레이스 건대입구점");
    expect(place.address).toContain("능동로13길");
    expect(place.lat).toBeCloseTo(37.5424242);
    expect(place.lng).toBeCloseTo(127.0713063);
    expect(place.photoUrl).toContain("ldb-phinf.pstatic.net");
  });

  it("drops the generic map og image", () => {
    expect(listingPhotoUrl("https://ssl.pstatic.net/static/maps/assets/images/og-map-400x200.png")).toBe("");
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

describe("walking line", () => {
  it("treats an empty or pin-to-pin line as missing a street route", () => {
    expect(needsWalkingLine([], 4)).toBe(true);
    expect(
      needsWalkingLine(
        [
          [127.1, 37.5],
          [127.2, 37.6],
          [127.3, 37.7],
          [127.4, 37.8],
        ],
        4,
      ),
    ).toBe(true);
    expect(needsWalkingLine(Array.from({ length: 20 }, (_, i) => [127, 37 + i / 1000]), 4)).toBe(false);
  });

  it("stitches pair routes when the full OSRM request fails", async () => {
    const places = [
      { lat: 37.54, lng: 127.06 },
      { lat: 37.541, lng: 127.07 },
      { lat: 37.542, lng: 127.071 },
    ];
    let calls = 0;
    const fetchFn = async () => {
      calls += 1;
      if (calls === 1) return { ok: false };
      return {
        ok: true,
        json: async () => ({
          routes: [{ geometry: { coordinates: [[127.06, 37.54], [127.065, 37.5405], [127.07, 37.541]] } }],
        }),
      };
    };
    const line = await fetchOsrmLine(places, { fetchFn, timeoutMs: 1000 });
    expect(line.length).toBeGreaterThan(places.length);
  });

  it("fills a missing line onto a stored game", async () => {
    const game = {
      id: "x",
      placeCount: 2,
      places: [
        { lat: 37.54, lng: 127.06 },
        { lat: 37.541, lng: 127.07 },
      ],
      routeLine: [],
    };
    const { game: next, changed } = await withWalkingLine(game, async () => [
      [127.06, 37.54],
      [127.065, 37.5405],
      [127.07, 37.541],
    ]);
    expect(changed).toBe(true);
    expect(next.routeLine).toHaveLength(3);
  });
});
