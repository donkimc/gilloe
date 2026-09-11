# Gilloe — 퍼즐 걷기

Prototype for **creating** and **playing** walking jigsaws. Paste Naver Map URLs (4 / 9 / 16 / 25 stops). It is **not** public-play ready. The banner **현장 검증 전 임시 경로** stays on.

## Setup

```bash
npm install
npm run dev
```

Vite (5173) proxies `/api` to the local Node server (8787). Open `http://127.0.0.1:5173/`. Simulator: `http://127.0.0.1:5173/?sim=1`.

## Build and test

```bash
npm test
npm run build
npm run preview
```

There is no linter configured.

## Secure-context phone testing

GPS and the rear camera only work in a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts): `localhost` or HTTPS.

Practical options (no hosted production environment is included):

1. **USB + Chrome inspect** — run `npm run dev` on a computer, open `http://<lan-ip>:5173` on the phone **only if the browser treats it as a secure context**. Many phones will **not** grant geolocation/camera on a raw LAN IP.
2. **`localhost` via reverse tether / `adb reverse`** (Android) so the phone loads `http://localhost:5173`.
3. A **temporary HTTPS tunnel** you already trust (for example a local `vite` HTTPS plugin or a short-lived tunnel). Do not add accounts, analytics, or a Gilloe server.

Until you complete that phone pass, treat real GPS and camera behaviour as **unverified**.

Prototype simulator (injected device states, not a field test):

`http://localhost:5173/?sim=1`

Optional query flags: `gps=denied|unavailable|timeout|inaccurate|good`, `camera=denied|unavailable`, `map=fail`.

## Permission reset

- **iOS Safari:** Settings → Safari → Camera / Location, or Site Settings for `localhost`.
- **Chrome (Android or desktop):** Site settings → reset Camera and Location for the origin, or lock icon → Permissions.
- **Desktop Chrome:** `chrome://settings/content/all` → remove the origin.

## Architecture

Vanilla Vite app. Game progress is an explicit state machine in `src/state.js`. Screens render from that state; they do not own progress.

| Path | Role |
| --- | --- |
| `server/index.js` | Games API, Naver URL resolve, OSRM line, uploads |
| `src/content.js` | Korean UI copy |
| `src/state.js` | State machine |
| `src/storage.js` | Minimal `localStorage` progress (no coordinates) |
| `src/geo.js` | Haversine, arrival, route preview helpers |
| `src/location.js` | Geolocation watcher |
| `src/map.js` | Leaflet + OSM + walker preview |
| `src/assemble.js` | NxN jigsaw snap |
| `src/ui/screens.js` | Screen HTML |
| `src/simulate.js` | `?sim=1` GPS/map fakes |

Camera overlay code remains in the repo but is not used in this flow. There is no end-of-game survey.

Progress stores only schema, game id, screen/stop, collected pieces, hints, start time, safety/location-asked flags — never lat/lng.

## Content and route editing

1. Edit copy, radii, and overlay placement in `src/content.js`.
2. Replace `coordinates` on each stop after a physical survey. Keep `fieldVerified: false` until that survey is done.
3. Replace `public/route.geojson` with a pedestrian line along streets, not a straight line between pins. GeoJSON order is `[longitude, latitude]`. The current file is an OpenStreetMap foot route (FOSSGIS OSRM), still unverified on site.
4. Camera framing copy lives under `stops[1].cameraClue`. Do not point it at people or private interiors.

## Privacy behaviour

Persisted keys: schema version, game id, mode, screen/stop, collected pieces, camera-clue / fallback flags, hint flags, start time, safety/location-asked flags.

**Never stored or transmitted:** coordinates, location history, accuracy samples, camera frames, photos, audio, video, names, emails, device ids.

Location is requested only after **내 위치 찾기**. Camera starts only after **카메라로 조각 찾기**. No microphone. No QR, object, or face detection. Feedback can be downloaded as JSON locally; there is no submit endpoint.

Camera tracks stop on collect, skip, error, screen change, overlay, page hide, reset, and completion.

## Field-verification status

| Item | Status |
| --- | --- |
| Cheonho Station Exit 5 standing point | Provisional map point only |
| Rodeo Street stop | Provisional |
| Stationery/Toy Street area stop | Provisional |
| Naengmyeon Street area stop | Provisional |
| Pedestrian GeoJSON | OSM foot route along streets; not a walked field survey |
| 60 m radius / 80 m accuracy ceiling | Starting values only |
| Stop 2 camera anchor and facing direction | Placeholder copy; not night-checked |

Do not invite outside testers until these are walked and approved.

## Known limitations

- Desktop browsers often have no usable GPS or rear camera; use manual arrival and **카메라 없이 조각 보기**, or `?sim=1`.
- OSM tiles need a network. Text directions remain if the map fails.
- Refresh restores the last screen, not a live GPS fix.
- Two-player mode is one shared phone; no networking.
- Reduced-motion disables decorative motion via CSS.

## Test results (local)

See the implementation report in the conversation that added this prototype. Re-run `npm test` and `npm run build` after content or logic edits.
