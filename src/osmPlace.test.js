import { describe, expect, it } from "vitest";
import { pickNearestNamed } from "./osmPlace.js";

describe("pickNearestNamed", () => {
  it("returns the closest named node within snap distance", () => {
    const nearest = pickNearestNamed(
      [
        { type: "node", id: 1, lat: 37.53852, lon: 127.1234, tags: { name: "천호" } },
        { type: "node", id: 2, lat: 37.54, lon: 127.13, tags: { name: "너무 먼 곳" } },
        { type: "node", id: 3, lat: 37.53853, lon: 127.12341, tags: {} },
      ],
      37.5385225,
      127.1234021,
    );
    expect(nearest.name).toBe("천호");
    expect(nearest.osmId).toBe(1);
  });
});
