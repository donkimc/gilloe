# Gilloe — current product specification

**Status:** Working prototype on Railway ([gilloe.com](https://www.gilloe.com/)). Field verification of seed/OSM routes is incomplete. Co-op needs two-phone field testing. GPS street-fill needs a real screen-off phone test.

If this file conflicts with `docs/MVP_MAP_CREATION_COMPLIANCE_PLAN.md` on map sources, follow the compliance plan. Crime-mystery copy in older docs is not the product.

## Product

Korean-language, mobile-first walking jigsaw.

- **Create:** GPS recording, OSM-assisted drawing with street auto-route, creator GPX import.
- **Play:** pick a saved game, walk public stops, collect tiles, assemble a 3×3 picture.
- **Modes:** solo, or invite-only two phones (`두 명이 함께 걷기`).
- **Stops:** OSM draw 2–8 (creator-set). GPS create defaults to 4.
- **Puzzle:** always 9 pieces. Solo collects two tiles per stop on a 4-stop game; co-op spreads 8 personal tiles across N stops plus a shared center.
- **Camera overlay:** unused. Static fallback copy may remain.
- **AI route JSON UI:** removed. `docs/AI_ROUTE_JSON_PROMPT.md` is archival.

Creators must not paste Naver/Kakao/Google/Apple URLs. OSM drafts stay `fieldVerified: false` until walked. GPS recordings are field-observed tracks but still need the safety checklist before outside testers.

## Stack

Vite, vanilla ES modules, Leaflet 1.9, OSM tiles, Node `server/index.js`, Vitest, Railway.

Do not add a SPA framework, database, auth, analytics, or a mapping SDK replacement.

## Expected layout

```text
/
├── index.html
├── package.json
├── vite.config.js          # spawns API in `npm run dev`, proxies /api
├── railway.json
├── README.md
├── AGENT.md
├── BUILT.md
├── CURSOR_PROMPT.md
├── docs/
├── public/
├── server/
│   ├── index.js
│   ├── parties.js
│   ├── gameLogic.js
│   └── data/               # local games + uploads; Railway uses GILLOE_DATA_DIR
└── src/
    ├── main.js
    ├── state.js
    ├── content.js
    ├── routeSchema.js
    ├── osmWalkRoute.js
    ├── osmPlace.js
    ├── partyLogic.js
    ├── coopPieces.js
    ├── assemble.js
    ├── map.js
    ├── location.js
    └── ui/screens.js
```

## Creation

### GPS

Start / pause / resume / add stop / finish. Sample with accuracy and jump rejection. Wake Lock while recording. After large time gaps (screen off), stitch with `fillGpsPointsWithStreets` (insert OSM vertices, mark `filled: true`). Provenance `creator-gps-recording`.

### OSM draw

Set stop count 2–8. Tap stops. Popup: original name + description, then confirm. After the last stop, `POST /api/osm/walk-route` builds a pedestrian line on OSM ways. Attribution `© OpenStreetMap contributors`, licence ODbL, method `openstreetmap-assisted-drawing`, `fieldVerified: false`.

Place label at a tap uses `GET /api/osm/place`. No public Nominatim.

### GPX

Parse locally/on-server. Method `creator-gpx-import`. Creator confirms ownership.

## Play

State machine (variable stop count):

```text
cover → library / create
→ mode (solo | coop lobby)
→ safety → briefing → route-overview
→ navigating-stop-N → piece-stop-N (repeat)
→ assemble → resolution
```

Co-op: host creates party + code/link; guest joins; both ready near stop 1 (or manual confirm). Server is in-memory. Checkpoints send `near` + accuracy band, not lat/lng. `piecesForStop(stop, role, stopCount)` assigns A/B tiles. After both complete, unlock `piece-5` (center).

Arrival: Haversine within `arrivalRadiusMeters` and accuracy ceiling; otherwise confirmed **직접 도착 확인**.

## Map and GPS (player)

Leaflet OSM tiles, full LineString, numbered stops, live position + accuracy circle, approximate distance. States: locating, good, low accuracy, denied, unavailable, timeout. `invalidateSize()` when shown. Text directions if tiles fail.

Ask location only after safety + **내 위치 찾기**. `watchPosition` on navigation screens. Stop on complete, reset, exit, hide.

## Privacy and safety

- No player coordinate history in `localStorage`.
- No camera frames, mic, QR, or face/object detection.
- Public sidewalks only; no purchase or staff interaction required.
- Visible exit on route screens.
- Label as a game, not a real errand.

## Verification before calling work done

`npm test`, `npm run build`, solo complete, co-op lobby on two browsers if possible, OSM auto-route follows streets, GPS fill inserts `filled` vertices on large gaps, 360×800 layout, reduced motion. Say so if a real phone was not used.
