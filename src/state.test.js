import { describe, expect, it } from "vitest";
import { game } from "./content.js";
import { applyPersisted, createInitialState, reduce, SCREENS } from "./state.js";
import { SCHEMA_VERSION } from "./storage.js";
import { emptyPlacement } from "./assemble.js";

describe("state transitions", () => {
  it("follows the opening sequence", () => {
    let state = createInitialState();
    state = reduce(state, { type: "GOTO", screen: "mode" });
    expect(state.screen).toBe("mode");
    state = reduce(state, { type: "SELECT_MODE", mode: "solo" });
    expect(state.screen).toBe("safety");
    expect(state.playerMode).toBe("solo");
    state = reduce(state, { type: "ACCEPT_SAFETY" });
    expect(state.screen).toBe("briefing");
    state = reduce(state, { type: "CONTINUE" });
    expect(state.screen).toBe("route-overview");
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("does not auto-arrive without eligibility", () => {
    let state = { ...createInitialState(), screen: "navigating-stop-1", currentStop: 1, canAutoArrive: false };
    state = reduce(state, { type: "ARRIVE", manual: false });
    expect(state.screen).toBe("navigating-stop-1");
  });

  it("arrives at the camera screen for stop 2", () => {
    let state = { ...createInitialState(), screen: "navigating-stop-2", currentStop: 2, canAutoArrive: true };
    state = reduce(state, { type: "ARRIVE", manual: false });
    expect(state.screen).toBe("camera-stop-2");
  });

  it("grants a piece after arrival at stop 1", () => {
    let state = { ...createInitialState(), screen: "navigating-stop-1", currentStop: 1 };
    state = reduce(state, { type: "ARRIVE", manual: true });
    expect(state.screen).toBe("piece-stop-1");
    state = reduce(state, { type: "COLLECT_PIECE", pieceId: "piece-1" });
    expect(state.collectedPieceIds).toContain("piece-1");
    expect(state.screen).toBe("navigating-stop-2");
    expect(state.currentStop).toBe(2);
  });

  it("records a camera fallback and continues to the piece", () => {
    let state = { ...createInitialState(), screen: "camera-stop-2", currentStop: 2 };
    state = reduce(state, { type: "COLLECT_CAMERA", fallback: true });
    expect(state.screen).toBe("piece-stop-2");
    expect(state.collectedCameraClueIds).toContain("stop-2");
    expect(state.cameraFallbackIds).toContain("stop-2");
    expect(state.cameraStatus).toBe("stopped");
  });

  it("opens the piece tray without changing the game screen", () => {
    let state = { ...createInitialState(), screen: "piece-stop-1", currentStop: 1 };
    state = reduce(state, { type: "OPEN_NOTEBOOK" });
    expect(state.overlay).toBe("notebook");
    expect(state.screen).toBe("piece-stop-1");
    state = reduce(state, { type: "CLOSE_OVERLAY" });
    expect(state.overlay).toBe(null);
    expect(state.screen).toBe("piece-stop-1");
  });

  it("unlocks assemble after the fourth piece", () => {
    let state = {
      ...createInitialState(),
      screen: "piece-stop-4",
      currentStop: 4,
      collectedPieceIds: ["piece-1", "piece-2", "piece-3"],
    };
    state = reduce(state, { type: "COLLECT_PIECE", pieceId: "piece-4" });
    expect(state.collectedPieceIds).toHaveLength(4);
    expect(state.screen).toBe("assemble");
  });
});

describe("restored progress", () => {
  it("drops live location fields", () => {
    const restored = applyPersisted(createInitialState(), {
      schemaVersion: 2,
      gameId: game.id,
      playerMode: "duo",
      screen: "navigating-stop-3",
      currentStop: 3,
      collectedPieceIds: ["piece-1"],
      collectedCameraClueIds: ["stop-2"],
      cameraFallbackIds: [],
      hintsUsed: {},
      startedAt: 1,
      safetyAccepted: true,
      locationPermissionAsked: true,
    });
    expect(restored.screen).toBe("navigating-stop-3");
    expect(restored.locationAccuracyMeters).toBe(null);
    expect(restored.distanceMeters).toBe(null);
    expect(SCREENS).toContain(restored.screen);
  });
});

describe("assemble state", () => {
  it("marks complete only when every tile is seated", () => {
    let state = { ...createInitialState(), screen: "assemble" };
    state = reduce(state, {
      type: "PLACE_PIECE",
      placement: { ...emptyPlacement(), "piece-1": "tl" },
    });
    expect(state.screen).toBe("assemble");
    expect(state.assembleComplete).toBe(false);
    state = reduce(state, {
      type: "PLACE_PIECE",
      placement: { "piece-1": "tl", "piece-2": "tr", "piece-3": "bl", "piece-4": "br" },
    });
    expect(state.assembleComplete).toBe(true);
    expect(state.screen).toBe("assemble");
  });
});
