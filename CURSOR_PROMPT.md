# Cursor prompt — continue Gilloe on a new computer

Clone [https://github.com/donkimc/gilloe](https://github.com/donkimc/gilloe), open the folder in Cursor, then paste everything below the divider into Agent mode.

---

You are continuing **Gilloe**, a Korean walking-jigsaw web app (Vite, vanilla JS, Leaflet, Node). Production is https://www.gilloe.com/ on Railway. Repo: https://github.com/donkimc/gilloe

## First steps

1. `npm install`, `npm test`, `npm run build`. Fix anything that fails.
2. Read `README.md`, `AGENT.md`, `BUILT.md`, then `docs/MVP_MAP_CREATION_COMPLIANCE_PLAN.md` and `docs/TWO_PLAYER_NEARBY_COOP_PLAN.md`.
3. Treat `BUILT.md` as the current spec. Older docs that describe a Cheonho murder mystery, Seongsu marketplace, four-tile 2×2 board, shared-phone-only two-player, public OSRM, or **AI 경로 초안 가져오기** are outdated unless they are marked historical.

## Product you must preserve

- Create: GPS walk (default 4 stops), OSM draw (2–8 stops, auto street route after last named stop), GPX import.
- Play: 9-piece 3×3 jigsaw. Solo or invite-only two-phone co-op. Empty co-op stops: **다음으로**.
- Maps: Leaflet OSM tiles. Place names and pedestrian routing only via Gilloe `GET /api/osm/place` and `POST /api/osm/walk-route` (server uses OpenStreetMap `map.json` + local Dijkstra). No public Nominatim, no public OSRM, no Naver/Kakao/Google/Apple ingest or image proxy.
- GPS recording: reject short-dt jumps; fill gaps ≥ 45 m with OSM street vertices (`fillGpsPointsWithStreets`, `filled: true`); Screen Wake Lock while recording.
- Player copy in Korean. Banner **현장 검증 전 임시 경로** while unverified.
- No accounts, payments, analytics, QR, AR, or camera capture. Camera overlay code may exist unused.

## Stack

Do not add React/Vue/Svelte/Next, a database, or a mapping SDK. Keep GeoJSON `[lng, lat]`. Persist player progress without coordinates. Co-op parties are in-memory.

## How to run

```bash
npm run dev          # http://127.0.0.1:5173/  API on 8787
npm test
npm run build && npm start
```

Simulator: `http://127.0.0.1:5173/?sim=1`

## Git and deploy

Commit/push only if I ask. Remote is `origin` → `github.com/donkimc/gilloe.git`, branch `main`. Railway uses `railway.json` (`npm run build`, `node server/index.js`, health `/api/games`, data dir `GILLOE_DATA_DIR`).

## When I give a task

Inspect the repo, change the smallest set of files, add tests for breakable logic, run `npm test` and `npm run build`, update README/BUILT/AGENT if behavior changed. Do not claim field-verified GPS/camera without a real phone. Do not invite public testers.

If I ask for points, coupons, Pokémon-like companions, or 13 Tarot rewards: design first, do not implement until I say so. Those ideas are not in this codebase.

Start by confirming tests pass and summarizing current create + play flows in a few sentences. Then wait for my next task.

---
