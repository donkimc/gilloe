# Cursor Agent Instructions — Gilloe MVP 01

## Mission

Implement the disposable mobile web prototype defined in `BUILT.md`. Creators paste Naver Map URLs to save puzzle walks; players collect tiles and assemble a jigsaw. Camera overlay is deferred.

## Scope discipline

Build:

- a small local Node API that stores games;
- a library and create form (title, 4/9/16/25 Naver Map URLs, jigsaw image);
- live browser GPS;
- route preview animation;
- place cards with at most one Naver listing photo;
- NxN assemble;
- the seeded Cheonho game.

Do not add accounts, payments, remote analytics, QR codes, AR frameworks, object recognition, face recognition, or media capture. Camera overlay stays unused in this flow.

## Read first

Before editing, read:

1. `BUILT.md`
2. `docs/GILLOE_MVP_01_CHEONHO_MURDER_MYSTERY_PLAN.md` (route/safety history; content is the piece hunt)
3. `docs/GILLOE_SAFETY_SECURITY_RISK_GUIDE.md`

Treat `BUILT.md` as the implementation source of truth. Preserve all safety and privacy constraints even when simplifying another part of the build.

## Before coding

1. Inspect the repository and preserve unrelated files.
2. Summarize the implementation plan in a short checklist.
3. Identify unresolved field data separately from code work.
4. Confirm that provisional route values are visibly labelled and data-driven.
5. Build useful screens and services without inventing field verification.

Do not stop implementation merely because final coordinates are pending. Use an explicit provisional-data mode and continue with everything that can be tested safely.

## Implementation rules

- Use Vite with vanilla HTML, CSS, and JavaScript ES modules.
- Use Leaflet 1.9 and OpenStreetMap raster tiles with visible attribution.
- Keep story and route content in one data module.
- Keep game state independent of the DOM.
- Keep map, location, camera, storage, assemble logic, and view rendering in separate modules.
- Use semantic HTML and progressive enhancement.
- Prefer native browser APIs and small pure functions.
- Do not introduce a framework or dependency without documenting why the existing stack cannot reasonably do the job.
- Use GeoJSON coordinate order `[longitude, latitude]` and convert to Leaflet `[latitude, longitude]` at the map boundary.
- Avoid automatic cinematic timelines that control progression. Player actions control the state machine.
- Keep all player-facing text in Korean unless a proper noun requires otherwise.

## Location rules

- Ask for location only after a user gesture and the safety notice.
- Use live location only while it is needed for the active game.
- Show the latest location, accuracy, and approximate distance to the active stop.
- Make arrival criteria configurable by stop.
- Provide a confirmed manual-arrival fallback for denied, unavailable, timed-out, or inaccurate GPS.
- Stop the watcher when the route is complete, reset, exited, or hidden where practical.
- Never persist, transmit, or console-log exact coordinates.
- Never represent an inaccurate position as exact.
- Test distance and arrival logic with pure unit tests if a test runner is added.

## Camera rules

- Start the camera only after a clear user action.
- Request video with the environment-facing camera as an ideal preference and request no audio.
- Use the live stream only as a background for a deterministic HTML/CSS or transparent-image overlay.
- Do not capture canvas frames, photos, screenshots, audio, or video.
- Do not upload or analyze the stream.
- Do not add QR, barcode, image, object, or face detection.
- Stop all media tracks after collection, skip, error, screen change, page hide, reset, and completion.
- Always offer the equivalent static clue through **카메라 없이 단서 보기**.
- Keep the camera prompt focused on a field-approved public visual anchor and never on people or private spaces.

## Safety rules

- All crime framing is dropped. Do not identify any real business as a crime scene.
- No stop may require entry, purchase, employee interaction, or touching installed property.
- Tell players to stop walking before reading or using the camera.
- Keep a visible game-exit action on route and camera screens.
- Provide text directions and map-independent fallbacks.
- Do not call the route public-test ready until it has been physically checked.
- Do not weaken a safety fallback to make a demo look smoother.

## Provisional route handling

The planned corridor is Cheonho Station Exit 5, Cheonho Rodeo Street, the Stationery and Toy Street area, and the Naengmyeon Street area. Exact coordinates, safe standing points, path geometry, arrival radii, and camera framing directions require field verification.

Until verified:

- store `fieldVerified: false` with each stop;
- show `현장 검증 전 임시 경로` in development/prototype mode;
- keep coordinates and radii in content data;
- explain placeholders in README;
- do not silently remove the warning;
- do not fabricate survey results.

## UX rules

- Design for a 360 px mobile viewport first.
- Make primary touch targets at least 44 px high.
- Keep clue copy short and readable outdoors.
- Show the active step and progress clearly.
- Assemble supports drag-to-snap and tap-to-place.
- A hint must exist for the assemble step.
- Tray access must preserve and return to the active state.
- Two-player mode shares one phone without split roles.
- Respect reduced-motion preferences.
- Do not use color as the only information channel.
- Maintain visible keyboard focus and useful text alternatives.

## State and storage rules

Persist only the schema version, game ID, player mode, current state/stop, collected pieces, collected camera-clue status, hint usage, and start time.

Do not persist:

- coordinates or location history;
- GPS accuracy samples;
- camera frames or media;
- names, email addresses, or device identifiers;
- sensitive feedback.

Validate restored state and fall back safely when stored data is invalid or belongs to an older incompatible schema. Reset must clear only Gilloe's own storage key.

## Failure handling

Implement explicit UI states for:

- GPS locating, accurate, inaccurate, denied, unavailable, and timeout;
- camera starting, active, denied, unavailable, interrupted, and stopped;
- map loading and map failure;
- content and GeoJSON load failure;
- invalid saved progress.

No permission or network error may strand the player. Show a short Korean explanation and the relevant fallback action.

## Testing expectations

Run the production build after meaningful changes. Add focused tests for pure logic that is easy to break, especially:

- Haversine distance;
- accuracy-aware arrival eligibility;
- state transitions;
- progress serialization and migration;
- assemble snap / complete checking.

Manually verify:

- solo and two-player flows;
- tile collection and assemble (drag and tap);
- refresh recovery;
- all GPS and camera permission outcomes;
- camera tracks closing on every exit;
- map failure fallback;
- small mobile screens;
- keyboard navigation and reduced motion.

GPS and camera completion requires a real phone on `localhost` through an appropriate secure development setup or an HTTPS test URL. Record what was tested and what remains unverified.

## Documentation

Maintain `README.md` with:

- install and run commands;
- production build command;
- secure-context phone testing steps;
- browser permission-reset instructions;
- architecture overview;
- content and route-editing locations;
- privacy behavior;
- field-verification status;
- known limitations;
- test results.

When behavior changes, update `BUILT.md` only if the agreed product specification changed. Do not rewrite the specification to excuse an incomplete implementation.

## Completion report

When work is complete, report:

1. what was built;
2. files and major modules changed;
3. validation performed and results;
4. real-device behaviors tested;
5. route or camera items still awaiting field verification;
6. any material limitations.

Do not describe the prototype as production-ready. Do not claim GPS, camera, or route success without the corresponding real-device or field test.
