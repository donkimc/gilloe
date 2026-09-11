import { describe, expect, it } from "vitest";
import { createInitialState, reduce } from "./state.js";
import { serializeProgress } from "./storage.js";
import { render } from "./ui/screens.js";

function play(actions, start = createInitialState()) {
  return actions.reduce((state, action) => reduce(state, action), start);
}

describe("rendered flow", () => {
  it("keeps the provisional-route warning on the cover", () => {
    const html = render(createInitialState());
    expect(html).toContain("현장 검증 전 임시 경로");
    expect(html).toContain("공개 플레이용이 아닙니다");
    expect(html).toContain("걷기 시작");
    expect(html).toContain("길로 마크");
  });

  it("walks a solo path from briefing to a collected piece", () => {
    let state = play([
      { type: "SELECT_MODE", mode: "solo" },
      { type: "ACCEPT_SAFETY" },
      { type: "CONTINUE" },
      { type: "LOCATION_ASKED" },
      { type: "LOCATION_STATUS", status: "denied", canAutoArrive: false, manualAvailable: true },
      { type: "GOTO", screen: "navigating-stop-1", stop: 1 },
    ]);
    let html = render(state);
    expect(html).toContain("GPS가 정확하지 않아요 — 직접 도착 확인");
    expect(html).toContain("외부 도보 안내 열기");

    state = reduce(state, { type: "ARRIVE", manual: true });
    html = render({ ...state, stoppedWalking: true });
    expect(html).toContain("조각 받기");
    expect(html).toContain("조각 1 / 4");

    state = play(
      [
        { type: "GOTO", screen: "camera-stop-2", stop: 2 },
        { type: "CAMERA_STATUS", status: "denied" },
        { type: "CAMERA_STATUS", status: "fallback" },
      ],
      state,
    );
    html = render(state);
    expect(html).toContain("카메라 없이 조각 보기");
    expect(html).toContain("정적 조각");

    state = reduce(state, { type: "COLLECT_CAMERA", fallback: true });
    expect(state.cameraStatus).toBe("stopped");
    expect(state.screen).toBe("piece-stop-2");
  });

  it("shows shared-phone copy without witness roles", () => {
    const html = render(createInitialState());
    expect(html).not.toContain("증인");
    const mode = render(play([{ type: "GOTO", screen: "mode" }]));
    expect(mode).toContain("둘이 걷기");
    expect(mode).toContain("휴대폰 한 대");
    expect(mode).not.toContain("휴대폰을 건네주세요");
  });

  it("keeps text directions when the map fails", () => {
    const state = play([
      { type: "SELECT_MODE", mode: "solo" },
      { type: "ACCEPT_SAFETY" },
      { type: "CONTINUE" },
      { type: "MAP_STATUS", status: "failed" },
      { type: "GOTO", screen: "navigating-stop-3", stop: 3 },
    ]);
    const html = render(state);
    expect(html).toContain("상점 앞을 가로막지 말고");
    expect(html).toContain("외부 도보 안내 열기");
  });

  it("does not persist coordinates in serialized progress", () => {
    const saved = serializeProgress({
      ...createInitialState(),
      playerMode: "solo",
      screen: "navigating-stop-2",
      currentStop: 2,
      locationAccuracyMeters: 22,
      distanceMeters: 40,
      lastFix: { lat: 37.5, lng: 127.1 },
    });
    expect(JSON.stringify(saved)).not.toMatch(/127\./);
    expect(saved.lastFix).toBeUndefined();
  });

  it("renders the assemble board from four collected pieces", () => {
    const html = render({
      ...createInitialState(),
      screen: "assemble",
      playerMode: "solo",
      collectedPieceIds: ["piece-1", "piece-2", "piece-3", "piece-4"],
      assembleComplete: true,
    });
    expect(html).toContain("길로 마크 맞추기");
    expect(html).toContain("완성 보기");
    expect(html).toContain("마크가 완성되었습니다");
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
