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

export async function resolvePlace(url) {
  const res = await fetch("/api/places/resolve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "resolve");
  return data;
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
