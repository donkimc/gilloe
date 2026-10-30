# Gilloe — 퍼즐 걷기

Korean walking jigsaw. Creators record or draw a pedestrian route. Players visit public stops, collect tiles, and assemble a 3×3 picture. **Not public-play ready.** The banner **현장 검증 전 임시 경로** stays on until a physical survey.

Live prototype: [gilloe.com](https://www.gilloe.com/) (Railway). Source: [github.com/donkimc/gilloe](https://github.com/donkimc/gilloe).

## Setup on a new computer

```bash
git clone https://github.com/donkimc/gilloe.git
cd gilloe
npm install
npm test
npm run dev
```

Vite (`127.0.0.1:5173`) starts the Node API (`8787`) and proxies `/api` and `/uploads`. Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/). Simulator: [http://127.0.0.1:5173/?sim=1](http://127.0.0.1:5173/?sim=1).

Production: `npm run build` then `npm start`. Railway serves the built UI and API from one Node process. Persistent games use `GILLOE_DATA_DIR` (volume `/data`).

Continue in Cursor with the prompt in `CURSOR_PROMPT.md`.

## What this repo does now

| Path | What it is |
| --- | --- |
| Create | GPS recording (2–8 stops), OSM draw with street-following auto-route, GPX import |
| Play | Solo or invite-only two-phone co-op, 9-piece 3×3 jigsaw |
| Maps | Leaflet + OSM tiles; place names and walk graphs via Gilloe `/api/osm/*` (OpenStreetMap `map.json`), not public Nominatim or OSRM |
| Host | Railway (`railway.json`) |

Removed: Naver/Kakao/Google/Apple ingest, media proxy, public OSRM, **AI 경로 초안 가져오기** UI (schema and `docs/AI_ROUTE_JSON_PROMPT.md` remain unused).

Not built: accounts, payments, coupons, tarot, companion characters, analytics.

## Build and test

```bash
npm test
npm run build
npm run preview
```

No linter. GPS and rear camera need a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) (`localhost` or HTTPS). Desktop GPS is often unusable; use manual arrival, **카메라 없이 조각 보기**, or `?sim=1`. Query flags: `gps=denied|unavailable|timeout|inaccurate|good`, `camera=denied|unavailable`, `map=fail`.

**Phone:** USB + Chrome inspect, `adb reverse` so the phone loads `http://localhost:5173`, or a short HTTPS tunnel. Many phones refuse geolocation on a raw LAN IP.

## Architecture

Vanilla Vite + Node. Progress is an explicit state machine in `src/state.js`. Screens render from state.

| Path | Role |
| --- | --- |
| `server/index.js` | Games, uploads, OSM place/walk-route, in-memory parties |
| `server/parties.js` | Invite-only two-player sessions |
| `src/routeSchema.js` | Provenance, GPS sampling, GPX/AI validation, 2–8 stops |
| `src/osmWalkRoute.js` | Pedestrian graph (Dijkstra) + GPS street-gap fill |
| `src/osmPlace.js` | OSM `map.json` fetch used by the server |
| `src/partyLogic.js` / `src/coopPieces.js` | Co-op rules; 8 personal pieces spread across N stops + shared center |
| `src/content.js` | Korean UI copy |
| `src/map.js` | Leaflet + OSM + walker preview |
| `src/assemble.js` | 3×3 snap |
| `src/ui/screens.js` | Screen HTML |
| `src/simulate.js` | `?sim=1` |

GeoJSON order is `[longitude, latitude]`; convert to Leaflet `[lat, lng]` only at the map boundary.

## Create and play rules

- OSM draw: creator sets stop count (2–8), taps stops, names them, then the last stop auto-routes along OSM streets.
- GPS record: default four stops unless asked otherwise. Screen Wake Lock while recording. Gaps ≥ 45 m after pause/screen-off are filled with street vertices (`filled: true`), not a straight line.
- Co-op: invite link or code, two phones, no stranger discovery. Empty stops skip with **다음으로**.
- Camera overlay code exists but is unused. No end-of-game survey.

## Privacy

Player `localStorage` holds schema, game id, screen/stop, pieces, hints, start time, safety flags — **not** lat/lng.

Creator-saved games store GeoJSON on the server. `/api/osm/place` and `/api/osm/walk-route` receive coordinates to query OSM. Co-op checkpoints send `near` / accuracy band, not raw coordinates.

Never log player coordinates to the console. No microphone. No QR, object, or face detection.

## Field verification

Seed Cheonho geometry and OSM drafts are **provisional**. Do not invite outside testers until stops, radii, and the walking line are walked and approved.

## Docs

| File | Use |
| --- | --- |
| `CURSOR_PROMPT.md` | Paste into a new Cursor chat after clone |
| `AGENT.md` | Standing agent rules |
| `BUILT.md` | Current product specification |
| `docs/MVP_MAP_CREATION_COMPLIANCE_PLAN.md` | Map sources (no proprietary ingest) |
| `docs/TWO_PLAYER_NEARBY_COOP_PLAN.md` | Invite-only co-op |
| `docs/AI_ROUTE_JSON_PROMPT.md` | Unused AI JSON schema (UI removed) |
| `docs/GILLOE_SAFETY_SECURITY_RISK_GUIDE.md` | Safety reference |
| `docs/GILLOE_MVP_01_CHEONHO_MURDER_MYSTERY_PLAN.md` | Historical; crime framing was dropped |
| `docs/GILLOE_COMPLETE_PROJECT_GUIDE.md` | Early strategy; not the live MVP |

## Known limitations

- OSM tiles need a network. Text directions remain if the map fails.
- Refresh restores the last screen, not a live GPS fix.
- Co-op parties are in-memory (lost on server restart).
- Reduced-motion disables decorative motion.
- GPS street-fill still needs a real phone screen-off test.

## Deploy

Railway project `gilloe`, production environment. `railway.json` builds with `npm run build` and starts `node server/index.js`. Health check: `GET /api/games`.
