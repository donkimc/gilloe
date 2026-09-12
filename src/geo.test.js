import { describe, expect, it } from "vitest";
import { distanceMeters, formatApproxDistance, isArrivalEligible, placeProgresses } from "./geo.js";

describe("distanceMeters", () => {
  it("returns ~0 for the same point", () => {
    const p = { lat: 37.53865, lng: 127.12385 };
    expect(distanceMeters(p, p)).toBeCloseTo(0, 5);
  });

  it("measures a short Cheonho-scale span", () => {
    const a = { lat: 37.53865, lng: 127.12385 };
    const b = { lat: 37.53985, lng: 127.12715 };
    const meters = distanceMeters(a, b);
    expect(meters).toBeGreaterThan(250);
    expect(meters).toBeLessThan(450);
  });
});

describe("isArrivalEligible", () => {
  it("unlocks only inside the radius with usable accuracy", () => {
    expect(
      isArrivalEligible({
        distanceMeters: 25,
        accuracyMeters: 20,
        radiusMeters: 60,
        accuracyCeilingMeters: 80,
      }),
    ).toBe(true);
  });

  it("rejects a close reading with poor accuracy", () => {
    expect(
      isArrivalEligible({
        distanceMeters: 10,
        accuracyMeters: 120,
        radiusMeters: 60,
        accuracyCeilingMeters: 80,
      }),
    ).toBe(false);
  });

  it("rejects a precise reading outside the radius", () => {
    expect(
      isArrivalEligible({
        distanceMeters: 90,
        accuracyMeters: 12,
        radiusMeters: 60,
        accuracyCeilingMeters: 80,
      }),
    ).toBe(false);
  });
});

describe("placeProgresses", () => {
  it("keeps stop fractions in walking order", () => {
    const line = [
      [127.0, 37.0],
      [127.1, 37.0],
      [127.2, 37.0],
    ];
    const places = [
      { lng: 127.0, lat: 37.0 },
      { lng: 127.2, lat: 37.0 },
    ];
    const ts = placeProgresses(line, places);
    expect(ts[0]).toBeCloseTo(0, 5);
    expect(ts[1]).toBeCloseTo(1, 5);
    expect(ts[1]).toBeGreaterThanOrEqual(ts[0]);
  });
});

describe("formatApproxDistance", () => {
  it("does not claim exact metres", () => {
    expect(formatApproxDistance(47)).toMatch(/^약 /);
  });
});
