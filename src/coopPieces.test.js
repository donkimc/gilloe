import { describe, expect, it } from "vitest";
import { piecesForStop, STOP_PIECES } from "./coopPieces.js";

describe("piecesForStop", () => {
  it("keeps the four-stop A/B split", () => {
    for (const stop of [1, 2, 3, 4]) {
      expect(piecesForStop(stop, "A", 4)).toEqual(STOP_PIECES[stop].A);
      expect(piecesForStop(stop, "B", 4)).toEqual(STOP_PIECES[stop].B);
      expect(piecesForStop(stop, "solo", 4)).toEqual(STOP_PIECES[stop].solo);
    }
  });

  it("gives both players pieces across a six-stop route", () => {
    const a = [1, 2, 3, 4, 5, 6].flatMap((stop) => piecesForStop(stop, "A", 6));
    const b = [1, 2, 3, 4, 5, 6].flatMap((stop) => piecesForStop(stop, "B", 6));
    expect(a).toHaveLength(4);
    expect(b).toHaveLength(4);
    expect(new Set([...a, ...b]).size).toBe(8);
  });
});
