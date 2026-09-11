import { imageById, puzzleArt, PUZZLE_IMAGES } from "./puzzleImages.js";

export { imageById, pickRandomImage, PUZZLE_IMAGES } from "./puzzleImages.js";

export const SNAP_PX = 44;

export function gridSizeForCount(placeCount) {
  const n = Math.sqrt(placeCount);
  return Number.isInteger(n) ? n : 2;
}

export function piecesForGrid(n) {
  const pieces = [];
  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) {
      const order = row * n + col + 1;
      pieces.push({ id: `piece-${order}`, cell: `r${row}c${col}`, row, col, order });
    }
  }
  return pieces;
}

export function emptyPlacement(n = 2) {
  const out = {};
  for (const piece of piecesForGrid(n)) out[piece.id] = null;
  return out;
}

export function pieceById(id, n = 2) {
  return piecesForGrid(n).find((piece) => piece.id === id);
}

export function shufflePieceOrder(ids, random = Math.random) {
  const next = [...ids];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function eastIsTab(row, col) {
  return (row + col) % 2 === 0;
}

function southIsTab(row, col) {
  return (row + col) % 2 === 0;
}

/** Clockwise path for one cell in a 100-unit grid. */
export function jigsawCellPath(row, col, n) {
  const s = 100;
  const tab = 18;
  const x0 = col * s;
  const y0 = row * s;
  const x1 = x0 + s;
  const y1 = y0 + s;
  const mx = x0 + s / 2;
  const my = y0 + s / 2;
  const parts = [`M${x0},${y0}`];

  if (row === 0) {
    parts.push(`H${x1}`);
  } else if (southIsTab(row - 1, col)) {
    parts.push(`H${mx - 16}`, `C${mx - 16},${y0 - tab} ${mx + 16},${y0 - tab} ${mx + 16},${y0}`, `H${x1}`);
  } else {
    parts.push(`H${mx - 16}`, `C${mx - 16},${y0 + tab} ${mx + 16},${y0 + tab} ${mx + 16},${y0}`, `H${x1}`);
  }

  if (col === n - 1) {
    parts.push(`V${y1}`);
  } else if (eastIsTab(row, col)) {
    parts.push(`V${my - 16}`, `C${x1 + tab},${my - 16} ${x1 + tab},${my + 16} ${x1},${my + 16}`, `V${y1}`);
  } else {
    parts.push(`V${my - 16}`, `C${x1 - tab},${my - 16} ${x1 - tab},${my + 16} ${x1},${my + 16}`, `V${y1}`);
  }

  if (row === n - 1) {
    parts.push(`H${x0}`);
  } else if (southIsTab(row, col)) {
    parts.push(`H${mx + 16}`, `C${mx + 16},${y1 + tab} ${mx - 16},${y1 + tab} ${mx - 16},${y1}`, `H${x0}`);
  } else {
    parts.push(`H${mx + 16}`, `C${mx + 16},${y1 - tab} ${mx - 16},${y1 - tab} ${mx - 16},${y1}`, `H${x0}`);
  }

  if (col === 0) {
    parts.push(`V${y0}`, "Z");
  } else if (eastIsTab(row, col - 1)) {
    parts.push(`V${my + 16}`, `C${x0 + tab},${my + 16} ${x0 + tab},${my - 16} ${x0},${my - 16}`, `V${y0}`, "Z");
  } else {
    parts.push(`V${my + 16}`, `C${x0 - tab},${my + 16} ${x0 - tab},${my - 16} ${x0},${my - 16}`, `V${y0}`, "Z");
  }
  return parts.join(" ");
}

export function jigsawPath(cell, n = 2) {
  const match = String(cell).match(/^r(\d+)c(\d+)$/);
  if (match) return jigsawCellPath(Number(match[1]), Number(match[2]), n);
  const legacy = { tl: [0, 0], tr: [0, 1], bl: [1, 0], br: [1, 1] };
  const rc = legacy[cell];
  if (!rc) return "";
  return jigsawCellPath(rc[0], rc[1], 2);
}

export function pieceCropBox(row, col, n) {
  const pad = 20;
  const x = col * 100 - pad;
  const y = row * 100 - pad;
  return `${x} ${y} ${100 + pad * 2} ${100 + pad * 2}`;
}

export function cellFromPoint(x, y, boardRect, n = 2) {
  if (!boardRect) return null;
  const { left, top, width, height } = boardRect;
  if (x < left || y < top || x > left + width || y > top + height) return null;
  const col = Math.min(n - 1, Math.max(0, Math.floor(((x - left) / width) * n)));
  const row = Math.min(n - 1, Math.max(0, Math.floor(((y - top) / height) * n)));
  return `r${row}c${col}`;
}

function cellCenter(cell, boardRect, n) {
  const [, rs, cs] = cell.match(/^r(\d+)c(\d+)$/) || [];
  const row = Number(rs);
  const col = Number(cs);
  return {
    x: boardRect.left + ((col + 0.5) / n) * boardRect.width,
    y: boardRect.top + ((row + 0.5) / n) * boardRect.height,
  };
}

export function snapPlacement(placement, pieceId, x, y, boardRect, n = 2) {
  const piece = pieceById(pieceId, n);
  if (!piece || !boardRect) return { ...placement };
  const cell = cellFromPoint(x, y, boardRect, n);
  if (!cell || cell !== piece.cell) return { ...placement };
  const center = cellCenter(cell, boardRect, n);
  const limit = Math.max(24, SNAP_PX * (2 / n));
  if (Math.hypot(x - center.x, y - center.y) > limit) return { ...placement };
  const occupant = Object.entries(placement).find(([, seated]) => seated === cell);
  if (occupant && occupant[0] !== pieceId) return { ...placement };
  return { ...placement, [pieceId]: cell };
}

export function placeOnCell(placement, pieceId, cell, n = 2) {
  const piece = pieceById(pieceId, n);
  if (!piece || cell !== piece.cell) return { ...placement };
  const occupant = Object.entries(placement).find(([, seated]) => seated === cell);
  if (occupant && occupant[0] !== pieceId) return { ...placement };
  return { ...placement, [pieceId]: cell };
}

export function isAssembled(placement, n = 2) {
  return piecesForGrid(n).every((piece) => placement?.[piece.id] === piece.cell);
}

function artInner(jigsaw, n) {
  const size = n * 100;
  if (jigsaw?.imageUrl) {
    return `<image href="${escapeAttr(jigsaw.imageUrl)}" x="0" y="0" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice"/>`;
  }
  const id = jigsaw?.systemImageId || PUZZLE_IMAGES[0].id;
  const scale = size / 200;
  return `<g transform="scale(${scale})">${puzzleArt(imageById(id).id)}</g>`;
}

function escapeAttr(value) {
  return String(value).replace(/"/g, "&quot;");
}

export function puzzleSvg({ jigsaw, clip = "full", crop = false, className = "", n = 2 } = {}) {
  const size = n * 100;
  const art = artInner(jigsaw, n);
  if (clip === "full") {
    return `<svg class="mark-svg ${className}" viewBox="0 0 ${size} ${size}" role="img" aria-hidden="true">${art}</svg>`;
  }
  const piece = typeof clip === "string" && clip.startsWith("r") ? pieceByIdFromCell(clip, n) : pieceById(clip, n);
  const row = piece?.row ?? 0;
  const col = piece?.col ?? 0;
  const cell = piece?.cell || `r${row}c${col}`;
  const d = jigsawCellPath(row, col, n);
  const clipId = `jigsaw-${n}-${cell}-${crop ? "c" : "b"}-${String(className).replace(/\s+/g, "")}`;
  const viewBox = crop ? pieceCropBox(row, col, n) : `0 0 ${size} ${size}`;
  return `<svg class="mark-svg mark-svg--jigsaw ${className}" viewBox="${viewBox}" role="img" aria-hidden="true">
    <defs><clipPath id="${clipId}"><path d="${d}"/></clipPath></defs>
    <g clip-path="url(#${clipId})">${art}</g>
    <path d="${d}" fill="none" stroke="#f3efe4" stroke-width="${Math.max(1.5, 3 * (2 / n))}"/>
  </svg>`;
}

function pieceByIdFromCell(cell, n) {
  return piecesForGrid(n).find((p) => p.cell === cell);
}

export function markSvg({ clip = "full", className = "", jigsaw, n = 2 } = {}) {
  return puzzleSvg({ jigsaw, clip, crop: clip !== "full", className, n });
}

export function pieceMarkup(pieceId, extraClass = "", jigsaw, n = 2) {
  const crop = !extraClass.includes("mark-tile--seated");
  return `<div class="mark-tile ${extraClass}" data-piece="${pieceId}">${puzzleSvg({
    jigsaw,
    clip: pieceId,
    crop,
    className: extraClass,
    n,
  })}</div>`;
}

export function outlinePreview(n = 2) {
  const size = n * 100;
  const paths = piecesForGrid(n)
    .map((p) => `<path d="${jigsawCellPath(p.row, p.col, n)}" fill="#141a2e" stroke="#d4a054" stroke-width="2"/>`)
    .join("");
  return `<svg class="mark-svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="조각 미리보기">${paths}</svg>`;
}

export const CELLS = ["r0c0", "r0c1", "r1c0", "r1c1"];
export const PIECES = piecesForGrid(2);
