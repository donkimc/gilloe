export async function createParty(gameId) {
  const res = await fetch("/api/parties", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ gameId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "party");
  return data;
}

export async function joinParty(code) {
  const res = await fetch("/api/parties/join", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "join");
  return data;
}

export async function fetchParty(partyId, memberToken, afterVersion = 0) {
  const res = await fetch(`/api/parties/${encodeURIComponent(partyId)}?afterVersion=${afterVersion}`, {
    headers: { "x-party-token": memberToken },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "party");
  return data;
}

export async function partyAction(partyId, memberToken, path, body = {}) {
  const res = await fetch(`/api/parties/${encodeURIComponent(partyId)}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-party-token": memberToken },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "party");
  return data;
}
