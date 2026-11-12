import { describe, expect, it } from "vitest";
import { librarySelection } from "./library.js";

const games = [
  { id: "far", title: "강일동", keywords: "강일동 수련관", walkingMeters: 1900, durationMinutes: 36, createdAt: 300, startLat: 37.56, startLng: 127.17 },
  { id: "near", title: "건대입구", keywords: "건대입구 한아름공원", walkingMeters: 900, durationMinutes: 22, createdAt: 200, startLat: 37.54, startLng: 127.07 },
  { id: "mid", title: "둔촌동 맥도날드", keywords: "둔촌동 주민센터", walkingMeters: 1400, durationMinutes: 29, createdAt: 100, startLat: 37.53, startLng: 127.14 },
  { id: "old", title: "천호동", keywords: "천호동 로데오", walkingMeters: 1800, durationMinutes: 35, createdAt: 50, startLat: 37.54, startLng: 127.12 },
  { id: "blank", title: "날짜 없음", keywords: "", walkingMeters: 500, durationMinutes: 10, createdAt: null, startLat: null, startLng: null },
];

describe("library list", () => {
  it("shows four routes per page and keeps the rest for the next page", () => {
    const first = librarySelection(games, { sort: "date-desc", page: 1 });
    const second = librarySelection(games, { sort: "date-desc", page: 2 });
    expect(first.items).toHaveLength(4);
    expect(first.pages).toBe(2);
    expect(second.items.map((game) => game.id)).toEqual(["blank"]);
    expect(first.items.map((game) => game.id)).toEqual(["far", "near", "mid", "old"]);
  });

  it("searches title and stop names", () => {
    const found = librarySelection(games, { query: "주민센터" });
    expect(found.items.map((game) => game.id)).toEqual(["mid"]);
    expect(librarySelection(games, { query: "둔촌" }).items).toHaveLength(1);
  });

  it("sorts by walking distance, duration, and created date", () => {
    expect(librarySelection(games, { sort: "distance" }).items.map((game) => game.id).slice(0, 3)).toEqual(["blank", "near", "mid"]);
    expect(librarySelection(games, { sort: "time" }).items.map((game) => game.id).slice(0, 2)).toEqual(["blank", "near"]);
    expect(librarySelection(games, { sort: "date-asc" }).items.map((game) => game.id)[0]).toBe("old");
    expect(librarySelection(games, { sort: "date-desc" }).items.map((game) => game.id)[0]).toBe("far");
  });

  it("sorts by distance from the player without needing a saved location", () => {
    const origin = { lat: 37.5405, lng: 127.0708 };
    const page = librarySelection(games, { sort: "near", origin });
    const next = librarySelection(games, { sort: "near", origin, page: 2 });
    expect(page.items[0].id).toBe("near");
    expect(next.items.map((game) => game.id)).toEqual(["blank"]);
  });
});
