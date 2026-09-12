import { describe, expect, it } from "vitest";
import {
  cellFromPoint,
  emptyPlacement,
  isAssembled,
  placeOnCell,
  piecesForGrid,
  SNAP_PX,
  snapPlacement,
  shufflePieceOrder,
} from "./assemble.js";
import { pickRandomImage, PUZZLE_IMAGES } from "./puzzleImages.js";
import { puzzleArt } from "./puzzleImages.js";

const board = { left: 0, top: 0, width: 200, height: 200 };

describe("assemble snap", () => {
  it("snaps a tile only onto its correct cell", () => {
    const near = snapPlacement(emptyPlacement(2), "piece-1", 50, 50, board, 2);
    expect(near["piece-1"]).toBe("r0c0");
    expect(isAssembled(near, 2)).toBe(false);
    const wrong = snapPlacement(emptyPlacement(2), "piece-1", 150, 50, board, 2);
    expect(wrong["piece-1"]).toBe(null);
  });

  it("does not snap when the pointer is too far from the cell center", () => {
    const edge = snapPlacement(emptyPlacement(2), "piece-1", 90, 90, board, 2);
    expect(edge["piece-1"]).toBe(null);
    expect(SNAP_PX).toBeGreaterThan(20);
  });

  it("places by tap only on the matching cell", () => {
    expect(placeOnCell(emptyPlacement(2), "piece-2", "r0c1", 2)["piece-2"]).toBe("r0c1");
    expect(placeOnCell(emptyPlacement(2), "piece-2", "r0c0", 2)["piece-2"]).toBe(null);
  });

  it("completes a 2x2 board", () => {
    expect(
      isAssembled(
        { "piece-1": "r0c0", "piece-2": "r0c1", "piece-3": "r1c0", "piece-4": "r1c1" },
        2,
      ),
    ).toBe(true);
  });

  it("builds a 3x3 piece list", () => {
    expect(piecesForGrid(3)).toHaveLength(9);
  });

  it("maps a point to a 2x2 cell", () => {
    expect(cellFromPoint(10, 10, board, 2)).toBe("r0c0");
    expect(cellFromPoint(160, 160, board, 2)).toBe("r1c1");
    expect(cellFromPoint(-4, 10, board, 2)).toBe(null);
  });

  it("shuffles with a deterministic rng", () => {
    expect(shufflePieceOrder(["a", "b", "c", "d"], () => 0)).toHaveLength(4);
  });
});

describe("puzzle images", () => {
  it("has several distinct jigsaw pictures", () => {
    expect(PUZZLE_IMAGES.length).toBeGreaterThanOrEqual(5);
    expect(new Set(PUZZLE_IMAGES.map((item) => puzzleArt(item.id))).size).toBe(PUZZLE_IMAGES.length);
  });

  it("picks a different picture than the last one", () => {
    const next = pickRandomImage("station", () => 0);
    expect(next).not.toBe("station");
  });
});

describe("photo pieces", () => {
  it("clips Naver photos to a jigsaw piece", async () => {
    const { pieceMarkup } = await import("./assemble.js");
    const html = pieceMarkup("piece-2", "mark-tile--large", { imageUrl: "https://ldb-phinf.pstatic.net/a.jpg" }, 2);
    expect(html).toContain("<image");
    expect(html).toContain("/api/media?u=");
    expect(html).toContain("clipPath");
    expect(html).toContain("mark-num");
    expect(html).toContain("2");
  });
});

describe("jigsaw edges", () => {
  it("interlocks piece 2 with piece 4 instead of leaving a circle", async () => {
    const { jigsawCellPath } = await import("./assemble.js");
    const two = jigsawCellPath(0, 1, 2);
    const four = jigsawCellPath(1, 1, 2);
    expect(four).toContain("134,82");
    expect(four).not.toContain("134,118");
    expect(two).toContain("166,82");
  });
});
