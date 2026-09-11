import { describe, expect, it, vi } from "vitest";
import { createCameraService } from "./camera.js";
import { createLocationService } from "./location.js";
import { createSimulatedGeolocation, createSimulatedMedia } from "./simulate.js";

const stop = { coordinates: { lat: 37.53865, lng: 127.12385 }, arrivalRadiusMeters: 60 };

describe("camera tracks", () => {
  it("stops every media track", async () => {
    const media = createSimulatedMedia("ok");
    const camera = createCameraService({ mediaDevices: media });
    await camera.start(null);
    expect(camera.hasActiveStream()).toBe(true);
    camera.stop();
    expect(camera.hasActiveStream()).toBe(false);
  });

  it("re-attaches the live stream to a new video element after a UI remount", async () => {
    const media = createSimulatedMedia("ok");
    const camera = createCameraService({ mediaDevices: media });
    const first = { srcObject: null, play: vi.fn(async () => {}) };
    const second = { srcObject: null, play: vi.fn(async () => {}) };
    await camera.start(first);
    expect(first.srcObject).toBeTruthy();
    camera.attach(second);
    expect(second.srcObject).toBe(first.srcObject);
    expect(second.play).toHaveBeenCalled();
    camera.stop();
  });
});

describe("location service", () => {
  it("unlocks arrival for a simulated accurate fix at the stop", async () => {
    const geo = createSimulatedGeolocation("good", { stop: stop });
    const location = createLocationService({ geolocation: geo, now: () => 0 });
    const seen = [];
    location.onChange((payload) => seen.push(payload));
    location.start({
      stop: stop,
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
    const geo = createSimulatedGeolocation("denied", { stop: stop });
    const location = createLocationService({ geolocation: geo, now: () => 0 });
    const seen = [];
    location.onChange((payload) => seen.push(payload));
    location.start({
      stop: stop,
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
