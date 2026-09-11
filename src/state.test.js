import { describe, expect, it } from "vitest";
import { accusation, game } from "./content.js";
import { applyPersisted, createInitialState, reduce, SCREENS } from "./state.js";

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

  it("records a camera fallback and continues to the clue", () => {
    let state = { ...createInitialState(), screen: "camera-stop-2", currentStop: 2 };
    state = reduce(state, { type: "COLLECT_CAMERA", fallback: true });
    expect(state.screen).toBe("clue-stop-2");
    expect(state.collectedCameraClueIds).toContain("stop-2");
    expect(state.cameraFallbackIds).toContain("stop-2");
    expect(state.cameraStatus).toBe("stopped");
  });

  it("opens the notebook without changing the game screen", () => {
    let state = { ...createInitialState(), screen: "puzzle-stop-1", currentStop: 1 };
    state = reduce(state, { type: "OPEN_NOTEBOOK" });
    expect(state.overlay).toBe("notebook");
    expect(state.screen).toBe("puzzle-stop-1");
    state = reduce(state, { type: "CLOSE_OVERLAY" });
    expect(state.overlay).toBe(null);
    expect(state.screen).toBe("puzzle-stop-1");
  });

  it("advances after a solved puzzle", () => {
    let state = {
      ...createInitialState(),
      screen: "puzzle-stop-1",
      currentStop: 1,
      solvedPuzzleIds: ["stop-1"],
    };
    state = reduce(state, { type: "AFTER_PUZZLE" });
    expect(state.screen).toBe("navigating-stop-2");
    expect(state.currentStop).toBe(2);
  });
});

describe("restored progress", () => {
  it("drops live location fields", () => {
    const restored = applyPersisted(createInitialState(), {
      schemaVersion: 1,
      gameId: game.id,
      playerMode: "duo",
      screen: "navigating-stop-3",
      currentStop: 3,
      solvedPuzzleIds: ["stop-1"],
      collectedCameraClueIds: ["stop-2"],
      cameraFallbackIds: [],
      hintsUsed: {},
      startedAt: 1,
      duoPhase: "witness",
      discussedStops: [],
      safetyAccepted: true,
      locationPermissionAsked: true,
    });
    expect(restored.screen).toBe("navigating-stop-3");
    expect(restored.locationAccuracyMeters).toBe(null);
    expect(restored.distanceMeters).toBe(null);
    expect(SCREENS).toContain(restored.screen);
  });
});

describe("accusation state", () => {
  it("keeps the player on the accusation screen until every field is correct", () => {
    let state = { ...createInitialState(), screen: "accusation", currentStop: 4 };
    state = reduce(state, {
      type: "ACCUSATION_RESULT",
      check: { murderer: true, motive: false, evidence: true, allCorrect: false },
    });
    expect(state.screen).toBe("accusation");
    expect(state.accusationCheck.allCorrect).toBe(false);
    expect(accusation.solution.murderer).toBe("kang-min-jae");
  });
});
