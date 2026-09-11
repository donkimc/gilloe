# Gilloe MVP 01 Plan

> **Content pivot:** The playable MVP is now a four-stop piece hunt (arrive → collect a Gilloe-mark tile → assemble). See `BUILT.md`. This file keeps the original Cheonho corridor, safety, and field-test notes; do not restore the murder case.

## *Cheonho 19:42 — The Last Envelope*

**Status:** Review draft; implementation has not started  
**Location:** Cheonho-dong, Gangdong-gu, Seoul  
**Format:** One mobile web game, one fixed walking route  
**Genre:** Fictional murder mystery  
**Play time:** Approximately 30 minutes  
**Players:** One or two people using one phone  
**Difficulty:** Easy  
**Primary language:** Korean  
**Technical intent:** Disposable experience prototype; no staging or production reuse assumed

> The purpose of this MVP is to learn how a Gilloe game should feel before designing a reusable platform.

## Table of Contents

1. [Decision Summary](#1-decision-summary)
2. [MVP Objective](#2-mvp-objective)
3. [Scope and Non-Goals](#3-scope-and-non-goals)
4. [Player Experience](#4-player-experience)
5. [Game Story](#5-game-story)
6. [Mystery Structure and Solution](#6-mystery-structure-and-solution)
7. [Thirty-Minute Route](#7-thirty-minute-route)
8. [Solo and Two-Player Modes](#8-solo-and-two-player-modes)
9. [Screen and Interaction Plan](#9-screen-and-interaction-plan)
10. [Use of the Dinner Route Project](#10-use-of-the-dinner-route-project)
11. [Prototype Data Structure](#11-prototype-data-structure)
12. [Safety and Privacy](#12-safety-and-privacy)
13. [Testing Plan and Metrics](#13-testing-plan-and-metrics)
14. [Acceptance Criteria](#14-acceptance-criteria)
15. [Work After Plan Approval](#15-work-after-plan-approval)
16. [Items for Review](#16-items-for-review)
17. [Local References](#17-local-references)

## 1. Decision Summary

The first Gilloe MVP will be a Korean-language, mobile-first murder mystery set in Cheonho. It will take about 30 minutes and follow a short fixed route through public commercial streets. A player may choose solo mode or two-player mode. Both modes use one phone, so the prototype does not need accounts, networking, or synchronized devices.

The mystery will be fictional, non-graphic, and easy to solve. Players receive four evidence packets at four route stops. Each puzzle has one clear answer and a visible hint. The final screen asks the player to identify the murderer, motive, and decisive evidence.

The map experience will borrow the useful shape of the existing dinner-route project: Leaflet, OpenStreetMap tiles, GeoJSON route geometry, numbered markers, route overview, and camera movement. The Gilloe prototype will have its own visual identity, game state, evidence flow, and content.

The route described below is provisional. It must be walked and checked before implementation. No real business will be portrayed as a crime scene or connected to the fictional murder.

## 2. MVP Objective

The MVP should answer five questions:

1. Can a new player understand the game without verbal explanation?
2. Does walking between clues make the mystery more engaging?
3. Is 30 minutes long enough to feel satisfying without becoming tiring?
4. Does two-player evidence sharing create better conversation than the solo flow?
5. Would a player want to try a second Gilloe game?

This is an experience test rather than a platform test. The result should reveal the appropriate balance between map, story, walking, puzzles, hints, and discussion.

## 3. Scope and Non-Goals

### Included

- One fictional murder mystery
- One route in Cheonho
- Four numbered stops
- Approximately 600–900 metres of walking, subject to field verification
- Solo and two-player modes
- One-phone play
- Route overview and step-by-step map focus
- Live player position on the map using browser GPS
- GPS-assisted arrival detection with an accuracy-aware manual fallback
- Camera clue interactions at selected stops using live video and on-screen overlays
- No QR codes, installed markers, or computer-vision object recognition
- Four easy puzzle interactions
- Evidence notebook
- Hint for every puzzle
- Final accusation and ending
- Lightweight completion feedback
- Local progress recovery after accidental refresh

### Excluded

- User accounts
- Payment
- Background location tracking or server-side location history
- Multiple games or route choices
- Creator tools
- Merchant dashboard or paid business integration
- Live multiplayer or separate-device synchronization
- Stranger matching
- Push notifications
- AI generation during play
- A database or custom backend
- Production-grade analytics
- App Store or Play Store release
- Full spatial AR, image recognition, object recognition, NFC, or physical QR markers

These exclusions keep the prototype focused. A feature should only be added if it is necessary to understand the core game experience.

## 4. Player Experience

The player opens a link near Cheonho Station and sees:

> **천호 19:42 — 마지막 봉투**  
> 천호의 네 장소를 따라가며 가상의 살인사건을 해결하세요.  
> 약 30분 · 쉬움 · 1–2명 · 필수 구매 없음

The player selects **혼자 수사하기** or **둘이 수사하기**. A short safety notice confirms that the case is fictional and asks the player to stop walking before reading clues.

The application then asks for location permission and shows a map with the player's current position, the starting point, final point, route line, approximate distance, and expected time. Only the current destination is emphasized. While the game is open, browser GPS updates the player marker and distance to the next stop. Arrival becomes available when the player is within the stop radius and the reported GPS accuracy is reasonable. A clearly labelled manual fallback remains available when permission is denied, reception is poor, or the location reading is inaccurate.

At each stop, the sequence is:

1. Read a short scene of no more than approximately 100 Korean characters.
2. At camera-enabled stops, follow a short prompt such as “face the street sign” or “frame the entrance area,” then open the live camera.
3. See a clue, icon, image, or short text layered over the camera view and tap to collect it.
4. Open one or two evidence cards.
5. Solve a simple observation, matching, ordering, or multiple-choice puzzle.
6. Use a hint if needed.
7. Add the result to the evidence notebook.
8. Reveal the next destination.

The camera interaction is an atmospheric reveal rather than object recognition. The app does not decide whether a particular real-world object is present in the image. GPS unlocks the stop, the player follows a framing guide, and a deterministic overlay appears in the camera view. This keeps the first test dependable while still measuring whether looking through the camera makes the place feel connected to the story.

The final stop asks three questions: who committed the murder, why, and which evidence proves the false alibi. Correct answers reveal the complete reconstruction. An incorrect answer points the player back to the relevant evidence rather than ending the session.

## 5. Game Story

### Working title

**천호 19:42 — 마지막 봉투**  
**Cheonho 19:42 — The Last Envelope**

### Fictional premise

At 8:05 p.m., fictional puzzle designer **Han Seong-jun** is found dead in his small studio near Cheonho. The presentation is non-graphic; the game focuses on the timeline and evidence.

Shortly before his death, Seong-jun discovered that money from a fictional neighborhood puzzle event had disappeared. He arranged three meetings that evening and prepared a blue envelope containing proof.

The player receives Seong-jun’s unfinished case file. Four evidence packets have been placed along a Cheonho walking route. The player must reconstruct the period between 7:30 p.m. and 7:45 p.m.

All characters, organizations, transactions, and the studio are fictional. Real streets provide atmosphere and navigation only.

### Suspects

| Suspect | Relationship | Statement | Visual cue |
| --- | --- | --- | --- |
| **Kang Min-jae** | Seong-jun’s business partner | “I left at 7:20 and entered Cheonho Station before 7:30.” | Navy umbrella |
| **Seo Yu-na** | Illustrator working on the event | “I delivered the blue envelope at 7:31 and left immediately.” | Yellow umbrella |
| **Lee Do-yun** | Courier and old friend | “I arrived at 7:45, but the studio door was already locked.” | Red cap |

### Truth

Kang Min-jae diverted part of the fictional event fund. Seong-jun discovered the missing money and prepared the blue envelope as proof. Min-jae returned to the studio after claiming to have left, confronted Seong-jun, and killed him during the argument. He then attempted to make the timeline point toward Yu-na.

The decisive fact is that a timestamped reflection shows Min-jae’s navy umbrella inside the studio area at 7:38, while his own statement says he was already at the station. Supporting evidence establishes that Yu-na left earlier and Do-yun arrived after the critical time.

## 6. Mystery Structure and Solution

The mystery is intentionally easy. Each stop answers one question, and the final answer follows directly from the timeline.

### Stop 1 evidence: the appointment page

The player matches initials in Seong-jun’s calendar with the three suspect cards:

- 19:31 — Y / blue envelope
- 19:38 — M / final discussion
- 19:45 — D / delivery

The key discovery is that Min-jae had a scheduled discussion at 7:38 despite claiming he left at 7:20.

**Puzzle type:** Match three initials to three suspects.  
**Expected solve time:** 2 minutes.  
**Hint:** “Compare the initials with the suspect names.”

### Stop 2 evidence: the photograph

A GPS-unlocked camera prompt asks the player to face a safe, public visual anchor identified during the field survey. A navy umbrella icon and a timestamped reflection treatment appear over the live camera view. After collecting the overlay, a fictional photograph contains three visible objects and the player selects the navy umbrella reflected near the studio entrance.

**Puzzle type:** Camera-overlay clue collection followed by tapping the relevant object in a fictional image, with a multiple-choice fallback.  
**Expected solve time:** 2–3 minutes.  
**Hint:** “Which object belongs to someone who says he had already left?”

### Stop 3 evidence: the timestamp timeline

The player orders three cards:

1. Yu-na leaves after delivering the envelope at 7:32.
2. Min-jae is reflected near the studio at 7:38.
3. Do-yun’s delivery is recorded at 7:45.

**Puzzle type:** Arrange three events in time order.  
**Expected solve time:** 2–3 minutes.  
**Hint:** “Start with the earliest printed time.”

### Stop 4 evidence: the ledger fragment and accusation

The blue envelope contains a fictional ledger fragment connecting the missing event money to Min-jae. The player answers:

1. Who killed Seong-jun? — Kang Min-jae
2. Why? — To conceal the missing event money
3. What breaks the alibi? — The 7:38 photograph and appointment

**Puzzle type:** Three multiple-choice questions.  
**Expected solve time:** 3 minutes.

### Ending

The ending reconstructs the case in four short panels. It then asks:

- Was the mystery easy to understand?
- Was the walking distance comfortable?
- Did the map help?
- Would you play another Gilloe game?
- If two people played, did both participate?

## 7. Thirty-Minute Route

### Provisional route corridor

The initial field-survey corridor is:

**Cheonho Station Exit 5 → Cheonho Rodeo Street → Cheonho Stationery and Toy Street area → Cheonho Naengmyeon Street area**

Gangdong-gu describes Cheonho Rodeo Street around Cheonho-daero 157-gil as approximately three minutes from Cheonho Station Exit 5. The district tourism guide also identifies the stationery/toy street around Cheonho-dong 456-16 and the naengmyeon street around Gucheonmyeon-ro 29-gil. These references establish candidate public areas, but they do not replace an on-site route check.

### Proposed timing

| Segment | Activity | Target time |
| --- | --- | ---: |
| Start | Mode selection, safety, and briefing | 3 minutes |
| Walk to Stop 1 | Station to Rodeo Street entrance | 3 minutes |
| Stop 1 | Appointment-page puzzle | 3 minutes |
| Walk to Stop 2 | Short commercial-street segment | 3 minutes |
| Stop 2 | Photograph puzzle | 3 minutes |
| Walk to Stop 3 | Toward stationery/toy street area | 4 minutes |
| Stop 3 | Timeline puzzle | 3 minutes |
| Walk to Stop 4 | Toward naengmyeon street area | 4 minutes |
| Stop 4 | Final accusation and ending | 4 minutes |
| **Total** |  | **30 minutes** |

### Route requirements before implementation

- Total field-tested walking time should be 10–14 minutes.
- Each stop needs a wide, legal, well-lit place to stand.
- No stop should require entering a business.
- No clue should be attached to public or private property.
- The route should avoid difficult road crossings and active construction.
- The ending should be near food, cafés, transport, or another natural next activity.
- The route must have mobile reception and a safe exit option.
- Each camera prompt must point toward a stable public visual anchor that can be viewed without entering private property, blocking pedestrians, or aiming at people.
- Camera interactions must have a non-camera fallback because permission, browser support, weather, glare, darkness, or crowding may prevent use.
- The final GeoJSON should follow pedestrian paths rather than a straight line.

If the four named areas cannot form a safe 30-minute experience, the route should be shortened. The story can be moved between public stops without changing the solution.

## 8. Solo and Two-Player Modes

### Solo mode

The player sees every statement and evidence card. The evidence notebook summarizes the important facts automatically. The experience emphasizes observation and simple deduction.

### Two-player mode

Two people use one phone. At each stop, the application assigns two temporary roles:

- **Investigator A — Witness:** reads the statement card aloud.
- **Investigator B — Evidence:** privately examines the visual evidence card.

The screen then asks the players to discuss before revealing the joint answer controls. They swap roles at the next stop so both people participate.

The private card can use a simple **hold to reveal** interaction followed by **pass the phone**. No networking is required. The evidence is complementary but never so fragmented that one player can block progress.

### Why one phone

One-phone play removes account creation, invitations, connection failures, synchronization, and separate-device testing. It also lets the MVP evaluate whether evidence sharing is enjoyable before building live multiplayer infrastructure.

## 9. Screen and Interaction Plan

### Screen 1: Game cover

- Gilloe mark
- Game title and fictional-case label
- 30 minutes, easy, one route, one or two players
- Approximate walking distance
- Daytime operating recommendation
- Start button

### Screen 2: Player mode

- Solo
- Two players on one phone
- Short explanation of how each mode works

### Screen 3: Safety and fiction notice

- Stop before reading
- Obey signals and stay in public areas
- No required purchase
- All people, organizations, and crimes are fictional
- Location and camera permissions are used only while playing
- Do not aim the camera at strangers, homes, vehicle plates, or private interiors
- Leave-game and route-exit control

### Screen 4: Case briefing

- Victim summary
- Three suspect cards
- Known time window
- Mission: identify murderer, motive, and false alibi

### Screen 5: Route overview

- Leaflet map
- Static GeoJSON walking line
- Four numbered stops
- Current destination emphasized
- Live player marker and GPS accuracy indicator
- Distance to the current destination
- Total distance and estimated time
- External directions link if needed

### Screen 6: Navigation state

- Current destination marker
- Live player marker, accuracy state, and distance remaining
- Short, non-spoiling direction
- GPS-assisted “도착했어요” control when the player enters the stop radius
- Manual arrival fallback when GPS is unavailable or inaccurate
- “길을 찾기 어려워요” help option
- Stop-game control

### Screen 7: Camera clue

- Short instruction naming the safe direction or public visual anchor
- Explicit camera-start button; never open the camera before permission is granted
- Live rear-camera view using `getUserMedia`
- Simple framing guide and deterministic clue overlay
- Tap-to-collect interaction
- “카메라 없이 계속하기” fallback revealing the equivalent clue
- No photo capture, upload, facial recognition, object recognition, or video recording

### Screen 8: Evidence and puzzle

- Short story beat
- Role-specific cards in two-player mode
- One simple interaction
- Optional hint
- Clear success feedback

### Screen 9: Evidence notebook

- Suspect statements
- Collected evidence
- Timeline
- Current unanswered question

The notebook remains available from every puzzle after the briefing.

### Screen 10: Final accusation

- Select murderer
- Select motive
- Select decisive evidence
- Submit and revise if incorrect

### Screen 11: Resolution and feedback

- Four-step case reconstruction
- Completion time
- Simple feedback form
- “Would you play another Gilloe game?”

## 10. Use of the Dinner Route Project

The dinner-route project is a Vite application using vanilla HTML, CSS, and JavaScript. It uses Leaflet 1.9 with OpenStreetMap raster tiles, stores route geometry in GeoJSON, and converts GeoJSON `[longitude, latitude]` values to Leaflet `[latitude, longitude]` at the map boundary.

### Useful patterns to reproduce

- Leaflet map initialization without a paid map key
- OpenStreetMap tile attribution
- GeoJSON route files
- Numbered custom markers
- Fit the full route before the experience begins
- Focus the camera on the active part of the route
- Separate route content from map behavior
- Continue showing the story if map initialization fails
- Recalculate map size when a hidden map becomes visible
- Respect reduced-motion preferences
- Browser Geolocation API for the live player marker and stop proximity
- `navigator.mediaDevices.getUserMedia` for camera-enabled clues

### Patterns that do not fit Gilloe directly

- Dinner-route’s route picker; Gilloe MVP has only one game and one route
- A fully automatic GSAP presentation timeline; Gilloe progress depends on player actions
- Restaurant and photo content
- Start-to-end invitation cards
- Generated production and GitHub Pages files

### Prototype structure

The Gilloe implementation can use the same lightweight stack:

- Vite
- Vanilla HTML, CSS, and JavaScript
- Leaflet 1.9
- OpenStreetMap raster tiles
- One route GeoJSON file
- One game-content module or JSON file
- One lightweight camera-overlay component with no AR framework
- Optional GSAP only for small reveal transitions

The Gilloe code should be written for speed and clarity. No architectural decision in this prototype should be treated as a platform commitment.

## 11. Prototype Data Structure

The game content should be represented as data rather than embedded throughout interface code. A conceptual structure is:

```text
game
  id
  title
  area
  duration
  difficulty
  playerModes
  fictionNotice
  suspects[]
  route
    geoJsonUrl
    distance
    stops[]
      id
      title
      coordinates
      arrivalRadius
      directions
      scene
      cameraClue
        enabled
        framingInstruction
        overlayAsset
        overlayPlacement
        fallbackClue
      soloEvidence
      playerAEvidence
      playerBEvidence
      puzzle
      answer
      hint
      notebookEntry
  finalAccusation
  ending
  feedbackQuestions[]
```

This separation will make story revision easier during testing. It is not intended to become a permanent marketplace schema.

Progress can be stored locally in the browser so an accidental refresh does not erase the session. The saved state only needs game ID, selected mode, current stop, solved clues, collected camera clues, start time, and hint usage. It must not contain continuous location history, camera frames, photos, or video.

## 12. Safety and Privacy

The first prototype uses browser location while the game is open to show the player's current position, calculate distance to the active stop, and assist with arrival. Location is processed in the browser and is not sent to a Gilloe server or saved as a movement history. The location watcher stops when the player completes, exits, hides, or leaves the game where browser behavior allows it.

Camera-enabled clues use the rear camera only after the player taps a clear start button and grants permission. The live video remains in the browser video element. The prototype must not capture, store, upload, analyze, or transmit frames. The overlay is triggered by game state after GPS arrival; it does not use facial recognition, object recognition, or environmental mapping.

GPS and camera readings are imperfect. The interface must explain permission failures in simple Korean and provide equivalent manual-arrival and camera-free clue paths. Permission denial must never make the game impossible to complete.

The route should be played during daylight or clearly defined early-evening hours. Every puzzle screen should assume the player has stopped walking. The application should never instruct a player to enter an alley, private building, road, parking entrance, or business.

The game must include:

- A visible stop-game control
- Instructions back to a safe public point
- A weather and construction pause policy
- A digital fallback for every clue
- No physical marker that could be removed or replaced
- No real person or business represented as a suspect, victim, crime scene, or criminal organization
- No requirement to photograph strangers or private property
- No instruction to point the camera at strangers, private interiors, homes, or vehicle plates
- Stop the camera stream immediately after the clue is collected, skipped, or the player leaves the camera screen
- No meaningful personal data beyond voluntary feedback

The field test must be repeated at the actual operating time before inviting outside testers.

## 13. Testing Plan and Metrics

### Internal test

The builder completes the route from a clean browser on a phone. This confirms map loading, route timing, puzzle answers, hints, and progress recovery.

### Blind test

Three to five teams who have not seen the story play while an observer follows at a distance. Include both solo and two-player sessions.

Record:

- Actual completion time
- Time spent walking and solving
- Wrong answers per puzzle
- Hint use
- Navigation confusion
- GPS accuracy, arrival-unlock failures, and manual-fallback use without storing the player's coordinate history
- Camera permission failures, camera-fallback use, and whether the overlay felt connected to the location
- Unplanned questions to the observer
- Safety or crowding concerns
- Whether both players participated
- Whether the final solution felt fair

### Small public validation

After correction, invite approximately 10–20 total participants. This test remains free. Payment validation is outside this first feel prototype.

### Proposed success signals

| Metric | Initial target |
| --- | ---: |
| Completion without unplanned help | At least 80% of teams |
| Median completion time | 25–35 minutes |
| Correct final answer | At least 70% before using a final hint |
| Enjoyment | At least 70% rate 4/5 or 5/5 |
| Route clarity | At least 80% report that directions were clear |
| GPS arrival behavior | At least 90% of stop arrivals unlock without observer help |
| Camera clue completion | At least 80% complete without the fallback |
| Two-player participation | At least 70% say both players contributed |
| Another-game interest | At least 60% answer yes |
| Safety incidents | Zero |

These are small-sample decision aids rather than market benchmarks.

## 14. Acceptance Criteria

The prototype is ready for blind testing when:

- The complete experience works on a current mobile browser.
- A player can select one or two people before the briefing.
- The map shows one correct route with four numbered stops.
- With permission granted, the map shows the player's live position, location accuracy, and distance to the active stop.
- GPS-assisted arrival works at each field-tested stop, with a usable manual fallback for denied or inaccurate location.
- At least one stop provides a rear-camera clue with a deterministic overlay and an equivalent camera-free fallback.
- Camera and location permission errors never block completion.
- No coordinate history, photo, camera frame, or video is persisted or sent to a server.
- Each stop has directions, evidence, one puzzle, one hint, and a notebook update.
- The player cannot become permanently stuck after a wrong answer.
- Refreshing the page restores reasonable progress.
- The game can finish if the map tiles fail after the route has been introduced.
- The final accusation checks murderer, motive, and evidence.
- The ending explains the solution clearly.
- All story characters and organizations are fictional.
- No route stop depends on a purchase, employee, opening business, or physical marker.
- The route has passed a daytime field inspection.
- The experience can be completed in approximately 25–35 minutes.
- Text remains readable outdoors on a phone.
- Reduced-motion behavior is usable.
- OpenStreetMap attribution remains visible.

## 15. Work After Plan Approval

Implementation should begin only after the experience shape and provisional story are accepted.

### Step 1: Field survey

Walk the proposed corridor, record safe stop coordinates, measure pedestrian distance and time, check crossings and construction, and select an ending point. Replace any unsuitable segment.

### Step 2: Route lock

Create one pedestrian GeoJSON route and four final stop definitions. Document the safe standing location and fallback at each stop.

### Step 3: Story lock

Rewrite the working story into final Korean copy, produce fictional evidence assets, and confirm that the timeline has one unambiguous solution.

### Step 4: Disposable prototype build

Build the mobile experience with the lightweight dinner-route map pattern and player-controlled progression.

### Step 5: Internal and blind testing

Test on the real route, revise confusing clues, and repeat until the acceptance criteria are met.

### Step 6: First-player test

Run the free 10–20 participant experiment, summarize findings, and decide what Gilloe’s next game should change.

## 16. Items for Review

The following decisions should be reviewed before implementation:

1. **Title:** Keep *천호 19:42 — 마지막 봉투*, or choose a different fictional case title.
2. **Tone:** Keep the murder non-graphic and focused on timeline deduction.
3. **Route corridor:** Approve the Station Exit 5 → Rodeo → stationery/toy street → naengmyeon street survey direction.
4. **Mode:** Confirm that two people will share one phone for this MVP.
5. **Language:** Use Korean only for the first test, with English limited to small design labels if desired.
6. **Arrival:** Use live browser GPS for the player marker, distance, and proximity-assisted arrival, with an accuracy-aware manual fallback.
7. **Camera:** Use GPS-gated live-camera overlays for atmosphere and clue collection, without QR codes or object recognition.
8. **Testing:** Treat the first 10–20 participants as a free experience test rather than payment validation.

## 17. Local References

1. **Gangdong-gu, Cheonho 3-dong attractions.** Describes Cheonho Rodeo Street around Cheonho-daero 157-gil and access from Cheonho Station Exit 5. [Gangdong-gu](https://www.gangdong.go.kr/web/dongrenew/contents/cheonho3_030_020)
2. **Gangdong Tourism Map.** Identifies Cheonho Rodeo Street, Cheonho Stationery and Toy Street around Cheonho-dong 456-16, and Naengmyeon Street around Gucheonmyeon-ro 29-gil as local thematic areas. [Gangdong Culture and Tourism](https://www.gangdong.go.kr/web/culture/contents/gdc010_010)
3. **Dinner Route local prototype.** `/Users/donkim/project/dinner-route` provides the reviewed map-interaction reference for Leaflet, OpenStreetMap, and GeoJSON behavior.

Public information was reviewed on September 11, 2026. Exact route geometry, operating conditions, construction, accessibility, and safe stop locations must be verified in person before implementation or player testing.
