import { describe, expect, it } from "vitest";
import { game } from "./content.js";
import { SCREENS } from "./state.js";
import { SCHEMA_VERSION, serializeProgress, validateProgress } from "./storage.js";

describe("saved-state validation", () => {
  it("accepts a current-schema snapshot", () => {
    const saved = serializeProgress({
      schemaVersion: SCHEMA_VERSION,
      gameId: game.id,
      playerMode: "solo",
      screen: "piece-stop-2",
      currentStop: 2,
      collectedPieceIds: ["piece-1"],
      collectedCameraClueIds: ["stop-2"],
      cameraFallbackIds: [],
      hintsUsed: {},
      startedAt: 100,
      safetyAccepted: true,
      locationPermissionAsked: true,
      locationAccuracyMeters: 12,
      distanceMeters: 8,
    });
    expect(saved.locationAccuracyMeters).toBeUndefined();
    expect(saved.distanceMeters).toBeUndefined();
    expect(validateProgress(saved, { gameId: game.id, allowedScreens: SCREENS }).ok).toBe(true);
  });

  it("rejects an older murder-schema save", () => {
    const result = validateProgress(
      { schemaVersion: 1, gameId: "cheonho-1942", playerMode: "solo", screen: "cover" },
      { gameId: game.id, allowedScreens: SCREENS },
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("schema");
  });

  it("rejects a different game id", () => {
    const result = validateProgress(
      { schemaVersion: SCHEMA_VERSION, gameId: "other", playerMode: "solo", screen: "cover" },
      { gameId: game.id, allowedScreens: SCREENS },
    );
    expect(result.ok).toBe(false);
  });

  it("rejects an unknown screen", () => {
    const result = validateProgress(
      { schemaVersion: SCHEMA_VERSION, gameId: game.id, playerMode: "solo", screen: "secret-debug" },
      { gameId: game.id, allowedScreens: SCREENS },
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("screen");
  });
});
