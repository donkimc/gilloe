export async function listGames() {
  const res = await fetch("/api/games");
  if (!res.ok) throw new Error("list");
  return res.json();
}

export async function getGame(id) {
  const res = await fetch(`/api/games/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("game");
  return res.json();
}

export async function createGame(payload) {
  const res = await fetch("/api/games", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "create");
  return data;
}

export async function updateGame(id, payload) {
  const res = await fetch(`/api/games/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "update");
  return data;
}

export async function deleteGame(id) {
  const res = await fetch(`/api/games/${encodeURIComponent(id)}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "delete");
  return data;
}

export async function lookupOsmPlace(lat, lng) {
  const res = await fetch(`/api/osm/place?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "OpenStreetMap 장소를 찾지 못했습니다.");
  return data;
}

export async function lookupOsmWalkRoute(stops) {
  const res = await fetch("/api/osm/walk-route", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ stops }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "보행 경로를 만들지 못했습니다.");
  return data;
}
