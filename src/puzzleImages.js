/** Original 200×200 scenes for the 2×2 jigsaw. No external assets. */

export const PUZZLE_IMAGES = [
  { id: "station", label: "역 앞" },
  { id: "river", label: "강변" },
  { id: "market", label: "시장" },
  { id: "night", label: "밤거리" },
  { id: "park", label: "공원" },
  { id: "mark", label: "길로 마크" },
];

export function imageById(id) {
  return PUZZLE_IMAGES.find((item) => item.id === id) || PUZZLE_IMAGES[0];
}

export function pickRandomImage(exceptId, random = Math.random) {
  const pool = PUZZLE_IMAGES.filter((item) => item.id !== exceptId);
  const list = pool.length ? pool : PUZZLE_IMAGES;
  return list[Math.floor(random() * list.length)].id;
}

export function puzzleArt(imageId) {
  switch (imageId) {
    case "river":
      return `
        <rect width="200" height="200" fill="#1b3358"/>
        <rect y="0" width="200" height="88" fill="#f4a261"/>
        <circle cx="158" cy="42" r="22" fill="#ffd89a"/>
        <path d="M0 88 Q50 70 100 88 T200 80 L200 200 L0 200 Z" fill="#2a6f97"/>
        <path d="M0 120 Q70 108 140 128 T200 118 L200 200 L0 200 Z" fill="#1d4e6e"/>
        <rect x="18" y="70" width="164" height="10" fill="#e9c46a"/>
        <rect x="22" y="58" width="8" height="28" fill="#264653"/>
        <rect x="170" y="58" width="8" height="28" fill="#264653"/>
        <path d="M40 150 Q80 138 120 152 T190 148" fill="none" stroke="#8ecae6" stroke-width="3"/>
      `;
    case "market":
      return `
        <rect width="200" height="200" fill="#3d1f2b"/>
        <rect y="118" width="200" height="82" fill="#6b3a2a"/>
        <rect x="12" y="90" width="52" height="70" fill="#e76f51"/>
        <polygon points="8,90 38,62 70,90" fill="#f4a261"/>
        <rect x="74" y="84" width="58" height="76" fill="#2a9d8f"/>
        <polygon points="70,84 103,52 136,84" fill="#e9c46a"/>
        <rect x="142" y="96" width="46" height="64" fill="#264653"/>
        <polygon points="138,96 165,70 192,96" fill="#e76f51"/>
        <circle cx="38" cy="48" r="8" fill="#e9c46a"/>
        <circle cx="108" cy="40" r="8" fill="#e76f51"/>
        <circle cx="168" cy="50" r="8" fill="#2a9d8f"/>
        <rect x="0" y="158" width="200" height="42" fill="#1a120c"/>
      `;
    case "night":
      return `
        <rect width="200" height="200" fill="#0b1020"/>
        <circle cx="42" cy="36" r="16" fill="#f3efe4"/>
        <circle cx="80" cy="28" r="2" fill="#f3efe4"/>
        <circle cx="120" cy="48" r="1.5" fill="#f3efe4"/>
        <circle cx="168" cy="22" r="2" fill="#f3efe4"/>
        <rect x="18" y="88" width="44" height="112" fill="#1b2438"/>
        <rect x="72" y="60" width="52" height="140" fill="#243049"/>
        <rect x="134" y="78" width="48" height="122" fill="#1a2238"/>
        <g fill="#d4a054">
          <rect x="26" y="100" width="8" height="10"/>
          <rect x="42" y="118" width="8" height="10"/>
          <rect x="26" y="136" width="8" height="10"/>
          <rect x="84" y="76" width="8" height="10"/>
          <rect x="102" y="96" width="8" height="10"/>
          <rect x="84" y="116" width="8" height="10"/>
          <rect x="144" y="92" width="8" height="10"/>
          <rect x="160" y="112" width="8" height="10"/>
        </g>
        <rect y="188" width="200" height="12" fill="#12182a"/>
      `;
    case "park":
      return `
        <rect width="200" height="200" fill="#7fb069"/>
        <rect y="0" width="200" height="96" fill="#8ecae6"/>
        <circle cx="150" cy="36" r="20" fill="#ffe566"/>
        <circle cx="48" cy="108" r="36" fill="#2d6a4f"/>
        <circle cx="48" cy="92" r="28" fill="#40916c"/>
        <rect x="44" y="128" width="8" height="36" fill="#774936"/>
        <circle cx="132" cy="120" r="40" fill="#1b4332"/>
        <circle cx="132" cy="102" r="30" fill="#2d6a4f"/>
        <rect x="128" y="142" width="8" height="30" fill="#774936"/>
        <path d="M0 168 Q70 148 120 170 T200 160 L200 200 L0 200 Z" fill="#d8f3dc"/>
      `;
    case "mark":
      return `
        <rect width="200" height="200" fill="#141a2e"/>
        <path fill="#d4a054" d="M38 36h124v32H70v28h52v-16h40v52H70v32h92v32H38V36z"/>
      `;
    case "station":
    default:
      return `
        <rect width="200" height="200" fill="#1d3557"/>
        <rect y="128" width="200" height="72" fill="#457b9d"/>
        <rect x="20" y="70" width="160" height="18" fill="#e9c46a"/>
        <rect x="28" y="48" width="12" height="52" fill="#f1faee"/>
        <rect x="160" y="48" width="12" height="52" fill="#f1faee"/>
        <rect x="40" y="92" width="120" height="54" fill="#a8dadc"/>
        <rect x="52" y="104" width="28" height="30" fill="#1d3557"/>
        <rect x="120" y="104" width="28" height="30" fill="#1d3557"/>
        <rect x="0" y="146" width="200" height="10" fill="#e9c46a"/>
        <circle cx="70" cy="172" r="14" fill="#1a1a1a"/>
        <circle cx="130" cy="172" r="14" fill="#1a1a1a"/>
        <rect x="58" y="150" width="84" height="22" fill="#e63946"/>
      `;
  }
}

export function jigsawPath(cell) {
  const paths = {
    tl: "M0,0 H100 V38 C100,38 124,38 124,50 C124,62 100,62 100,62 V100 H62 C62,100 62,124 50,124 C38,124 38,100 38,100 H0 Z",
    tr: "M100,0 H200 V100 H162 C162,100 162,124 150,124 C138,124 138,100 138,100 H100 V62 C100,62 124,62 124,50 C124,38 100,38 100,38 Z",
    bl: "M0,100 H38 C38,100 38,124 50,124 C62,124 62,100 62,100 H100 V138 C100,138 124,138 124,150 C124,162 100,162 100,162 V200 H0 Z",
    br: "M100,100 H138 C138,100 138,124 150,124 C162,124 162,100 162,100 H200 V200 H100 V162 C100,162 124,162 124,150 C124,138 100,138 100,138 Z",
  };
  return paths[cell];
}

export function pieceCrop(cell) {
  const crops = {
    tl: "0 0 126 126",
    tr: "74 0 126 126",
    bl: "0 74 126 126",
    br: "74 74 126 126",
  };
  return crops[cell];
}
