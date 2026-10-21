# Gilloe MVP Map Creation Plan

**Status:** Implemented in the app — remaining work is phone GPS recording and physical field verification of seed/OSM/AI routes  
**Decision:** Replace the Naver URL import workflow with three controlled route-creation methods: record a GPS walk, draw on an OpenStreetMap-based editor, or import an AI-generated draft JSON  
**Goal:** Make an MVP map in the simplest practical way without copying proprietary map pages, coordinates, routes, descriptions, or images

## TL;DR

The creator chooses one of three methods. GPS recording and open-map drawing are primary choices. AI JSON import is an advanced experimental choice.

### Method A — Record the walk

1. Tap **경로 기록 시작**.
2. Walk the intended route.
3. Tap **정류장 추가** at each of four safe locations.
4. Add a short original note and, optionally, a photo taken by the creator.
5. Tap **기록 완료**.
6. Gilloe saves the creator's GPS track and stops as GeoJSON.
7. AI generates the game story, clue text, icons, and instructions from that creator-owned material.
8. The creator previews the game and confirms the field-safety checklist.

### Method B — Draw on an open map

1. Tap **지도에서 경로 만들기**.
2. Pan and zoom an attributed OpenStreetMap basemap.
3. Tap four safe-looking public locations to add stops.
4. Draw the walking line by tapping along the intended streets; drag points to correct it.
5. Add original stop names, notes, and creator-owned images.
6. Save the user-created points and line as GeoJSON.
7. Walk the route before publishing and mark it field verified only after the physical check.

### Method C — Generate an AI route draft

1. Open **AI 경로 초안 가져오기** under Advanced.
2. Copy Gilloe's controlled prompt from `docs/AI_ROUTE_JSON_PROMPT.md`.
3. Add the desired area, duration, number of stops, theme, accessibility needs, and other constraints.
4. Ask ChatGPT with web access to return JSON only.
5. Paste the result into Gilloe.
6. Gilloe validates the schema, provenance, coordinates, geometry, distance, and restrictions.
7. Open the accepted draft in the OpenStreetMap editor and review every stop and route segment.
8. Walk the complete route and record field verification before publication.

The player map displays the resulting route over an attributed OpenStreetMap basemap. Gilloe does not accept Naver, Kakao, or Google consumer-map URLs as a source of map data. It does not scrape map pages, proxy listing photographs, copy proprietary provider route geometry, or ask AI to invent coordinates.

## 1. Why the current process must change

The current prototype accepts Naver Map URLs and contains code that can:

- follow Naver redirect URLs;
- fetch Naver Place HTML;
- extract coordinates, names, addresses, and descriptions;
- reference or proxy Naver-hosted listing images;
- save Naver URLs with each stop;
- use a public OSRM service to generate a walking line.

That workflow creates unnecessary licensing and terms-of-service risk. It also makes Gilloe dependent on undocumented page structure and third-party images.

The replacement process must have a clear source for every map element:

| Element | MVP source |
| --- | --- |
| Route line | Creator GPS, creator-drawn OSM line, or attributed AI open-data draft |
| Stop coordinates | Live creator GPS, creator-selected OSM point, or attributed AI open-data draft |
| Stop name | Creator-written generic label |
| Stop description | Creator note or AI rewrite of that note |
| Stop photograph | Creator upload with rights confirmation |
| Puzzle image | Creator upload or Gilloe-generated fictional image |
| Basemap | OpenStreetMap display with required attribution |
| Player position | Player's browser GPS, held in memory only |

## 2. Simple MVP creation flow

### Screen 1: Create a walk

The creator enters:

- game title;
- number of stops: four for the first MVP;
- approximate play time;
- optional theme prompt, such as “easy neighborhood mystery.”

Show two primary actions:

- **휴대폰으로 경로 기록하기** — recommended because it produces a walked route.
- **지도에서 경로 만들기** — easiest for planning on a phone or computer; requires a later verification walk.

Under **고급 / 실험 기능**, show:

- **AI 경로 초안 가져오기** — fastest for exploring an idea, but never verified automatically.

Do not show a field for a Naver, Kakao, or Google URL.

### Screen 2: Safety and permission

Before recording:

- explain that GPS records the route only after the creator starts;
- ask the creator to remain on legal public pedestrian paths;
- tell the creator to stop before interacting with the phone;
- request location permission after a button tap;
- do not request camera permission until the creator chooses to take a photo.

### Screen 3: Record the route

The recorder shows:

- a live position marker;
- GPS accuracy;
- elapsed time;
- approximate recorded distance;
- the recorded line;
- **정류장 추가**;
- **일시정지**;
- **기록 완료**.

Record a point only when the location reading has acceptable accuracy. Use a conservative sampling rule such as:

- accuracy of 30 metres or better when available;
- at least 5 metres or 3 seconds from the previous accepted point;
- discard impossible jumps;
- show low-accuracy periods to the creator rather than silently treating them as precise.

The values must remain configurable and should be tuned during testing.

### Screen 3B: Draw the route on an open map

Use Leaflet with an OpenStreetMap basemap. The editor requires no place-search service for the first MVP.

The creator can:

- pan and zoom the map;
- tap **정류장 추가** and then tap the map;
- reorder or delete stops;
- tap **경로 그리기** and add route vertices along the intended pedestrian path;
- drag vertices to correct the line;
- undo the last point;
- clear and restart;
- see distance and estimated walking time;
- save the stops and line as GeoJSON.

Do not add address autocomplete or public Nominatim search to the first version. The creator finds the area by moving the map or using the device's current-location button. This avoids another external data service and keeps the editor simple.

The editor must display:

- `© OpenStreetMap contributors` at all times;
- an explanation that OpenStreetMap is the basemap source;
- `현장 확인 전 계획 경로` while the route remains unverified;
- a reminder that the visible map may not show current construction, crossings, or private access restrictions.

The user-created stops and line receive this provenance:

```json
{
  "method": "openstreetmap-assisted-drawing",
  "fieldVerified": false,
  "mapDataAttribution": "© OpenStreetMap contributors",
  "mapDataLicense": "ODbL-1.0"
}
```

Because the route was drawn while referring to OpenStreetMap, Gilloe must retain the OpenStreetMap attribution and handle distributed geographic database data consistently with the ODbL. The standard OSM tile service is only the display layer and must not be scraped, bulk downloaded, or packaged for offline use.

### Screen 3C: Import an AI route draft

The AI option is an import workflow rather than a trusted route generator inside Gilloe.

The screen contains:

- a short explanation of what AI may get wrong;
- **ChatGPT용 프롬프트 복사**;
- a JSON paste area;
- **JSON 검사하기**;
- validation results grouped into errors and warnings;
- **지도에서 검토하기** after validation passes.

Always display:

> **AI가 생성한 미확인 초안입니다. 현장 확인 전에는 공개할 수 없습니다.**

The reusable prompt is maintained in `docs/AI_ROUTE_JSON_PROMPT.md`. It requires ChatGPT to use only OpenStreetMap or explicitly licensed public data, provide source and licence metadata, avoid proprietary map providers, mark all geometry unverified, and return no coordinates when it cannot verify them from an allowed source.

#### AI JSON import rules

Gilloe must reject an AI response when:

- it is not valid JSON;
- it does not match the supported schema version;
- `source.method` is not `ai-assisted-draft`;
- any route or stop has `fieldVerified: true`;
- sources or licence metadata are missing;
- a source names or links to Naver, Kakao, Google Maps, or another unapproved proprietary consumer map;
- required coordinates are missing, non-numeric, outside the declared country, or reversed;
- the geometry is not a valid GeoJSON LineString;
- stops do not follow the line in a plausible order;
- the route distance or stop spacing is implausible for the requested duration;
- a stop depends on entering a business or private property;
- a remote photograph or provider-hosted media URL is included;
- HTML, JavaScript, executable content, or unsupported fields are included.

Gilloe must treat all pasted strings as untrusted input, limit payload size, validate them before storage, and render user-visible text with safe text handling.

Passing validation means only that the file is structurally acceptable. It does not mean the geography is correct, licensed correctly, walkable, accessible, or safe.

### Screen 4: Add a stop

At a safe stopping place, the creator taps **정류장 추가** and provides:

- a generic original title, for example `천호역 5번 출구 앞 광장`;
- a short original direction;
- a safe-standing note;
- an optional photo taken by the creator;
- a confirmation that the stop does not require entry, purchase, or employee interaction.

In GPS-recording mode, the saved coordinate comes from the creator's current reading and may be adjusted slightly to correct ordinary drift. In map-drawing mode, the coordinate comes from the point the creator selected and remains field-unverified until the verification walk.

Avoid using a business name as the core game location. A nearby public-space description is preferable.

### Screen 5: Finish and review

After four stops, Gilloe:

- simplifies the recorded line without changing its basic path;
- calculates route length and approximate walking time;
- detects large gaps and implausible jumps;
- verifies that stop order follows the recorded walk;
- displays a route preview;
- asks the creator to review every stop;
- exports the route as GeoJSON.

For a drawn route, Gilloe additionally requires a later **현장 확인 완료** step. Drawing a line on a map does not prove that the path is currently walkable or safe.

An AI-generated draft follows the same requirement and must first be reviewed in the open-map editor. It cannot become test-ready directly from JSON import.

The creator must confirm:

- I walked this route myself.
- Every stop is on a legal public pedestrian area.
- I own or have permission to use uploaded photographs.
- The route does not depend on a business being open.
- The game does not portray a real person or business as criminal.

### Screen 6: AI creates the game layer

AI may use only the creator-supplied route package and prompt to generate:

- the fictional story;
- clue text;
- stop instructions;
- icons and fictional evidence;
- suggested timing;
- safety reminders;
- camera-overlay artwork.

AI must not invent or silently replace:

- coordinates;
- roads or pedestrian connections;
- crossing conditions;
- opening hours;
- accessibility claims;
- business facts;
- real-world photographs.

AI output is a creative draft. The creator reviews it before testing.

When AI also produced the provisional route JSON, the creative-generation step must not silently change its coordinates or sources. Any route change returns the draft to `fieldVerified: false`.

## 3. Map display for the MVP

Use the existing Leaflet map with an OpenStreetMap basemap for the small MVP test.

Required behavior:

- display `© OpenStreetMap contributors` visibly on every map;
- link the attribution to the OpenStreetMap copyright and licence page;
- use the tiles interactively in the application;
- make no bulk downloads;
- provide no offline tile-download feature;
- do not remove or cover attribution;
- do not scrape place information from the map;
- do not treat the tile server as a source of photographs or business data;
- keep text directions available if tiles fail.

The OpenStreetMap data license and the tile-server usage policy are separate. Standard community tiles can support a small, low-volume MVP that follows the usage policy. Before broader launch, Gilloe must use a commercial OSM-compatible tile provider or its own hosted tiles under the applicable licence.

References:

- [OpenStreetMap copyright and licence](https://www.openstreetmap.org/copyright)
- [OpenStreetMap standard tile usage policy](https://operations.osmfoundation.org/policies/tiles/)

## 4. Route data format

The route recorder produces one package:

```json
{
  "schemaVersion": 1,
  "source": {
    "method": "creator-gps-recording | openstreetmap-assisted-drawing | ai-assisted-draft",
    "recordedAt": "ISO-8601 timestamp",
    "proprietaryProviderDerived": false,
    "mapDataAttribution": "© OpenStreetMap contributors or empty",
    "mapDataLicense": "ODbL-1.0 or empty"
  },
  "route": {
    "type": "Feature",
    "properties": {
      "fieldVerified": false
    },
    "geometry": {
      "type": "LineString",
      "coordinates": []
    }
  },
  "stops": [
    {
      "id": "stop-1",
      "title": "creator-written title",
      "coordinates": { "lat": 0, "lng": 0 },
      "coordinateSource": "creator-gps-recording | openstreetmap-assisted-drawing | ai-assisted-open-data",
      "fieldVerified": false,
      "arrivalRadiusMeters": 60,
      "directions": "creator note or reviewed AI rewrite",
      "safeStandingNote": "creator-written note",
      "photo": {
        "url": "local Gilloe upload or empty",
        "rights": "creator-owned"
      }
    }
  ]
}
```

The example uses `false`. GPS recording may set it to `true` after the creator completes the route and confirms the safety checklist. Map-drawing mode must keep it `false` until the later verification walk.

AI imports must include a `sources` array at the package level. Each entry contains a human-readable source name, direct URL, licence name, licence URL, and the fields for which the source was used. The importer records the original JSON and a validation result for audit, but neither is proof that the AI correctly represented the source.

The saved package must not contain Naver, Kakao, or Google source URLs, provider place IDs, provider-hosted image URLs, scraped descriptions, or proprietary-provider-derived route geometry. An OpenStreetMap-assisted route must retain its OSM provenance and attribution metadata.

## 5. Desktop fallback

For a creator working on a computer, the simplest option is **지도에서 경로 만들기**. The creator can add four stops and trace the intended walking line directly on the attributed open map.

Also support GPX upload:

1. record a GPX file using a phone GPS recorder;
2. upload the GPX file to Gilloe;
3. choose four points from that recorded track;
4. add original notes and creator-owned images;
5. complete the same safety confirmation.

A map-drawn route must remain `fieldVerified: false` and cannot be published for outside testing until the creator walks and verifies it. The verification walk does not have to replace the drawn geometry when it is accurate, but it must confirm each stop, pedestrian segment, and safety note.

## 6. Use of public data

Public datasets may supplement the creator's own observations only when the specific dataset has an explicit licence that permits the intended use.

For example, some Seoul Open Data Plaza datasets are published under Korea Open Government Licence Type 1, which allows commercial use and modification with attribution. The licence must be checked per dataset and stored with the imported record. [Example Seoul dataset with Type 1 permission](https://data.seoul.go.kr/dataList/OA-23038/S/1/datasetView.do)

For the first MVP, public-data import is unnecessary. Keeping it out makes the workflow easier and the provenance clearer.

## 7. What happens to the current Naver workflow

After this plan is approved, implementation should:

1. remove Naver URL fields from the creator form;
2. remove Naver URL parsing and redirect following;
3. remove Naver Place HTML fetching and metadata extraction;
4. remove the `pstatic.net` image proxy;
5. remove Naver listing links and provider-hosted photos from player screens;
6. remove saved `naverUrl`, provider place IDs, and remote `photoUrl` values;
7. replace automatic public-OSRM route creation with recorded GPS geometry;
8. quarantine or replace existing seed games whose coordinates or images came from Naver;
9. add provenance fields to games, stops, routes, and images;
10. add the mobile route recorder, OpenStreetMap-based route drawing, and GPX upload fallback.
11. add an advanced AI draft JSON importer with strict schema and provenance validation.

Until those changes are complete, the current creator import feature should be treated as deprecated and should not be used to create or publish games.

## 8. Minimal implementation phases after approval

### Phase 1: Remove restricted-source ingestion

- Disable Naver URL creation.
- Disable provider-page fetching and image proxying.
- Hide provider-derived photos and external provider links.
- Mark existing imported games unavailable for publication.

### Phase 2: Add creator GPS recording

- Add start, pause, add-stop, finish, and cancel actions.
- Keep the recording locally until the creator saves.
- Export LineString GeoJSON and stop points.
- Add accuracy and jump validation.

### Phase 2B: Add the open-map route editor

- Add **지도에서 경로 만들기** beside GPS recording.
- Let the creator add, move, reorder, and remove four stops.
- Let the creator draw, edit, undo, and clear a pedestrian line.
- Save the route as `openstreetmap-assisted-drawing` with OSM attribution and ODbL metadata.
- Keep the route unverified until the creator completes a physical walk.
- Do not add place search, scraped POIs, provider images, or a public routing API.

### Phase 2C: Add AI draft JSON import

- Add the advanced **AI 경로 초안 가져오기** entry point.
- Provide the maintained ChatGPT prompt with a copy button.
- Parse JSON without executing content.
- Validate schema, payload size, source licence metadata, coordinate bounds, geometry, stop order, spacing, and duration.
- Reject proprietary map sources, remote images, unsupported fields, and any `fieldVerified: true` value.
- Open valid drafts in the same OSM editor used by Method B.
- Preserve `source.method: ai-assisted-draft` through editing.
- Prevent publication until the creator completes a verification walk.

### Phase 3: Add content ownership

- Accept creator-written notes.
- Accept creator-owned image uploads.
- Add rights confirmation and provenance metadata.
- Generate game copy and fictional assets from this material.

### Phase 4: Preview and field approval

- Preview the route over the attributed OSM basemap.
- Run the complete player flow on the recorded or map-drawn route.
- Confirm GPS radii, safe standing points, and camera direction.
- Mark the game test-ready only after a second review walk.

## 9. Acceptance criteria for the new process

The revised process is ready for MVP testing when:

- a creator can record a route and four stops on a phone;
- a creator can alternatively add four stops and draw a route on an attributed open map;
- a creator can import a schema-valid AI route draft and review it in the open-map editor;
- GPS-mode GeoJSON contains only creator-recorded geometry;
- map-drawn GeoJSON records OSM-assisted provenance and remains field-unverified until walked;
- AI-imported GeoJSON retains its sources, licences, `ai-assisted-draft` provenance, and unverified status;
- invalid, proprietary-source, remote-image, or falsely verified AI JSON is rejected;
- a GPX upload provides the same result as an alternative;
- no creator screen requests a proprietary consumer-map URL;
- the server does not fetch or parse proprietary map pages;
- no player screen displays provider-hosted listing photographs;
- no game record contains a Naver, Kakao, or Google place URL or ID;
- every uploaded image has creator ownership or permission confirmation;
- OSM attribution remains visible and linked;
- no offline or bulk tile downloading exists;
- AI generation cannot create or overwrite ground-truth coordinates;
- unwalked routes cannot be marked field verified;
- a map failure still leaves usable text directions;
- the route is tested on a real phone before outside players are invited.

## 10. Recommended MVP decision

Approve these three creation methods for the first MVP:

> **Option A:** Record one walk on a phone and add four stops while standing there.  
> **Option B:** Add four stops and draw the path on an OpenStreetMap-based editor, then walk it once before publication.
> **Option C:** Generate a provisional JSON route with Gilloe's controlled ChatGPT prompt, import and edit it on the open map, then walk it once before publication.

All options allow a creator-owned puzzle image and AI-generated story and clues. Do not add provider URL imports, uncontrolled public-data search, automatic place discovery, a public routing API, or direct prompt-to-publication. They can be evaluated later with separate licences and provenance rules.

This gives users an accurate phone-first method, an easy visual planning method, and a fast AI ideation method while keeping proprietary map data out of Gilloe. Every route still becomes test-ready only after a real walk.
