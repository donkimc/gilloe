import { describe, expect, it } from "vitest";
import { accusation, stopByOrder } from "./content.js";
import { checkAccusation, checkChoice, checkMatchPuzzle, checkOrder, moveItem } from "./puzzles.js";

describe("puzzle answers", () => {
  it("accepts the stop 1 matching solution", () => {
    const puzzle = stopByOrder(1).puzzle;
    expect(checkMatchPuzzle(puzzle.solution, puzzle.solution).correct).toBe(true);
    expect(checkMatchPuzzle({ Y: "kang-min-jae", M: "seo-yu-na", D: "lee-do-yun" }, puzzle.solution).correct).toBe(false);
  });

  it("accepts the navy umbrella for stop 2", () => {
    const puzzle = stopByOrder(2).puzzle;
    expect(checkChoice("navy-umbrella", puzzle.solution).correct).toBe(true);
    expect(checkChoice("yellow-umbrella", puzzle.solution).correct).toBe(false);
  });

  it("accepts the chronological order for stop 3", () => {
    const puzzle = stopByOrder(3).puzzle;
    expect(checkOrder(puzzle.solution, puzzle.solution).correct).toBe(true);
    expect(checkOrder(["min-jae-738", "yu-na-732", "do-yun-745"], puzzle.solution).correct).toBe(false);
  });

  it("moves items with buttons, not drag only", () => {
    expect(moveItem(["a", "b", "c"], 2, -1)).toEqual(["a", "c", "b"]);
  });
});

describe("final accusation", () => {
  it("requires murderer, motive, and evidence independently", () => {
    const correct = checkAccusation(accusation.solution, accusation.solution);
    expect(correct.allCorrect).toBe(true);
    const partial = checkAccusation(
      {
        murderer: "kang-min-jae",
        motive: "stolen-art",
        evidence: "photo-738-and-appointment",
      },
      accusation.solution,
    );
    expect(partial.murderer).toBe(true);
    expect(partial.motive).toBe(false);
    expect(partial.allCorrect).toBe(false);
  });
});
