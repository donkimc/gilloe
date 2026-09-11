import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  decodeMeta,
  formatWalkLabel,
  parseCoordsFromNaverUrl,
  straightRouteLine,
  validateGamePayload,
  walkingStats,
} from "./gameLogic.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const GAMES_FILE = path.join(DATA_DIR, "games.json");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const PORT = Number(process.env.PORT || 8787);
const MAX_JSON = 2_000_000;

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

async function fetchOsrmLine(places) {
  const coords = places.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${coords}?overview=full&geometries=geojson`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "user-agent": "gilloe-prototype/1" } });
    if (!res.ok) throw new Error("osrm");
    const data = await res.json();
    const line = data?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(line) || line.length < 2) throw new Error("empty");
    return line;
  } finally {
    clearTimeout(timer);
  }
}

async function resolvePlace(url) {
  const coordsFromUrl = parseCoordsFromNaverUrl(url);
  let finalUrl = url;
  let html = "";
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; Gilloe/1.0; +https://github.com/donkimc/gilloe)",
        accept: "text/html",
      },
      signal: AbortSignal.timeout(8000),
    });
    finalUrl = res.url || url;
    html = await res.text();
  } catch {
    /* parse URL only */
  }
  const coords = coordsFromUrl || parseCoordsFromNaverUrl(finalUrl);
  const meta = html ? decodeMeta(html) : { title: "", image: "", description: "" };
  const photoUrl = meta.image && !/blog|post|review/i.test(meta.image) ? meta.image : "";
  return {
    naverUrl: url,
    finalUrl,
    name: meta.title || "",
    address: "",
    blurb: meta.description || "",
    photoUrl,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    ok: Boolean(coords),
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

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
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
      const id = url.pathname.slice("/api/games/".length);
      const games = await readGames();
      const game = games.find((g) => g.id === id);
      if (!game) return notFound(res);
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
      const places = check.places.map((p, i) => ({
        order: i + 1,
        name: String(p.name || `장소 ${i + 1}`).slice(0, 80),
        address: String(p.address || "").slice(0, 120),
        blurb: String(p.blurb || "공개된 보행 공간에서 멈춰 조각을 받으세요.").slice(0, 200),
        lat: p.lat,
        lng: p.lng,
        naverUrl: String(p.naverUrl || ""),
        photoUrl: String(p.photoUrl || ""),
        arrivalRadiusMeters: 60,
      }));
      const stats = walkingStats(places);
      let routeLine = straightRouteLine(places);
      try {
        routeLine = await fetchOsrmLine(places);
      } catch {
        /* straight fallback */
      }
      let imageUrl = "";
      let systemImageId = check.jigsaw.systemImageId || null;
      if (check.jigsaw.source === "upload") {
        imageUrl = await saveUpload(check.jigsaw.imageDataUrl);
      } else if (check.jigsaw.source === "final-place") {
        imageUrl = places[places.length - 1].photoUrl || "";
        if (!imageUrl) {
          check.jigsaw.source = "system";
          systemImageId = systemImageId || "station";
        }
      } else {
        systemImageId = systemImageId || "station";
      }
      const game = {
        id: `game-${Date.now().toString(36)}`,
        title: check.title,
        type: "puzzle",
        placeCount: check.placeCount,
        places,
        jigsaw: {
          source: check.jigsaw.source,
          imageUrl,
          systemImageId,
        },
        stats,
        walkLabel: formatWalkLabel(stats),
        routeLine,
        fieldVerified: false,
        createdAt: Date.now(),
      };
      const games = await readGames();
      games.unshift(game);
      await writeGames(games);
      send(res, 201, game);
      return;
    }

    notFound(res);
  } catch (error) {
    send(res, 500, { error: error.message || "server" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Gilloe API http://127.0.0.1:${PORT}`);
});
