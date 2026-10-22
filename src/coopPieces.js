/** Nine-piece 3×3 board. Center piece-5 is the shared team tile. */

export const PUZZLE_COUNT = 9;
export const GRID_N = 3;
export const TEAM_PIECE = "piece-5";
export const PERSONAL_TOTAL = 8;

export const PLAYER_A_PIECES = ["piece-1", "piece-3", "piece-6", "piece-8"];
export const PLAYER_B_PIECES = ["piece-2", "piece-4", "piece-7", "piece-9"];

export const STOP_PIECES = {
  1: { A: ["piece-1"], B: ["piece-2"], solo: ["piece-1", "piece-2"] },
  2: { A: ["piece-3"], B: ["piece-4"], solo: ["piece-3", "piece-4"] },
  3: { A: ["piece-6"], B: ["piece-7"], solo: ["piece-6", "piece-7"] },
  4: { A: ["piece-8"], B: ["piece-9"], solo: ["piece-8", "piece-9"] },
};

export function piecesForRole() {
  return {
    playerA: [...PLAYER_A_PIECES],
    playerB: [...PLAYER_B_PIECES],
    team: TEAM_PIECE,
  };
}

function clampStopCount(stopCount) {
  const n = Number(stopCount);
  if (!Number.isInteger(n) || n < 2) return 4;
  return Math.min(8, n);
}

function bucketsFor(pieces, stopCount) {
  const n = clampStopCount(stopCount);
  const buckets = Array.from({ length: n }, () => []);
  pieces.forEach((id, idx) => {
    const stop = Math.min(n - 1, Math.floor((idx * n) / pieces.length));
    buckets[stop].push(id);
  });
  return buckets;
}

export function piecesForStop(stop, role = "solo", stopCount = 4) {
  const n = clampStopCount(stopCount);
  const i = Number(stop);
  if (!Number.isInteger(i) || i < 1 || i > n) return [];
  const a = bucketsFor(PLAYER_A_PIECES, n)[i - 1] || [];
  const b = bucketsFor(PLAYER_B_PIECES, n)[i - 1] || [];
  if (role === "A") return a;
  if (role === "B") return b;
  return [...a, ...b];
}

export function ownerOfPiece(pieceId, assignment = piecesForRole()) {
  if (pieceId === assignment.team) return "team";
  if (assignment.playerA.includes(pieceId)) return "A";
  if (assignment.playerB.includes(pieceId)) return "B";
  return null;
}

export function gridSizeForPuzzle(puzzleCount = PUZZLE_COUNT) {
  const n = Math.sqrt(Number(puzzleCount) || PUZZLE_COUNT);
  return Number.isInteger(n) && n > 0 ? n : GRID_N;
}
