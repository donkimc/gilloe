import { describe, expect, it } from "vitest";
import { isWalkableWay, walkVerticesForStops } from "./osmWalkRoute.js";

describe("osm walk route", () => {
  it("keeps motorways out of the walking graph", () => {
    expect(isWalkableWay({ highway: "motorway" })).toBe(false);
    expect(isWalkableWay({ highway: "footway" })).toBe(true);
    expect(isWalkableWay({ highway: "residential" })).toBe(true);
  });

  it("follows streets instead of cutting the diagonal", () => {
    const elements = [
      { type: "node", id: 1, lat: 37.538, lon: 127.123 },
      { type: "node", id: 2, lat: 37.538, lon: 127.124 },
      { type: "node", id: 3, lat: 37.539, lon: 127.123 },
      { type: "node", id: 4, lat: 37.539, lon: 127.124 },
      { type: "way", id: 10, nodes: [1, 2], tags: { highway: "residential" } },
      { type: "way", id: 11, nodes: [2, 4], tags: { highway: "footway" } },
      { type: "way", id: 12, nodes: [1, 3], tags: { highway: "residential" } },
      { type: "way", id: 13, nodes: [3, 4], tags: { highway: "residential" } },
    ];
    const { vertices, usedStreets } = walkVerticesForStops(elements, [
      { lat: 37.538, lng: 127.123 },
      { lat: 37.539, lng: 127.124 },
    ]);
    expect(usedStreets).toBe(true);
    expect(vertices.length).toBeGreaterThanOrEqual(3);
    const mids = vertices.slice(1, -1);
    expect(mids.some(([lng, lat]) => (lng === 127.124 && lat === 37.538) || (lng === 127.123 && lat === 37.539))).toBe(true);
  });

  it("does not invent a shortcut across a missing way node", () => {
    const elements = [
      { type: "node", id: 1, lat: 37.538, lon: 127.123 },
      { type: "node", id: 3, lat: 37.539, lon: 127.124 },
      { type: "way", id: 10, nodes: [1, 2, 3], tags: { highway: "residential" } },
    ];
    const { usedStreets, vertices } = walkVerticesForStops(elements, [
      { lat: 37.538, lng: 127.123 },
      { lat: 37.539, lng: 127.124 },
    ]);
    expect(usedStreets).toBe(false);
    expect(vertices).toEqual([
      [127.123, 37.538],
      [127.124, 37.539],
    ]);
  });
});
