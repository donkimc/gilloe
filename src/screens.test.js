import { describe, expect, it } from "vitest";
import { createInitialState, reduce } from "./state.js";
import { serializeProgress } from "./storage.js";
import { render } from "./ui/screens.js";

const sampleGame = {
  id: "cheonho-pieces",
  title: "천호에서 길로 마크 모으기",
  placeCount: 4,
  walkLabel: "약 1.1km · 약 25분",
  places: [
    {
      order: 1,
      name: "천호역",
      blurb: "출구 앞",
      address: "천호동",
      lat: 37.53865,
      lng: 127.12385,
      naverUrl: "https://map.naver.com/p?c=16,127.12385,37.53865,0,0,0,dh",
    },
  ],
  jigsaw: { source: "system", systemImageId: "station" },
};

describe("rendered flow", () => {
  it("shows edit and delete on library cards", () => {
    const html = render({
      ...createInitialState(),
      games: [{ id: "cheonho-pieces", title: "천호에서 길로 마크 모으기", placeCount: 4, walkLabel: "약 1.1km · 약 25분" }],
    });
    expect(html).toContain("수정");
    expect(html).toContain("삭제");
    expect(html).toContain('data-action="edit-game"');
    expect(html).toContain('data-action="ask-delete-game"');
  });

  it("asks before deleting a game", () => {
    const html = render({
      ...createInitialState(),
      overlay: "delete-game",
      deleteGameId: "game-1",
      deleteGameTitle: "건대",
    });
    expect(html).toContain("이 게임을 삭제할까요?");
    expect(html).toContain("건대");
    expect(html).toContain('data-action="confirm-delete-game"');
  });

  it("shows a place card with a naver link after arrival", () => {
    let state = reduce(createInitialState(), { type: "SELECT_GAME", game: sampleGame });
    state = { ...state, screen: "place", currentStop: 1, stoppedWalking: true };
    const html = render(state);
    expect(html).toContain("조각 받기");
    expect(html).toContain("네이버에서 보기");
    expect(html).not.toContain("소감");
    expect(html).not.toContain("카메라로 조각");
  });

  it("keeps text directions when the map fails", () => {
    const state = {
      ...createInitialState(),
      game: sampleGame,
      screen: "navigating",
      currentStop: 2,
      mapStatus: "failed",
    };
    const html = render(state);
    expect(html).toContain("외부 도보 안내 열기");
    expect(html).toContain("이전 장소");
  });

  it("does not persist coordinates in serialized progress", () => {
    const saved = serializeProgress({
      ...createInitialState(),
      gameId: "cheonho-pieces",
      screen: "navigating",
      currentStop: 2,
      locationAccuracyMeters: 22,
      distanceMeters: 40,
      lastFix: { lat: 37.5, lng: 127.1 },
    });
    expect(JSON.stringify(saved)).not.toMatch(/127\./);
    expect(saved.lastFix).toBeUndefined();
  });

  it("shows the library tagline beside Gilloe", () => {
    const html = render(createInitialState());
    expect(html).toContain("Gilloe");
    expect(html).toContain("오늘은 어디로? 길로");
  });

  it("offers a route preview instead of skip", () => {
    const html = render({
      ...createInitialState(),
      game: sampleGame,
      screen: "preview",
      locationPermissionAsked: true,
      locationStatus: "locating",
    });
    expect(html).toContain("경로 미리보기");
    expect(html).toContain("위치 없이 계속");
    expect(html).not.toContain("미리보기 건너뛰기");
  });

  it("uses short GPS wording on the manual button", () => {
    const html = render({
      ...createInitialState(),
      game: sampleGame,
      screen: "navigating",
      currentStop: 1,
      manualAvailable: true,
    });
    expect(html).toContain("GPS가 정확하지 않아요");
    expect(html).not.toContain("직접도착확인");
    expect(html).toContain('aria-label="모은 조각"');
    expect(html).toContain('aria-label="게임 종료"');
  });

  it("still lists assemble pieces when the tray order is empty", () => {
    const html = render({
      ...createInitialState(),
      game: sampleGame,
      screen: "assemble",
      assembleOrder: [],
      assemblePlacement: {},
    });
    expect(html).toContain("assemble-piece");
    expect(html).toContain("piece-1");
  });

  it("lets the simulator panel collapse", () => {
    const open = render({ ...createInitialState(), simPanel: true, simMinimized: false });
    expect(open).toContain("접기");
    expect(open).toContain("GPS 양호");
    const closed = render({ ...createInitialState(), simPanel: true, simMinimized: true });
    expect(closed).toContain("펼치기");
    expect(closed).not.toContain("GPS 양호");
  });
});
