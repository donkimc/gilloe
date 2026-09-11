# Gilloe MVP 01 — Build Specification

## Build status

This repository currently contains planning documents. Build the first disposable experience prototype described here. The prototype is for field testing and learning; it is not a reusable marketplace or production platform.

Read these documents before changing code:

1. `BUILT.md` — implementation source of truth
2. `AGENT.md` — working rules for the coding agent
3. `docs/GILLOE_MVP_01_CHEONHO_MURDER_MYSTERY_PLAN.md` — experience, story, route, safety, and test rationale
4. `docs/GILLOE_SAFETY_SECURITY_RISK_GUIDE.md` — broader safety reference

If the documents conflict, follow `BUILT.md` for this prototype and preserve the safety constraints from the MVP plan.

## Product to build

Build one Korean-language, mobile-first walking mystery:

- **Title:** 천호 19:42 — 마지막 봉투
- **Brand:** Gilloe
- **Area:** Cheonho-dong, Gangdong-gu, Seoul
- **Genre:** fictional, non-graphic murder mystery
- **Target duration:** 25–35 minutes
- **Route:** one fixed pedestrian route with four stops
- **Players:** solo or two people sharing one phone
- **Difficulty:** easy
- **Delivery:** static mobile web app
- **Data:** no account, backend, payment, or server database

The experience must use browser GPS to show the player's live location and help determine arrival. At selected stops, it must use the rear camera to show a deterministic clue overlay on the live view. There are no QR codes, installed markers, image recognition, object recognition, facial recognition, photo capture, or video recording.

## Experience principles

1. The player always knows the current destination and next action.
2. Story screens assume the player has stopped walking.
3. Every puzzle has one clear answer, one hint, and a recovery path.
4. GPS and camera enhance the game but permission denial never blocks completion.
5. Real streets create atmosphere only. No real person, business, or building is described as part of the crime.
6. The interface should feel like a case file laid over a night street map: suspenseful, legible, restrained, and non-graphic.

## Technical stack

Use:

- Vite
- Vanilla HTML, CSS, and JavaScript using ES modules
- Leaflet 1.9
- OpenStreetMap raster tiles with visible attribution
- Static GeoJSON for the route
- Browser Geolocation API
- `navigator.mediaDevices.getUserMedia` for the rear camera
- `localStorage` for small progress state only
- Vitest only if a small pure-logic test suite materially protects state, distance, or answer checking

Do not add React, Vue, Svelte, Next.js, a backend, an AR framework, a database, authentication, a CMS, analytics SDKs, or a large state-management library.

GPS and camera require a secure context. They should work on `localhost` during development and HTTPS during phone testing. Document a practical HTTPS phone-testing method in the README without adding a hosted production environment.

## Expected project structure

Cursor may adjust filenames when there is a clear reason, but preserve the separation of content, state, device services, and rendering.

```text
/
├── index.html
├── package.json
├── vite.config.js
├── README.md
├── BUILT.md
├── AGENT.md
├── public/
│   ├── route.geojson
│   └── assets/
│       ├── evidence/
│       └── overlays/
└── src/
    ├── main.js
    ├── styles.css
    ├── content.js
    ├── state.js
    ├── router.js
    ├── map.js
    ├── location.js
    ├── camera.js
    ├── storage.js
    ├── puzzles.js
    └── ui/
        ├── screens.js
        └── components.js
```

## Game state

Use a small explicit state machine. A suggested sequence is:

```text
cover
→ mode
→ safety
→ briefing
→ route-overview
→ navigating-stop-1
→ clue-stop-1
→ puzzle-stop-1
→ navigating-stop-2
→ camera-stop-2
→ clue-stop-2
→ puzzle-stop-2
→ navigating-stop-3
→ clue-stop-3
→ puzzle-stop-3
→ navigating-stop-4
→ clue-stop-4
→ accusation
→ resolution
→ feedback
```

Represent progress as serializable data. Do not infer progress from DOM elements.

Persist only:

- schema version
- game ID
- selected player mode
- current state and stop
- solved puzzle IDs
- collected camera clue IDs
- hint-use flags
- start timestamp

Never persist coordinates, location samples, location accuracy, camera frames, images, or video. Offer **처음부터 다시 시작** and clear only this game's stored progress.

## Game content

Keep all revisable copy and answers in `src/content.js` or a single equivalent data module. UI code must not contain scattered story text.

### Case

Fictional puzzle designer Han Seong-jun is found dead at 8:05 p.m. after discovering missing funds from a fictional neighborhood puzzle event. The player reconstructs the period from 7:31 to 7:45.

### Suspects

| Suspect | Relationship | Claim | Cue |
| --- | --- | --- | --- |
| Kang Min-jae | business partner | left at 7:20 and entered the station before 7:30 | navy umbrella |
| Seo Yu-na | event illustrator | delivered a blue envelope at 7:31 and left | yellow umbrella |
| Lee Do-yun | courier and old friend | arrived at 7:45 and found the door locked | red cap |

### Solution

Kang Min-jae diverted event funds and killed Seong-jun after being confronted. A 7:38 reflection of Min-jae's navy umbrella contradicts his station alibi. The appointment page and ledger support the conclusion.

### Four stops

1. **Appointment page:** match Y, M, and D to the suspects and reveal Min-jae's 7:38 appointment.
2. **Camera reflection:** near a field-approved public anchor, open the camera and collect the 7:38 navy-umbrella overlay. Then identify the umbrella in a fictional evidence image.
3. **Timeline:** arrange Yu-na at 7:32, Min-jae at 7:38, and Do-yun at 7:45.
4. **Ledger and accusation:** select murderer, motive, and decisive alibi-breaking evidence.

Write final player-facing prose in natural, concise Korean. Internal identifiers and code may be English. Each scene should be short enough to read while standing outdoors. Keep the content non-graphic.

## Route data

The planned corridor is:

**Cheonho Station Exit 5 → Cheonho Rodeo Street → Stationery and Toy Street area → Naengmyeon Street area**

Final stop coordinates and pedestrian route geometry require a physical field survey. Do not present guessed coordinates as approved route data.

Until verified coordinates are supplied:

- create a clearly labelled `route.geojson` prototype route only if coordinates can be taken from an existing reviewed local source;
- mark every provisional coordinate with `fieldVerified: false` in content data;
- show a development-only banner stating `현장 검증 전 임시 경로`;
- keep all radii and coordinate values in data, not UI code;
- do not describe the build as ready for public play.

Each stop definition needs:

```js
{
  id: 'stop-2',
  order: 2,
  title: '...',
  coordinates: { lat: 0, lng: 0 },
  fieldVerified: false,
  arrivalRadiusMeters: 60,
  directions: '...',
  safeStandingNote: '...',
  fallbackDirections: '...',
  cameraClue: { /* optional */ }
}
```

The initial 60 m arrival radius is a field-test starting value, not a fixed product rule. Tune it after observing GPS accuracy at the actual stop.

## Map behavior

The map must:

- initialize through Leaflet without a paid key;
- show OSM attribution at all times;
- render the complete GeoJSON walking line;
- show four numbered stops;
- fit the full route on the overview screen;
- emphasize only the active destination during navigation;
- show the player's latest position and an accuracy circle after permission is granted;
- show straight-line distance to the active stop, labelled as approximate;
- distinguish `locating`, `good`, `low accuracy`, `denied`, `unavailable`, and `timed out` states;
- offer an external walking-directions link as optional help;
- call `invalidateSize()` after the map becomes visible;
- keep story and puzzle progress usable if map tiles fail.

GeoJSON stores coordinates as `[longitude, latitude]`. Convert to Leaflet's `[latitude, longitude]` only at the integration boundary.

## GPS behavior

Ask for location permission only after the player accepts the safety screen and taps a clear button such as **내 위치 찾기**. Do not request permission on page load.

Use `watchPosition` while the player is on route and navigation screens. Suggested starting options:

```js
{
  enableHighAccuracy: true,
  maximumAge: 5000,
  timeout: 12000
}
```

Keep these values configurable. Calculate distance using a small tested Haversine function.

An arrival may unlock when:

- the player is within the stop's configured radius; and
- reported accuracy is within an initial configurable ceiling such as 80 m.

Show the player why arrival is waiting when accuracy is poor. Never fabricate precision. Provide **GPS가 정확하지 않아요 — 직접 도착 확인** after a short wait or immediately when permission is denied or the API is unavailable. Manual arrival must require a second confirmation stating that the player is safely standing at the named public stop.

Stop `watchPosition` when:

- the game is completed or reset;
- the player exits the route;
- the page is hidden, where practical, and restart it when visible again;
- the app no longer needs live location.

Do not send coordinates to any endpoint or log exact coordinates to analytics or the console.

## Camera-overlay behavior

At Stop 2, after arrival is confirmed:

1. Show a Korean framing instruction tied to a field-approved, stable public visual anchor.
2. Ask the player to stand still and avoid filming strangers or private spaces.
3. Start the rear camera only after the player taps **카메라 단서 찾기**.
4. Request `video: { facingMode: { ideal: 'environment' } }` and no audio.
5. Display the live video full-bleed inside the clue panel with a simple framing guide.
6. Render a deterministic navy-umbrella icon, `19:38` timestamp, and reflection treatment as HTML/CSS or a transparent image over the video.
7. Let the player tap the overlay to collect the clue.
8. Stop every media track immediately after collection, skip, screen change, page hide, or error.
9. Continue to the same evidence card and puzzle whether the camera clue was collected normally or through fallback.

The overlay does not need spatial anchoring. It may use a fixed responsive position defined in content data. Add a short entrance transition, but respect reduced-motion settings.

Provide **카메라 없이 단서 보기** before and after permission failure. This displays a static equivalent clue and records only that the fallback was used. Do not use canvas capture, screenshots, uploads, object detection, QR scanning, face detection, or recording.

## Solo and two-player modes

Both modes use one phone.

In solo mode, show all evidence normally.

In two-player mode:

- alternate Witness and Evidence roles at each stop;
- show who should hold the phone;
- use hold-to-reveal for the private evidence card;
- show **휴대폰을 건네주세요** before the next role sees content;
- require a simple **함께 이야기했어요** acknowledgement before answer controls appear;
- never make a clue inaccessible if one person leaves.

No networking, invitation code, second device, or real-time synchronization is needed.

## Screens

Implement these player states:

1. Cover
2. Solo/two-player selection
3. Fiction, walking, GPS, and camera safety notice
4. Case briefing and suspect cards
5. Route overview and location permission action
6. Navigation with live location, distance, arrival, help, and exit
7. Camera clue when enabled for a stop
8. Evidence and puzzle
9. Evidence notebook, available after briefing
10. Final accusation
11. Resolution and local feedback form

The browser back action must not silently erase progress. In-app navigation should be clear, and notebook access should return to the prior game state.

## Visual direction

Design mobile first, beginning at 360 px width. Use:

- near-black navy background;
- warm paper cards for evidence;
- one amber accent for active route and interactive evidence;
- red only for errors, danger notices, or incorrect accusations;
- large outdoor-readable type and controls at least 44 px high;
- high contrast in daylight;
- clear progress such as `단서 2 / 4`;
- restrained motion with a reduced-motion mode;
- a persistent safe-exit control on route and camera screens.

Avoid generic admin-dashboard styling, tiny map controls, dense paragraphs, gore, police branding, fake emergency alerts, or real storefront imagery that implies involvement in the crime.

## Puzzle and hint rules

- A wrong answer gives specific, calm feedback and never resets prior progress.
- Each puzzle exposes one hint without a penalty.
- Stop 1 uses tap-to-match or selects; avoid fragile drag-only controls.
- Stop 2 uses camera collection plus a tappable fictional evidence image with accessible choice fallback.
- Stop 3 can use reorder buttons or accessible move-up/move-down controls; drag and drop may be an enhancement.
- Final accusation checks murderer, motive, and decisive evidence independently and points back to relevant notebook entries.
- All interactions must work with touch and keyboard.

## Failure and fallback behavior

| Failure | Required behavior |
| --- | --- |
| Location permission denied | Explain briefly, show route, enable confirmed manual arrival |
| GPS inaccurate or timed out | Show accuracy state and manual fallback |
| Camera permission denied | Reveal equivalent static clue |
| No rear camera | Use any available camera or static fallback |
| Camera interrupted | Stop tracks, preserve progress, offer retry or fallback |
| Map or tiles fail | Show text directions, stop name, and external directions link |
| Refresh | Restore the latest completed step from local storage |
| Wrong answer | Give clue-specific feedback and allow retry |
| Offline after first load | Preserve current content where browser caching allows; do not promise full offline mode |

## Privacy and safety requirements

- Process current location only in browser memory.
- Store no coordinate history.
- Send no coordinates, camera data, or media to a server.
- Never capture camera frames.
- Request no microphone permission.
- Display a visible camera-active state.
- Stop media tracks as soon as camera use ends.
- Do not direct players into a road, alley, parking entrance, private building, or business.
- Do not require purchases or interaction with employees.
- Do not ask players to photograph people, plates, homes, or interiors.
- Every real-world clue must have a digital fallback.
- Include a visible **게임 종료** action and safe route-exit guidance.
- Label all characters, organizations, money, and crime events as fictional.

## Accessibility

- Use semantic HTML and labelled controls.
- Maintain visible keyboard focus.
- Do not encode puzzle meaning by color alone.
- Provide text alternatives for visual evidence.
- Provide a non-camera equivalent for the camera clue.
- Respect `prefers-reduced-motion`.
- Support text zoom without hiding actions.
- Keep map interactions supplementary to text directions.

## Local feedback

The final screen asks:

- Was the mystery easy to understand?
- Was the walking distance comfortable?
- Did GPS and the map help?
- Did the camera clue feel connected to the location?
- Would you play another Gilloe game?
- In two-player mode, did both players participate?

Keep answers in memory or offer a downloadable JSON summary for the test facilitator. Do not create a remote submission endpoint in this MVP.

## Build sequence

1. Scaffold the static Vite app and baseline mobile styles.
2. Implement content data, state machine, local recovery, and all screens using placeholder route data.
3. Implement puzzle logic and notebook.
4. Implement Leaflet route and map fallback.
5. Implement GPS state, distance, accuracy, arrival gating, and manual fallback.
6. Implement the Stop 2 camera overlay and static fallback.
7. Add solo/two-player differences.
8. Add safety, accessibility, and failure states.
9. Insert field-verified coordinates and camera framing directions after the survey.
10. Test on the actual route and revise copy, radius, timing, and stops.

Do not wait for field coordinates to build the screen flow and device-service abstractions. Do not claim the route is ready for outside testers until those values are verified.

## Verification

Before calling the implementation complete, run:

- production build;
- lint if configured;
- any focused unit tests for state transitions, Haversine distance, arrival rules, storage migration, and final-answer checking;
- a clean-browser walkthrough in solo mode;
- a clean-browser walkthrough in two-player mode;
- location-granted, denied, inaccurate, and unavailable paths;
- camera-granted, denied, interrupted, and fallback paths;
- map-tile failure fallback;
- refresh recovery from each stop;
- mobile viewport checks at 360 × 800 and 390 × 844;
- reduced-motion and keyboard checks.

Use real-device testing for GPS and camera. Desktop simulation alone is not sufficient.

## Definition of done

The prototype is implementation-complete when:

- one uninterrupted route flow works from cover to feedback;
- solo and shared-phone modes both work;
- all four clues, puzzles, hints, notebook entries, accusation answers, and ending are present in Korean;
- the map shows the route, numbered stops, player position, accuracy, and active-stop distance;
- GPS-assisted arrival and confirmed manual arrival both work;
- Stop 2 camera overlay and its static fallback both lead to the same puzzle state;
- camera streams stop on every exit path;
- no location or camera data is persisted or transmitted;
- refresh restores reasonable progress;
- permission and map failures cannot strand the player;
- the build succeeds without warnings that indicate broken behavior;
- provisional route data is visibly labelled and cannot be mistaken for field approval;
- README explains setup, secure phone testing, known limitations, and the field-verification requirement.

Public play readiness is a separate milestone. It requires the route to be walked, exact stops approved, GPS radii tested, camera framing checked at the intended operating time, and the acceptance criteria in the MVP plan met.
