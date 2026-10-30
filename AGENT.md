# Cursor Agent Instructions — Gilloe

## Mission

Maintain the Gilloe walking-puzzle prototype: creator GPS / OSM street draw / GPX, solo play, invite-only two-phone co-op, 3×3 jigsaw. Production is [gilloe.com](https://www.gilloe.com/). Do not restore Naver/Kakao/Google/Apple ingest, media proxying, public Nominatim, or public OSRM.

## Read first

1. `README.md`
2. `BUILT.md`
3. `docs/MVP_MAP_CREATION_COMPLIANCE_PLAN.md`
4. `docs/TWO_PLAYER_NEARBY_COOP_PLAN.md`
5. `docs/GILLOE_SAFETY_SECURITY_RISK_GUIDE.md`

`docs/GILLOE_MVP_01_CHEONHO_MURDER_MYSTERY_PLAN.md` and `docs/GILLOE_COMPLETE_PROJECT_GUIDE.md` are historical. Crime framing is dropped. Do not rebuild murder-mystery or Seongsu marketplace features unless asked.

## Do not add unless asked

Accounts, payments, coupons, tarot, companion characters, analytics, QR, AR, object/face recognition, photo capture, public AI route-import UI, React/Vue/Svelte/Next.

## Implementation rules

- Vite, vanilla HTML/CSS/JS modules, Leaflet 1.9, OSM raster tiles with visible attribution.
- Player-facing copy in Korean.
- Game state independent of the DOM (`src/state.js`).
- GeoJSON `[longitude, latitude]`; Leaflet `[latitude, longitude]` only at the map boundary.
- OSM place names and walk graphs only through Gilloe `GET /api/osm/place` and `POST /api/osm/walk-route` (server uses `api.openstreetmap.org` map.json).
- OSM draw: creator-set stop count 2–8 (`MIN_STOP_COUNT` / `MAX_STOP_COUNT`). After the last named stop, auto-draw along OSM pedestrian ways (consecutive original nodes only; do not skip missing nodes).
- GPS create stays 4 stops unless the user asks otherwise. Fill gaps ≥ `GPS_STREET_GAP_M` (45) with street vertices; do not accept short-dt teleport jumps. Optional Screen Wake Lock while recording.
- Co-op is always offered. Distribute 8 personal pieces across `party.stopCount` (2–8); empty stops use **다음으로**. Shared center piece after both finish. Invite-only; no stranger discovery; do not persist raw player coordinates.
- 9-piece 3×3 assemble for solo and co-op.
- Keep the **현장 검증 전 임시 경로** banner while `fieldVerified` is false.
- No public OSRM/Nominatim. AI JSON import UI is removed; do not resurrect it unless asked.

## Location and safety

- Location only after a gesture and the safety notice.
- Arrival: radius + accuracy ceiling; confirmed manual fallback when GPS fails.
- Stop watchers on complete, reset, exit, and page hide where practical.
- Do not console-log exact player coordinates.
- No stop may require entry, purchase, employees, or private property.
- Tell players to stop walking before reading or using the camera.
- Do not call the route public-test ready without a physical walk.

## Storage

Persist schema version, game id, mode, screen/stop, pieces, hint flags, start time, safety/location-asked flags. Creator games on disk include GeoJSON. Player progress must not store lat/lng.

## Testing

After meaningful changes: `npm test` and `npm run build`. Cover Haversine, arrival, OSM walk graph, GPS street fill, party `stopCount` / piece buckets, assemble, storage migration.

Do not describe the prototype as production-ready. Do not claim GPS/camera/field success without a real-device or field test.

## Git

Commit and push only when the user asks. Do not add `captures/`, `design-preview.png`, Questory plans, or unrelated reports.
