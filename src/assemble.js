export const CELLS = ["tl", "tr", "bl", "br"];

export const PIECES = [
  { id: "piece-1", cell: "tl", order: 1 },
  { id: "piece-2", cell: "tr", order: 2 },
  { id: "piece-3", cell: "bl", order: 3 },
  { id: "piece-4", cell: "br", order: 4 },
];

export const SNAP_PX = 44;

export function emptyPlacement() {
  return {
    "piece-1": null,
    "piece-2": null,
    "piece-3": null,
    "piece-4": null,
  };
}

export function pieceById(id) {
  return PIECES.find((piece) => piece.id === id);
}

export function shufflePieceOrder(ids = PIECES.map((p) => p.id), random = Math.random) {
  const next = [...ids];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function cellFromPoint(x, y, boardRect) {
  if (!boardRect) return null;
  const { left, top, width, height } = boardRect;
  if (x < left || y < top || x > left + width || y > top + height) return null;
  const col = x < left + width / 2 ? "l" : "r";
  const row = y < top + height / 2 ? "t" : "b";
  return `${row}${col}`;
}

function cellCenter(cell, boardRect) {
  const left = cell.endsWith("l");
  const top = cell.startsWith("t");
  return {
    x: boardRect.left + boardRect.width * (left ? 0.25 : 0.75),
    y: boardRect.top + boardRect.height * (top ? 0.25 : 0.75),
  };
}

export function snapPlacement(placement, pieceId, x, y, boardRect) {
  const piece = pieceById(pieceId);
  if (!piece || !boardRect) return { ...placement };
  const cell = cellFromPoint(x, y, boardRect);
  if (!cell || cell !== piece.cell) return { ...placement };
  const center = cellCenter(cell, boardRect);
  if (Math.hypot(x - center.x, y - center.y) > SNAP_PX) return { ...placement };
  const occupant = Object.entries(placement).find(([, seated]) => seated === cell);
  if (occupant && occupant[0] !== pieceId) return { ...placement };
  return { ...placement, [pieceId]: cell };
}

export function placeOnCell(placement, pieceId, cell) {
  const piece = pieceById(pieceId);
  if (!piece || cell !== piece.cell) return { ...placement };
  const occupant = Object.entries(placement).find(([, seated]) => seated === cell);
  if (occupant && occupant[0] !== pieceId) return { ...placement };
  return { ...placement, [pieceId]: cell };
}

export function isAssembled(placement) {
  return PIECES.every((piece) => placement?.[piece.id] === piece.cell);
}

const MARK_PATH =
  "M38 36h124v32H70v28h52v-16h40v52H70v32h92v32H38V36z";

export function markSvg({ clip = "full", className = "" } = {}) {
  const boxes = {
    full: "0 0 200 200",
    tl: "0 0 100 100",
    tr: "100 0 100 100",
    bl: "0 100 100 100",
    br: "100 100 100 100",
  };
  const viewBox = boxes[clip] || boxes.full;
  return `<svg class="mark-svg ${className}" viewBox="${viewBox}" role="img" aria-hidden="true">
    <rect x="0" y="0" width="200" height="200" fill="#141a2e"/>
    <path fill="#d4a054" d="${MARK_PATH}"/>
  </svg>`;
}

export function pieceMarkup(pieceId, extraClass = "") {
  const piece = pieceById(pieceId);
  const clip = piece?.cell || "full";
  return `<div class="mark-tile ${extraClass}" data-piece="${pieceId}">${markSvg({ clip })}</div>`;
}
