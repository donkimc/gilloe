# Gilloe AI Route Draft Prompt

**Purpose:** Generate an unverified route proposal that can be imported into Gilloe and reviewed on an OpenStreetMap-based editor.

**Important:** This prompt does not create a verified or publishable walking route. The resulting JSON must pass Gilloe validation, be reviewed by a person, and be physically walked before publication.

## How to use

1. Copy the prompt below into Gemini, Claude Sonnet 4.6, or Grok 4.7, and also open an OSM node URL such as https://www.openstreetmap.org/node/5801572034 .
2. Replace every value inside `[square brackets]`.
3. Add optional requirements under `EXTRA REQUESTS`.
4. Paste ChatGPT's JSON response into Gilloe's **AI 경로 초안 가져오기** screen.
5. Review and edit the route, then complete a physical verification walk.

## Copyable prompt

```text
Create one provisional walking-game route in JSON for Gilloe.

REQUEST
- Country: [South Korea]
- City/area: [Cheonho-dong, Gangdong-gu, Seoul]
- Start area: [Cheonho Station]
- Desired duration: [30 minutes]
- Number of stops: [4]
- Approximate walking distance: [600–900 metres]
- Theme: [easy fictional neighborhood mystery]
- Time of use: [daytime]
- Accessibility requirements: [avoid stairs where reasonably verifiable]
- EXTRA REQUESTS: [add any additional request here]

SOURCE RULES
1. Use web research.
2. Use only OpenStreetMap or government/public datasets whose licence explicitly permits the proposed reuse.
3. Do not use Naver Maps, Kakao Maps, Google Maps, Apple Maps, proprietary consumer-map pages, place listings, street-view imagery, reviews, screenshots, or photographs as sources.
4. Do not copy or infer data from a prohibited source even if the same fact appears plausible elsewhere.
5. Include a direct source URL, licence name, licence URL, and list of fields supported by every source.
6. If you cannot verify a required coordinate from an allowed source, do not guess. Return status "needs_source_data", use empty route coordinates and stops, and explain the missing information in warnings.
7. Do not include remote image URLs.
8. Do not use Nominatim.
9. Do not stop at an OSM search results page. Those pages have names but no coordinates.
10. To read coordinates, open an OSM node or way permalink or the OSM API JSON. Examples: https://www.openstreetmap.org/node/5801572034 (HTML includes "Location: lat, lon") and https://api.openstreetmap.org/api/0.6/node/5801572034.json .
11. If Overpass is blocked, still use those OSM node/way URLs. Only return needs_source_data after those URLs fail. If they succeed, return status "draft" with exactly four stops.

ROUTE RULES
1. This is an unverified planning draft, not navigation or safety advice.
2. Set every fieldVerified value to false.
3. Prefer public outdoor pedestrian areas and stable civic landmarks.
4. Do not require entry into a business, purchase, employee interaction, private property, an alley, a roadway, or a parking entrance.
5. Do not identify a real person or business as a victim, suspect, criminal, or crime scene.
6. Keep stops in walking order.
7. Use GeoJSON coordinate order [longitude, latitude].
8. Do not claim a crossing, path, accessibility feature, construction condition, lighting condition, or opening hour is safe or current unless an allowed source explicitly supports it. Put uncertainty in warnings.
9. Keep route and stop names generic and original. Do not copy place descriptions.

OUTPUT RULES
1. Return exactly one JSON object and nothing else.
2. Do not wrap the JSON in Markdown fences.
3. Do not add comments, trailing commas, HTML, or executable content.
4. Follow this schema exactly. Do not add fields.
5. For status "draft", populate the LineString with at least two real source-supported positions and produce exactly the requested number of stop objects.
6. For status "needs_source_data", use empty route coordinates and an empty stops array. Never use zero coordinates as placeholders.

Each stop object must contain exactly these fields:
- id: "stop-1", "stop-2", and so on
- order: sequential integer starting at 1
- title: short original generic label
- coordinates: object containing numeric lat and lng
- coordinateSource: "ai-assisted-open-data"
- fieldVerified: false
- arrivalRadiusMeters: number from 40 through 100
- directions: short original provisional direction
- safeStandingNote: "requires physical verification"
- sourceIndexes: array pointing to entries in sources

{
  "schemaVersion": 1,
  "status": "draft",
  "title": "string",
  "area": {
    "countryCode": "KR",
    "label": "string"
  },
  "requestedDurationMinutes": 30,
  "source": {
    "method": "ai-assisted-draft",
    "generatedBy": "ChatGPT",
    "proprietaryProviderDerived": false
  },
  "sources": [],
  "route": {
    "type": "Feature",
    "properties": {
      "fieldVerified": false,
      "estimatedDistanceMeters": 0
    },
    "geometry": {
      "type": "LineString",
      "coordinates": []
    }
  },
  "stops": [],
  "warnings": [
    "AI-generated draft: every coordinate, path, stop and safety condition requires physical verification."
  ]
}

Each source object must contain exactly: name, direct source URL, licence name, licence URL, and a supports array. The licence page by itself does not support a coordinate; include the actual open-data page or endpoint consulted as the source URL.

When source data is sufficient, the LineString must contain enough source-supported coordinates to describe the provisional walking path rather than only straight connections between stops.
```

## Gilloe handling rules

Gilloe must never trust the response merely because it matches this schema. The importer must independently enforce the validation and publication restrictions in `docs/MVP_MAP_CREATION_COMPLIANCE_PLAN.md`.
