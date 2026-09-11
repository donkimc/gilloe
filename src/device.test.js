import { describe, expect, it, vi } from "vitest";
import { createCameraService } from "./camera.js";
import { createLocationService } from "./location.js";
import { createSimulatedGeolocation, createSimulatedMedia } from "./simulate.js";
import { stops } from "./content.js";

describe("camera tracks", () => {
  it("stops every media track", async () => {
    const media = createSimulatedMedia("ok");
    const camera = createCameraService({ mediaDevices: media });
    await camera.start(null);
    expect(camera.hasActiveStream()).toBe(true);
    camera.stop();
    expect(camera.hasActiveStream()).toBe(false);
  });
});

describe("location service", () => {
  it("unlocks arrival for a simulated accurate fix at the stop", async () => {
    const geo = createSimulatedGeolocation("good", { stop: stops[0] });
    const location = createLocationService({ geolocation: geo, now: () => 0 });
    const seen = [];
    location.onChange((payload) => seen.push(payload));
    location.start({
      stop: stops[0],
      options: { enableHighAccuracy: true, maximumAge: 0, timeout: 1000 },
      accuracyCeilingMeters: 80,
      manualFallbackAfterMs: 50,
    });
    await vi.waitFor(() => {
      expect(seen.some((item) => item.canAutoArrive)).toBe(true);
    });
    location.stop();
  });

  it("opens the manual fallback when permission is denied", async () => {
    const geo = createSimulatedGeolocation("denied", { stop: stops[0] });
    const location = createLocationService({ geolocation: geo, now: () => 0 });
    const seen = [];
    location.onChange((payload) => seen.push(payload));
    location.start({
      stop: stops[0],
      options: {},
      accuracyCeilingMeters: 80,
      manualFallbackAfterMs: 50,
    });
    await vi.waitFor(() => {
      expect(seen.some((item) => item.status === "denied" && item.manualAvailable)).toBe(true);
    });
    location.stop();
  });
});
