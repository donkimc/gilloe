import { describe, expect, it } from "vitest";
import {
  considerGpsSample,
  containsRestrictedSource,
  migrateGameRecord,
  parseGpxTrack,
  reduceGpsSession,
  emptyGpsSession,
  emptyDrawState,
  reduceDrawState,
  validateAiDraft,
  validateGamePayload,
} from "./routeSchema.js";

const stops = [
  { lat: 37.53865, lng: 127.12385, publicStopConfirmed: true, name: "정류장 1" },
  { lat: 37.53891, lng: 127.12755, publicStopConfirmed: true, name: "정류장 2" },
  { lat: 37.54078, lng: 127.12936, publicStopConfirmed: true, name: "정류장 3" },
  { lat: 37.54239, lng: 127.12949, publicStopConfirmed: true, name: "정류장 4" },
];

function payload(extra = {}) {
  return {
    title: "테스트",
    placeCount: 4,
    source: { method: "openstreetmap-assisted-drawing", proprietaryProviderDerived: false },
    routeLine: [
      [127.12385, 37.53865],
      [127.12755, 37.53891],
    ],
    places: stops,
    jigsaw: { source: "system", systemImageId: "park" },
    ...extra,
  };
}

function aiDraft(overrides = {}) {
  return {
    schemaVersion: 1,
    status: "draft",
    title: "천호 임시 산책",
    area: { countryCode: "KR", label: "서울 강동구 천호동" },
    requestedDurationMinutes: 30,
    source: { method: "ai-assisted-draft", generatedBy: "ChatGPT", proprietaryProviderDerived: false },
    sources: [
      {
        name: "OpenStreetMap",
        url: "https://www.openstreetmap.org/#map=16/37.53865/127.12385",
        licence: "ODbL",
        licenceUrl: "https://opendatacommons.org/licenses/odbl/",
        supports: ["route.geometry", "stops"],
      },
    ],
    route: {
      type: "Feature",
      properties: { fieldVerified: false, estimatedDistanceMeters: 800 },
      geometry: {
        type: "LineString",
        coordinates: [
          [127.12385, 37.53865],
          [127.12755, 37.53891],
          [127.12936, 37.54078],
          [127.12949, 37.54239],
        ],
      },
    },
    stops: [
      {
        id: "stop-1",
        order: 1,
        title: "역 출구 인근",
        coordinates: { lat: 37.53865, lng: 127.12385 },
        coordinateSource: "ai-assisted-open-data",
        fieldVerified: false,
        arrivalRadiusMeters: 60,
        directions: "공개 인도",
        safeStandingNote: "requires physical verification",
        sourceIndexes: [0],
      },
      {
        id: "stop-2",
        order: 2,
        title: "거리 인근",
        coordinates: { lat: 37.53891, lng: 127.12755 },
        coordinateSource: "ai-assisted-open-data",
        fieldVerified: false,
        arrivalRadiusMeters: 55,
        directions: "공개 인도",
        safeStandingNote: "requires physical verification",
        sourceIndexes: [0],
      },
      {
        id: "stop-3",
        order: 3,
        title: "교차로 인근",
        coordinates: { lat: 37.54078, lng: 127.12936 },
        coordinateSource: "ai-assisted-open-data",
        fieldVerified: false,
        arrivalRadiusMeters: 60,
        directions: "공개 인도",
        safeStandingNote: "requires physical verification",
        sourceIndexes: [0],
      },
      {
        id: "stop-4",
        order: 4,
        title: "광장 인근",
        coordinates: { lat: 37.54239, lng: 127.12949 },
        coordinateSource: "ai-assisted-open-data",
        fieldVerified: false,
        arrivalRadiusMeters: 60,
        directions: "공개 인도",
        safeStandingNote: "requires physical verification",
        sourceIndexes: [0],
      },
    ],
    warnings: ["unverified"],
    ...overrides,
  };
}

describe("restricted sources", () => {
  it("detects proprietary map hosts", () => {
    expect(containsRestrictedSource("https://map.naver.com/p")).toBe(true);
    expect(containsRestrictedSource("https://map.kakao.com/")).toBe(true);
    expect(containsRestrictedSource("https://www.openstreetmap.org/")).toBe(false);
  });
});

describe("gps sampling", () => {
  it("rejects low accuracy and jumps, keeps spaced points", () => {
    expect(considerGpsSample(null, { lat: 37.54, lng: 127.12, accuracy: 80 }).accept).toBe(false);
    const first = considerGpsSample(null, { lat: 37.54, lng: 127.12, accuracy: 12 }, 1_000);
    expect(first.accept).toBe(true);
    expect(considerGpsSample(first.point, { lat: 37.54001, lng: 127.12, accuracy: 10 }, 1_200).accept).toBe(false);
    expect(considerGpsSample(first.point, { lat: 37.541, lng: 127.13, accuracy: 10 }, 1_400).reason).toBe("jump");
    expect(considerGpsSample(first.point, { lat: 37.54008, lng: 127.12, accuracy: 10 }, 5_000).accept).toBe(true);
  });

  it("adds a stop from the latest accepted point", () => {
    let session = reduceGpsSession(emptyGpsSession(), { type: "START", at: 1 });
    session = reduceGpsSession(session, { type: "SAMPLE", at: 1, reading: { lat: 37.53865, lng: 127.12385, accuracy: 8 } });
    session = reduceGpsSession(session, { type: "ADD_STOP", title: "출구" });
    expect(session.stops).toHaveLength(1);
    expect(session.stops[0].lat).toBeCloseTo(37.53865);
  });
});

describe("ai json import", () => {
  it("accepts a schemaVersion 1 draft", () => {
    const result = validateAiDraft(JSON.stringify(aiDraft()));
    expect(result.ok).toBe(true);
    expect(result.playable).toBe(true);
  });

  it("rejects extra fields, proprietary sources, remote images, and claimed verification", () => {
    expect(validateAiDraft(JSON.stringify(aiDraft({ extra: true }))).ok).toBe(false);
    expect(validateAiDraft(JSON.stringify(aiDraft({ sources: [{ name: "Naver", url: "https://map.naver.com", licence: "x", licenceUrl: "https://example.com", supports: ["x"] }] }))).ok).toBe(false);
    expect(validateAiDraft(JSON.stringify(aiDraft({ warnings: ["https://cdn.example.com/a.jpg"] }))).ok).toBe(false);
    const verified = aiDraft();
    verified.route.properties.fieldVerified = true;
    expect(validateAiDraft(JSON.stringify(verified)).ok).toBe(false);
  });

  it("accepts a needs_source_data draft with licenceName aliases and empty geometry", () => {
    const raw = {
      schemaVersion: 1,
      status: "needs_source_data",
      title: "The Missing Snack Ledger",
      area: { countryCode: "KR", label: "길동·천호" },
      requestedDurationMinutes: 60,
      source: { method: "ai-assisted-draft", generatedBy: "ChatGPT", proprietaryProviderDerived: false },
      sources: [
        {
          name: "OpenStreetMap: Gildong Station Gate 3",
          url: "https://www.openstreetmap.org/node/3401488919",
          licenceName: "Open Database License 1.0 (ODbL)",
          licenceUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
          attribution: "Map data from OpenStreetMap contributors",
          fieldsSupported: ["entrance coordinates"],
          limitations: ["Not enough stops"],
        },
      ],
      route: {
        type: "Feature",
        properties: { fieldVerified: false, estimatedDistanceMeters: 0 },
        geometry: { type: "LineString", coordinates: [] },
      },
      stops: [],
      warnings: ["No coordinates guessed."],
    };
    const result = validateAiDraft(JSON.stringify(raw));
    expect(result.ok).toBe(true);
    expect(result.playable).toBe(false);
    expect(result.needsSourceData).toBe(true);
  });

  it("parses needs_source_data JSON whose OSM urls were backslash-escaped", () => {
    const messy = `{
      "schemaVersion": 1,
      "status": "needs_source_data",
      "title": "The Case of the Missing Snack Token",
      "area": { "countryCode": "KR", "label": "Cheonho-dong" },
      "requestedDurationMinutes": 30,
      "source": { "method": "ai-assisted-draft", "generatedBy": "ChatGPT", "proprietaryProviderDerived": false },
      "sources": [{
        "name": "OpenStreetMap: Cheonho Station node",
        "url": "https\\://www\\.openstreetmap.org/node/5801572034",
        "licenceName": "Open Database License 1.0 (ODbL)",
        "licenceUrl": "https\\://opendatacommons.org/licenses/odbl/1-0/",
        "fieldsSupported": ["OpenStreetMap node identifier"],
        "limitations": ["The direct feature data could not be retrieved."]
      }],
      "route": { "type": "Feature", "properties": { "fieldVerified": false, "estimatedDistanceMeters": 0 }, "geometry": { "type": "LineString", "coordinates": [] } },
      "stops": [],
      "warnings": ["Exactly four stops are requested."]
    }`;
    const result = validateAiDraft(messy);
    expect(result.ok).toBe(true);
    expect(result.playable).toBe(false);
    expect(result.needsSourceData).toBe(true);
  });

  it("accepts a Claude needs_source_data paste with curly quotes, note, and no source name", () => {
    const messy = `{
      “schemaVersion”: 1,
      “status”: “needs_source_data”,
      “title”: “The Case of the Missing Snack Map”,
      “area”: { “countryCode”: “KR”, “label”: “Cheonho-dong” },
      “requestedDurationMinutes”: 30,
      “source”: { “method”: “ai-assisted-draft”, “generatedBy”: “Claude”, “proprietaryProviderDerived”: false },
      “sources”: [{
        “url”: “https://www.openstreetmap.org/”,
        “licenceName”: “Open Database Licence 1.0”,
        “licenceUrl”: “https://opendatacommons.org/licenses/odbl/1-0/”,
        “fieldsSupported”: [“node IDs”],
        “note”: “OSM way pages listed node IDs but no coordinates.”
      }],
      “route”: { “type”: “Feature”, “properties”: { “fieldVerified”: false, “estimatedDistanceMeters”: 0 }, “geometry”: { “type”: “LineString”, “coordinates”: [] } },
      “stops”: [],
      “warnings”: [“No coordinates guessed.”]
    }`;
    const result = validateAiDraft(messy);
    expect(result.ok).toBe(true);
    expect(result.playable).toBe(false);
    expect(result.needsSourceData).toBe(true);
    expect(result.draft.sources[0].name).toBe("www.openstreetmap.org");
  });

  it("rejects reversed coordinates and executable content", () => {
    const reversed = aiDraft();
    reversed.stops[0].coordinates = { lat: 127.12385, lng: 37.53865 };
    expect(validateAiDraft(JSON.stringify(reversed)).ok).toBe(false);
    expect(validateAiDraft(`{"schemaVersion":1,"status":"draft","<script>":1}`).ok).toBe(false);
  });
});

describe("game payload", () => {
  it("accepts a four-stop OSM route", () => {
    expect(validateGamePayload(payload()).ok).toBe(true);
  });

  it("rejects Naver leftovers, remote photos, and non-GPS claimed verification", () => {
    expect(validateGamePayload(payload({ places: stops.map((s, i) => (i ? s : { ...s, naverUrl: "https://map.naver.com" })) })).ok).toBe(false);
    expect(validateGamePayload(payload({ places: stops.map((s, i) => (i ? s : { ...s, photoUrl: "https://ldb-phinf.pstatic.net/a.jpg" })) })).ok).toBe(false);
    expect(validateGamePayload(payload({ fieldVerified: true })).ok).toBe(false);
    expect(validateGamePayload(payload({ placeCount: 9, places: stops })).ok).toBe(false);
    expect(validateGamePayload(payload({ placeCount: 3, places: stops.slice(0, 3) })).ok).toBe(true);
  });
});

describe("osm draw", () => {
  it("auto-draws a path after the chosen number of stops", () => {
    let draw = emptyDrawState();
    draw = reduceDrawState(draw, { type: "SET_STOP_TARGET", stopTarget: 2 });
    draw = reduceDrawState(draw, { type: "ADD_STOP", lat: 37.538, lng: 127.123, title: "A" });
    expect(draw.mode).toBe("stops");
    draw = reduceDrawState(draw, { type: "ADD_STOP", lat: 37.539, lng: 127.124, title: "B" });
    expect(draw.mode).toBe("path");
    expect(draw.autoRouted).toBe(true);
    expect(draw.routing).toBe(true);
    draw = reduceDrawState(draw, {
      type: "SET_WALK_VERTICES",
      vertices: [
        [127.123, 37.538],
        [127.1235, 37.5384],
        [127.124, 37.539],
      ],
    });
    expect(draw.routing).toBe(false);
    expect(draw.vertices).toHaveLength(3);
  });
});

describe("migration", () => {
  it("quarantines games that still carry restricted sources", () => {
    const migrated = migrateGameRecord({
      id: "old",
      title: "건대",
      places: [{ lat: 37.54, lng: 127.07, naverUrl: "https://map.naver.com", photoUrl: "https://ldb-phinf.pstatic.net/a.jpg" }],
      jigsaw: { source: "final-place", imageUrl: "https://ldb-phinf.pstatic.net/a.jpg" },
    });
    expect(migrated.quarantined).toBe(true);
    expect(migrated.quarantineReason).toBe("restricted-source-migration-required");
    expect(migrated.places[0].naverUrl).toBeUndefined();
    expect(migrated.places[0].photoUrl).toBe("");
    expect(migrated.playable).toBe(false);
  });
});

describe("gpx", () => {
  it("reads track points", () => {
    const xml = `<?xml version="1.0"?><gpx><trk><trkseg><trkpt lat="37.53865" lon="127.12385"></trkpt><trkpt lat="37.53891" lon="127.12755"></trkpt></trkseg></trk></gpx>`;
    expect(parseGpxTrack(xml)).toEqual([
      [127.12385, 37.53865],
      [127.12755, 37.53891],
    ]);
  });
});
