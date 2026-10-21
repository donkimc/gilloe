import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatWalkLabel, migrateGameRecord, placesMoved, validateGamePayload, walkingStatsFromLine } from "../src/routeSchema.js";
import { validateAiDraft, publicationBlockedReason } from "../src/routeSchema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_FILE = path.join(__dirname, "data", "games.json");
const DATA_DIR = process.env.GILLOE_DATA_DIR || path.join(__dirname, "data");
const GAMES_FILE = path.join(DATA_DIR, "games.json");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const DIST_DIR = path.join(__dirname, "..", "dist");
const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 8787);
const MAX_JSON = 2_000_000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".geojson": "application/geo+json",
  ".map": "application/json",
  ".woff2": "font/woff2",
};

async function readJsonArray(file) {
  try {
    const parsed = JSON.parse(await fs.readFile(file, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function readGames() {
  const games = await readJsonArray(GAMES_FILE);
  let changed = false;
  const next = games.map((game) => {
    const migrated = migrateGameRecord(game);
    if (JSON.stringify(migrated) !== JSON.stringify(game)) changed = true;
    return migrated;
  });
  if (changed) await writeGames(next);
  return next;
}

async function writeGames(games) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(GAMES_FILE, JSON.stringify(games, null, 2));
}

async function ensureGamesFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const existing = await readJsonArray(GAMES_FILE);
  if (existing.length) return;
  const seed = await readJsonArray(SEED_FILE);
  if (!seed.length || GAMES_FILE === SEED_FILE) return;
  await fs.writeFile(GAMES_FILE, JSON.stringify(seed, null, 2));
}

function send(res, status, body, headers = {}) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    ...headers,
  });
  res.end(json);
}

function notFound(res) {
  send(res, 404, { error: "not found" });
}

function gone(res, message) {
  send(res, 410, { error: message });
}

function isSafePath(root, target) {
  const resolved = path.resolve(target);
  return resolved === root || resolved.startsWith(root + path.sep);
}

async function serveStatic(req, res, url) {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  let relative = decodeURIComponent(url.pathname);
  if (relative === "/" || relative.endsWith("/")) relative = "/index.html";
  const filePath = path.join(DIST_DIR, relative);
  if (!isSafePath(path.resolve(DIST_DIR), filePath)) return false;
  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, {
      "content-type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "cache-control": relative === "/index.html" ? "no-cache" : "public, max-age=86400",
    });
    res.end(req.method === "HEAD" ? Buffer.alloc(0) : data);
    return true;
  } catch {
    if (path.extname(relative)) return false;
    try {
      const html = await fs.readFile(path.join(DIST_DIR, "index.html"));
      res.writeHead(200, { "content-type": MIME[".html"], "cache-control": "no-cache" });
      res.end(req.method === "HEAD" ? undefined : html);
      return true;
    } catch {
      return false;
    }
  }
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_JSON) throw new Error("too large");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function saveUpload(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("image");
  const buf = Buffer.from(match[2], "base64");
  if (buf.length > 1.5 * 1024 * 1024) throw new Error("size");
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const id = `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const ext = match[1].includes("png") ? "png" : match[1].includes("webp") ? "webp" : "jpg";
  const file = `${id}.${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, file), buf);
  return `/uploads/${file}`;
}

function gameIdFromPath(pathname) {
  const id = pathname.slice("/api/games/".length);
  return id && !id.includes("/") ? id : "";
}

function listItem(g) {
  return {
    id: g.id,
    title: g.title,
    type: g.type,
    placeCount: g.placeCount,
    walkingMeters: g.stats?.walkingMeters,
    durationMinutes: g.stats?.durationMinutes,
    walkLabel: formatWalkLabel(g.stats || { walkingMeters: 0, durationMinutes: 0 }),
    fieldStatus: g.fieldStatus,
    fieldVerified: Boolean(g.fieldVerified),
    quarantined: Boolean(g.quarantined),
    playable: g.playable !== false && !g.quarantined,
    publicationBlocked: Boolean(publicationBlockedReason(g)),
  };
}

async function assembleSavedGame(check, previous = null) {
  const method = check.method;
  const body = check.body || {};
  const places = check.places.map((p, i) => ({
    order: i + 1,
    name: String(p.name || p.title || `정류장 ${i + 1}`).slice(0, 80),
    address: String(p.address || "").slice(0, 120),
    blurb: String(p.blurb || p.directions || "공개된 보행 공간에서 멈춰 조각을 받으세요.").slice(0, 200),
    lat: p.lat,
    lng: p.lng,
    photoUrl: String(p.photoUrl || ""),
    arrivalRadiusMeters: Number(p.arrivalRadiusMeters) || Number(previous?.places?.[i]?.arrivalRadiusMeters) || 60,
    coordinateSource: p.coordinateSource || method,
    fieldVerified: false,
    publicStopConfirmed: Boolean(p.publicStopConfirmed),
    directions: String(p.directions || "").slice(0, 200),
    safeStandingNote: String(p.safeStandingNote || "requires physical verification").slice(0, 200),
  }));

  for (let i = 0; i < places.length; i += 1) {
    if (String(places[i].photoUrl).startsWith("data:image/")) {
      places[i].photoUrl = await saveUpload(places[i].photoUrl);
    }
  }

  const routeLine = Array.isArray(check.routeLine) && check.routeLine.length >= 2 ? check.routeLine : places.map((p) => [p.lng, p.lat]);
  const stats = walkingStatsFromLine(routeLine, places.length);

  let imageUrl = previous?.jigsaw?.imageUrl || "";
  let systemImageId = check.jigsaw.systemImageId || previous?.jigsaw?.systemImageId || null;
  const source = check.jigsaw.source === "final-place" ? "system" : check.jigsaw.source;
  if (source === "upload") {
    if (check.jigsaw.imageDataUrl) imageUrl = await saveUpload(check.jigsaw.imageDataUrl);
    else if (!imageUrl) throw new Error("사진을 올리세요.");
  } else {
    systemImageId = systemImageId || "station";
    if (source !== "upload") imageUrl = "";
  }

  const geometryChanged = previous ? placesMoved(previous.places, places) : false;
  const checklist = Boolean(body.checklistComplete);
  let fieldStatus = "verification-required";
  if (method === "creator-gps-recording" && checklist) fieldStatus = "field-verified";
  if (previous?.fieldStatus === "field-verified" && geometryChanged) fieldStatus = "verification-required";
  if (body.fieldStatus === "draft") fieldStatus = "draft";
  if (method !== "creator-gps-recording") fieldStatus = geometryChanged || !previous?.fieldVerified ? "verification-required" : previous.fieldStatus;

  const warnings = Array.isArray(body.warnings) ? body.warnings.slice(0, 12) : [];
  if (fieldStatus !== "field-verified" && !warnings.includes("현장 검증 전 임시 경로")) {
    warnings.unshift("현장 검증 전 임시 경로");
  }

  return {
    id: previous?.id || `game-${Date.now().toString(36)}`,
    schemaVersion: 1,
    title: check.title,
    type: "puzzle",
    placeCount: check.placeCount,
    places,
    jigsaw: {
      source,
      imageUrl,
      systemImageId,
      ownershipConfirmed: Boolean(check.jigsaw.ownershipConfirmed),
    },
    stats,
    walkLabel: formatWalkLabel(stats),
    routeLine,
    source: {
      method,
      proprietaryProviderDerived: false,
      mapDataAttribution: body.source?.mapDataAttribution || "© OpenStreetMap contributors",
      mapDataLicense: body.source?.mapDataLicense || "ODbL-1.0",
      generatedBy: body.source?.generatedBy || null,
    },
    sources: Array.isArray(body.sources) ? body.sources : [],
    fieldVerified: fieldStatus === "field-verified",
    fieldStatus,
    quarantined: false,
    quarantineReason: null,
    playable: true,
    publicationBlocked: fieldStatus !== "field-verified",
    warnings,
    createdAt: previous?.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
      "access-control-allow-headers": "content-type",
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

  try {
    if (req.method === "GET" && url.pathname.startsWith("/uploads/")) {
      const name = path.basename(url.pathname);
      const file = path.join(UPLOAD_DIR, name);
      const data = await fs.readFile(file);
      const type = name.endsWith(".png") ? "image/png" : name.endsWith(".webp") ? "image/webp" : "image/jpeg";
      res.writeHead(200, { "content-type": type, "cache-control": "public, max-age=86400" });
      res.end(data);
      return;
    }

    if (url.pathname === "/api/media" || url.pathname === "/api/places/resolve" || url.pathname === "/api/route") {
      return gone(res, "이 기능은 제거되었습니다. OpenStreetMap 또는 GPS로 경로를 만드세요.");
    }

    if (req.method === "POST" && url.pathname === "/api/ai/validate") {
      const body = await readBody(req);
      const result = validateAiDraft(String(body.json || ""));
      send(res, result.ok ? 200 : 400, result);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/games") {
      const games = await readGames();
      send(res, 200, games.map(listItem));
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/games/")) {
      const id = gameIdFromPath(url.pathname);
      const games = await readGames();
      const found = games.find((g) => g.id === id);
      if (!found) return notFound(res);
      send(res, 200, found);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/games") {
      const body = await readBody(req);
      const check = validateGamePayload(body);
      if (!check.ok) return send(res, 400, { error: check.error });
      const game = await assembleSavedGame(check);
      const games = await readGames();
      games.unshift(game);
      await writeGames(games);
      send(res, 201, game);
      return;
    }

    if (url.pathname.startsWith("/api/games/")) {
      const id = gameIdFromPath(url.pathname);
      if (!id) return notFound(res);
      const games = await readGames();
      const index = games.findIndex((g) => g.id === id);
      if (index < 0) return notFound(res);

      if (req.method === "PUT") {
        const body = await readBody(req);
        const check = validateGamePayload(body);
        if (!check.ok) return send(res, 400, { error: check.error });
        const game = await assembleSavedGame(check, games[index]);
        games[index] = game;
        await writeGames(games);
        send(res, 200, game);
        return;
      }

      if (req.method === "DELETE") {
        const next = games.filter((g) => g.id !== id);
        await writeGames(next);
        send(res, 200, { ok: true, id });
        return;
      }
    }

    if (!url.pathname.startsWith("/api") && (await serveStatic(req, res, url))) return;

    notFound(res);
  } catch (error) {
    send(res, 500, { error: error.message || "server" });
  }
});

export async function startApi() {
  await ensureGamesFile();
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.log(`Gilloe API already running on ${PORT}`);
      return;
    }
    throw error;
  });
  server.listen(PORT, HOST, () => {
    console.log(`Gilloe http://${HOST}:${PORT}`);
  });
}

startApi();
