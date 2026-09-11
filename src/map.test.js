/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMapService, geoJsonToLatLngs } from "./map.js";
import { createLocationService } from "./location.js";
import { createSimulatedGeolocation } from "./simulate.js";
import { stops } from "./content.js";

describe("geoJsonToLatLngs", () => {
  it("swaps GeoJSON lng/lat into Leaflet lat/lng", () => {
    expect(geoJsonToLatLngs([[127.1, 37.5], [127.2, 37.6]])).toEqual([
      [37.5, 127.1],
      [37.6, 127.2],
    ]);
  });
});

describe("map player marker", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("reveals and moves the player pin when setPlayer is called", async () => {
    const host = document.createElement("div");
    host.id = "map";
    Object.defineProperty(host, "clientWidth", { value: 320 });
    Object.defineProperty(host, "clientHeight", { value: 240 });
    document.body.appendChild(host);

    const geo = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [127.12385, 37.53865],
              [127.12774, 37.53974],
            ],
          },
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => geo,
      })),
    );

    const map = createMapService();
    const ok = await map.mount(host, {
      stops,
      geoJsonUrl: "/route.geojson",
    });
    expect(ok).toBe(true);
    expect(map.hasPlayer()).toBe(false);

    map.setPlayer(37.54, 127.125, 20);
    expect(map.hasPlayer()).toBe(true);

    map.setPlayer(37.541, 127.126, 25);
    expect(map.hasPlayer()).toBe(true);

    await new Promise((resolve) => requestAnimationFrame(resolve));
    map.unmount();
  });
});

describe("location last fix", () => {
  it("stores the latest fix for the map to reapply after mount", async () => {
    const geo = createSimulatedGeolocation("good", { stop: stops[0] });
    const location = createLocationService({ geolocation: geo, now: () => 0 });
    const fixes = [];
    location.onFix((fix) => fixes.push(fix));
    location.start({
      stop: stops[0],
      options: {},
      accuracyCeilingMeters: 80,
      manualFallbackAfterMs: 50,
    });
    await vi.waitFor(() => {
      expect(fixes.length).toBeGreaterThan(0);
    });
    const last = location.getLastFix();
    expect(last.lat).toBeCloseTo(stops[0].coordinates.lat, 5);
    expect(last.lng).toBeCloseTo(stops[0].coordinates.lng, 5);
    location.stop();
  });
});
