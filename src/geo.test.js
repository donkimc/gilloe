import { describe, expect, it } from "vitest";
import { distanceMeters, formatApproxDistance, isArrivalEligible } from "./geo.js";

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

describe("formatApproxDistance", () => {
  it("does not claim exact metres", () => {
    expect(formatApproxDistance(47)).toMatch(/^약 /);
  });
});
