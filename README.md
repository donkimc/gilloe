# Gilloe MVP 01 — 천호 19:42 — 마지막 봉투

Disposable **field-test prototype** of one Korean walking mystery. It is **not** public-play ready and **not** production-ready. Stop coordinates, pedestrian geometry, arrival radii, and camera framing are **provisional** (`fieldVerified: false`). The UI always shows **현장 검증 전 임시 경로**.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:5173` on the same computer. For a two-player pass-the-phone rehearsal, use a narrow mobile viewport.

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
| `src/content.js` | Korean copy, suspects, puzzles, answers, hints, overlay placement, stop data |
| `public/route.geojson` | Walking line (`[lng, lat]`), labelled unverified |
| `src/state.js` | State machine |
| `src/storage.js` | Minimal `localStorage` progress |
| `src/geo.js` | Haversine + accuracy-aware arrival |
| `src/location.js` | Geolocation watcher (no coordinate persistence) |
| `src/camera.js` | `getUserMedia` video only; `stop()` ends tracks |
| `src/map.js` | Leaflet 1.9 + OSM tiles |
| `src/puzzles.js` | Answer checking |
| `src/ui/screens.js` | Screen HTML |
| `src/simulate.js` | Injected GPS/camera/map states for tests and `?sim=1` |

## Content and route editing

1. Edit story, answers, radii, and overlay placement in `src/content.js`.
2. Replace `coordinates` on each stop after a physical survey. Keep `fieldVerified: false` until that survey is done.
3. Replace `public/route.geojson` with a pedestrian line. GeoJSON order is `[longitude, latitude]`.
4. Camera framing copy lives under `stops[1].cameraClue`. Do not point it at people or private interiors.

## Privacy behaviour

Persisted keys: schema version, game id, mode, screen/stop, solved puzzles, camera-clue / fallback flags, hint flags, start time, duo phase, safety/location-asked flags.

**Never stored or transmitted:** coordinates, location history, accuracy samples, camera frames, photos, audio, video, names, emails, device ids.

Location is requested only after **내 위치 찾기**. Camera starts only after **카메라 단서 찾기**. No microphone. No QR, object, or face detection. Feedback can be downloaded as JSON locally; there is no submit endpoint.

Camera tracks stop on collect, skip, error, screen change, overlay, page hide, reset, and completion.

## Field-verification status

| Item | Status |
| --- | --- |
| Cheonho Station Exit 5 standing point | Provisional map point only |
| Rodeo Street stop | Provisional |
| Stationery/Toy Street area stop | Provisional |
| Naengmyeon Street area stop | Provisional |
| Pedestrian GeoJSON | Prototype line, not a walked path |
| 60 m radius / 80 m accuracy ceiling | Starting values only |
| Stop 2 camera anchor and facing direction | Placeholder copy; not night-checked |

Do not invite outside testers until these are walked and approved.

## Known limitations

- Desktop browsers often have no usable GPS or rear camera; use manual arrival and **카메라 없이 단서 보기**, or `?sim=1`.
- OSM tiles need a network. Text directions remain if the map fails.
- Refresh restores the last screen, not a live GPS fix.
- Two-player mode is one shared phone; no networking.
- Reduced-motion disables decorative motion via CSS.

## Test results (local)

See the implementation report in the conversation that added this prototype. Re-run `npm test` and `npm run build` after content or logic edits.
