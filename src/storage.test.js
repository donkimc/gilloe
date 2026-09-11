import { describe, expect, it } from "vitest";
import { SCREENS } from "./state.js";
import { SCHEMA_VERSION, serializeProgress, validateProgress } from "./storage.js";

describe("saved-state validation", () => {
  it("accepts a current-schema snapshot", () => {
    const saved = serializeProgress({
      schemaVersion: SCHEMA_VERSION,
      gameId: "cheonho-pieces",
      screen: "place",
      currentStop: 2,
      collectedPieceIds: ["piece-1"],
      hintsUsed: {},
      startedAt: 100,
      safetyAccepted: true,
      locationPermissionAsked: true,
      locationAccuracyMeters: 12,
      distanceMeters: 8,
    });
    expect(saved.locationAccuracyMeters).toBeUndefined();
    expect(saved.distanceMeters).toBeUndefined();
    expect(validateProgress(saved, { gameId: "cheonho-pieces", allowedScreens: SCREENS }).ok).toBe(true);
  });

  it("rejects an older schema", () => {
    const result = validateProgress(
      { schemaVersion: 2, gameId: "cheonho-pieces", screen: "library" },
      { gameId: "cheonho-pieces", allowedScreens: SCREENS },
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("schema");
  });

  it("rejects a different game id", () => {
    const result = validateProgress(
      { schemaVersion: SCHEMA_VERSION, gameId: "other", screen: "library" },
      { gameId: "cheonho-pieces", allowedScreens: SCREENS },
    );
    expect(result.ok).toBe(false);
  });

  it("rejects an unknown screen", () => {
    const result = validateProgress(
      { schemaVersion: SCHEMA_VERSION, gameId: "cheonho-pieces", screen: "secret-debug" },
      { gameId: "cheonho-pieces", allowedScreens: SCREENS },
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("screen");
  });
});
