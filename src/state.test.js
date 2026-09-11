import { describe, expect, it } from "vitest";
import { createInitialState, reduce, SCREENS } from "./state.js";

const sampleGame = {
  id: "cheonho-pieces",
  title: "천호에서 길로 마크 모으기",
  placeCount: 4,
  walkLabel: "약 1.1km · 약 25분",
  places: [
    { order: 1, name: "A", lat: 37.53865, lng: 127.12385, arrivalRadiusMeters: 60 },
    { order: 2, name: "B", lat: 37.53891, lng: 127.12755, arrivalRadiusMeters: 55 },
    { order: 3, name: "C", lat: 37.54078, lng: 127.12936, arrivalRadiusMeters: 60 },
    { order: 4, name: "D", lat: 37.54239, lng: 127.12949, arrivalRadiusMeters: 60 },
  ],
  jigsaw: { source: "system", systemImageId: "station" },
  routeLine: [],
};

describe("state transitions", () => {
  it("opens a game at the safety screen", () => {
    let state = createInitialState();
    state = reduce(state, { type: "SELECT_GAME", game: sampleGame });
    expect(state.screen).toBe("safety");
    expect(state.gameId).toBe("cheonho-pieces");
    state = reduce(state, { type: "ACCEPT_SAFETY" });
    expect(state.screen).toBe("preview");
    state = reduce(state, { type: "CONTINUE" });
    expect(state.screen).toBe("navigating");
    expect(SCREENS).toContain("library");
  });

  it("does not auto-arrive without eligibility", () => {
    let state = { ...createInitialState(), game: sampleGame, screen: "navigating", currentStop: 1, canAutoArrive: false };
    state = reduce(state, { type: "ARRIVE", manual: false });
    expect(state.screen).toBe("navigating");
  });

  it("grants a piece after arrival", () => {
    let state = { ...createInitialState(), game: sampleGame, gameId: sampleGame.id, screen: "navigating", currentStop: 1 };
    state = reduce(state, { type: "ARRIVE", manual: true });
    expect(state.screen).toBe("place");
    state = reduce(state, { type: "COLLECT_PIECE", pieceId: "piece-1" });
    expect(state.collectedPieceIds).toContain("piece-1");
    expect(state.screen).toBe("navigating");
    expect(state.currentStop).toBe(2);
  });

  it("keeps pieces when going back to the previous place", () => {
    let state = {
      ...createInitialState(),
      game: sampleGame,
      screen: "navigating",
      currentStop: 2,
      collectedPieceIds: ["piece-1"],
    };
    state = reduce(state, { type: "PREV_PLACE" });
    expect(state.currentStop).toBe(1);
    expect(state.screen).toBe("place");
    expect(state.collectedPieceIds).toEqual(["piece-1"]);
  });

  it("unlocks assemble after the last piece", () => {
    let state = {
      ...createInitialState(),
      game: sampleGame,
      screen: "place",
      currentStop: 4,
      collectedPieceIds: ["piece-1", "piece-2", "piece-3"],
    };
    state = reduce(state, { type: "COLLECT_PIECE", pieceId: "piece-4" });
    expect(state.screen).toBe("assemble");
  });
});
