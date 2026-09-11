import { describe, expect, it } from "vitest";
import {
  cellFromPoint,
  emptyPlacement,
  isAssembled,
  placeOnCell,
  SNAP_PX,
  snapPlacement,
  shufflePieceOrder,
} from "./assemble.js";

const board = { left: 0, top: 0, width: 200, height: 200 };

describe("assemble snap", () => {
  it("snaps a tile only onto its correct cell", () => {
    const nearTl = snapPlacement(emptyPlacement(), "piece-1", 50, 50, board);
    expect(nearTl["piece-1"]).toBe("tl");
    expect(isAssembled(nearTl)).toBe(false);

    const wrongCell = snapPlacement(emptyPlacement(), "piece-1", 150, 50, board);
    expect(wrongCell["piece-1"]).toBe(null);
  });

  it("does not snap when the pointer is too far from the cell center", () => {
    const edge = snapPlacement(emptyPlacement(), "piece-1", 90, 90, board);
    expect(edge["piece-1"]).toBe(null);
    expect(SNAP_PX).toBeGreaterThan(20);
  });

  it("places by tap only on the matching cell", () => {
    expect(placeOnCell(emptyPlacement(), "piece-2", "tr")["piece-2"]).toBe("tr");
    expect(placeOnCell(emptyPlacement(), "piece-2", "tl")["piece-2"]).toBe(null);
  });

  it("completes when all four tiles sit in their cells", () => {
    expect(
      isAssembled({
        "piece-1": "tl",
        "piece-2": "tr",
        "piece-3": "bl",
        "piece-4": "br",
      }),
    ).toBe(true);
  });

  it("maps a point to a 2x2 cell", () => {
    expect(cellFromPoint(10, 10, board)).toBe("tl");
    expect(cellFromPoint(160, 160, board)).toBe("br");
    expect(cellFromPoint(-4, 10, board)).toBe(null);
  });

  it("shuffles with a deterministic rng", () => {
    const ids = shufflePieceOrder(["a", "b", "c", "d"], () => 0);
    expect(ids).toHaveLength(4);
  });
});
