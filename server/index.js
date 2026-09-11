import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractNaverPlaceId,
  formatWalkLabel,
  parseCoordsFromNaverUrl,
  parsePlaceDetailHtml,
  placePageUrl,
  placesMoved,
  straightRouteLine,
  validateGamePayload,
  walkingStats,
} from "./gameLogic.js";
import { fetchOsrmLine, withWalkingLine } from "./osrm.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
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

async function readGames() {
  try {
    const raw = await fs.readFile(GAMES_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeGames(games) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(GAMES_FILE, JSON.stringify(games, null, 2));
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


const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function fetchText(target) {
  let current = target;
  for (let hop = 0; hop < 8; hop += 1) {
    const res = await fetch(current, {
      redirect: "manual",
      headers: {
        "user-agent": BROWSER_UA,
        accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(12000),
    });
    const location = res.headers.get("location");
    if (location && [301, 302, 303, 307, 308].includes(res.status)) {
      current = new URL(location, current).href;
      continue;
    }
    return { finalUrl: res.url || current, html: await res.text(), ok: res.ok };
  }
  return { finalUrl: current, html: "", ok: false };
}

async function resolvePlace(url) {
  let finalUrl = url;
  let html = "";
  try {
    const first = await fetchText(url);
    finalUrl = first.finalUrl;
    html = first.html;
  } catch {
    /* parse URL only */
  }

  const placeId = extractNaverPlaceId(finalUrl) || extractNaverPlaceId(url);
  let detail = parsePlaceDetailHtml(html);
  if (placeId && (detail.lat == null || !detail.name)) {
    try {
      const page = await fetchText(placePageUrl(placeId));
      detail = parsePlaceDetailHtml(page.html);
      if (page.finalUrl) finalUrl = page.finalUrl;
    } catch {
      /* keep first-pass detail */
    }
  }

  const coords = parseCoordsFromNaverUrl(url) || parseCoordsFromNaverUrl(finalUrl);
  const lat = coords?.lat ?? detail.lat;
  const lng = coords?.lng ?? detail.lng;
  return {
    naverUrl: url,
    finalUrl,
    name: detail.name || "",
    address: detail.address || "",
    blurb: detail.blurb || "",
    photoUrl: detail.photoUrl || "",
    lat: lat ?? null,
    lng: lng ?? null,
    ok: Number.isFinite(lat) && Number.isFinite(lng),
  };
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

async function assembleSavedGame(check, previous = null) {
  const places = check.places.map((p, i) => ({
    order: i + 1,
    name: String(p.name || `장소 ${i + 1}`).slice(0, 80),
    address: String(p.address || "").slice(0, 120),
    blurb: String(p.blurb || "공개된 보행 공간에서 멈춰 조각을 받으세요.").slice(0, 200),
    lat: p.lat,
    lng: p.lng,
    naverUrl: String(p.naverUrl || ""),
    photoUrl: String(p.photoUrl || ""),
    arrivalRadiusMeters: Number(previous?.places?.[i]?.arrivalRadiusMeters) || 60,
  }));
  const stats = walkingStats(places);
  let routeLine = previous?.routeLine;
  if (!previous || placesMoved(previous.places, places)) {
    routeLine = straightRouteLine(places);
    try {
      routeLine = await fetchOsrmLine(places);
    } catch {
      /* straight fallback */
    }
  }
  let imageUrl = previous?.jigsaw?.imageUrl || "";
  let systemImageId = check.jigsaw.systemImageId || previous?.jigsaw?.systemImageId || null;
  const source = check.jigsaw.source;
  if (source === "upload") {
    if (check.jigsaw.imageDataUrl) imageUrl = await saveUpload(check.jigsaw.imageDataUrl);
    else if (!imageUrl) throw new Error("사진을 올리세요.");
  } else if (source === "final-place") {
    imageUrl = places[places.length - 1].photoUrl || "";
    if (!imageUrl) {
      systemImageId = systemImageId || "station";
      return finish("system", imageUrl, systemImageId);
    }
  } else {
    systemImageId = systemImageId || "station";
    imageUrl = "";
  }
  return finish(source, imageUrl, systemImageId);

  function finish(jigsawSource, url, sysId) {
    return {
      id: previous?.id || `game-${Date.now().toString(36)}`,
      title: check.title,
      type: "puzzle",
      placeCount: check.placeCount,
      places,
      jigsaw: {
        source: jigsawSource === "final-place" && !url ? "system" : jigsawSource,
        imageUrl: url,
        systemImageId: sysId,
      },
      stats,
      walkLabel: formatWalkLabel(stats),
      routeLine,
      fieldVerified: false,
      createdAt: previous?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
  }
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

    if (req.method === "GET" && url.pathname === "/api/games") {
      const games = await readGames();
      send(
        res,
        200,
        games.map((g) => ({
          id: g.id,
          title: g.title,
          type: g.type,
          placeCount: g.placeCount,
          walkingMeters: g.stats.walkingMeters,
          durationMinutes: g.stats.durationMinutes,
          walkLabel: formatWalkLabel(g.stats),
        })),
      );
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/games/")) {
      const id = gameIdFromPath(url.pathname);
      const games = await readGames();
      const found = games.find((g) => g.id === id);
      if (!found) return notFound(res);
      const { game, changed } = await withWalkingLine(found);
      if (changed) {
        await writeGames(games.map((item) => (item.id === id ? game : item)));
      }
      send(res, 200, game);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/places/resolve") {
      const body = await readBody(req);
      const target = String(body.url || "").trim();
      if (!target.startsWith("http")) return send(res, 400, { error: "네이버 지도 URL을 붙여 넣으세요." });
      const place = await resolvePlace(target);
      send(res, 200, place);
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

export function startApi() {
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
