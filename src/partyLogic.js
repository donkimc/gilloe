import { ownerOfPiece, PERSONAL_TOTAL, piecesForRole, piecesForStop, TEAM_PIECE } from "./coopPieces.js";

export const PARTY_STATUSES = ["waiting", "ready", "active", "assembling", "complete", "abandoned"];
export const WAITING_MS = 15 * 60 * 1000;
export const ACTIVE_MS = 6 * 60 * 60 * 1000;
export const RECONNECT_MS = 5 * 60 * 1000;
export const STALE_SEEN_MS = 20 * 1000;

export function hashInviteCode(code, salt, sha256Hex) {
  return sha256Hex(`${salt}:${String(code || "").trim().toUpperCase()}`);
}

export function createMember({ id, role, tokenHash, now }) {
  return {
    id,
    role,
    label: role === "A" ? "탐험가 A" : "탐험가 B",
    tokenHash,
    ready: false,
    completeReady: false,
    checkpointState: "unknown",
    accuracyBand: "unavailable",
    collectedPieceIds: [],
    arrivedStops: [],
    lastSeenAt: now,
    connected: true,
  };
}

export function createParty({ id, gameId, gameVersion = 1, codeHash, salt, host, now, inPersonCodeHash, stopCount = 4 }) {
  const stops = Number.isInteger(Number(stopCount)) ? Math.min(8, Math.max(2, Number(stopCount))) : 4;
  return {
    id,
    gameId,
    gameVersion,
    inviteCodeHash: codeHash,
    salt,
    inPersonCodeHash: inPersonCodeHash || null,
    status: "waiting",
    currentStop: 1,
    stopCount: stops,
    members: [host],
    pieces: piecesForRole(),
    board: {},
    convertedToSolo: false,
    version: 1,
    createdAt: now,
    expiresAt: now + WAITING_MS,
    startedAt: null,
  };
}

export function publicParty(party, memberId, now = Date.now()) {
  const you = (party.members || []).find((m) => m.id === memberId) || null;
  return {
    id: party.id,
    gameId: party.gameId,
    status: party.status,
    currentStop: party.currentStop,
    stopCount: party.stopCount || 4,
    version: party.version,
    expiresAt: party.expiresAt,
    convertedToSolo: Boolean(party.convertedToSolo),
    board: { ...party.board },
    pieces: party.pieces,
    members: (party.members || []).map((m) => ({
      role: m.role,
      label: m.label,
      ready: m.ready,
      completeReady: m.completeReady,
      checkpointState: m.checkpointState,
      accuracyBand: m.accuracyBand,
      collectedPieceIds: [...(m.collectedPieceIds || [])],
      arrivedStops: [...(m.arrivedStops || [])],
      presence: presenceOf(m, now),
    })),
    you: you
      ? {
          role: you.role,
          label: you.label,
          ownedPieceIds: you.role === "A" ? party.pieces.playerA : party.pieces.playerB,
        }
      : null,
  };
}

export function presenceOf(member, now) {
  if (!member?.lastSeenAt) return "연결 끊김";
  if (now - member.lastSeenAt > STALE_SEEN_MS) return "연결 끊김";
  return "연결됨";
}

export function assertFresh(party, now = Date.now()) {
  if (!party || party.status === "abandoned") return { ok: false, error: "파티가 끝났습니다." };
  if (now > party.expiresAt) return { ok: false, error: "파티가 만료되었습니다." };
  return { ok: true };
}

export function joinParty(party, guest, now = Date.now()) {
  const fresh = assertFresh(party, now);
  if (!fresh.ok) return fresh;
  if (party.status !== "waiting") return { ok: false, error: "이미 시작한 파티입니다." };
  if (party.members.some((m) => m.role === guest.role)) return { ok: false, error: "이미 참여한 역할입니다." };
  if (party.members.length >= 2) return { ok: false, error: "이 파티는 두 명만 참여할 수 있습니다." };
  return bump({ ...party, members: [...party.members, guest] });
}

export function touchMember(party, memberId, now = Date.now()) {
  return {
    ...party,
    members: party.members.map((m) => (m.id === memberId ? { ...m, lastSeenAt: now, connected: true } : m)),
  };
}

export function setCheckpoint(party, memberId, { stop, near, accuracyBand, manualConfirmed }, now = Date.now()) {
  const fresh = assertFresh(party, now);
  if (!fresh.ok) return fresh;
  if (Number(stop) !== Number(party.currentStop)) return { ok: false, error: "현재 정류장이 아닙니다." };
  const member = party.members.find((m) => m.id === memberId);
  if (!member) return { ok: false, error: "참가자를 찾지 못했습니다." };
  const arrived = Boolean(near || manualConfirmed);
  const arrivedStops = unique(member.arrivedStops, arrived ? party.currentStop : null);
  const next = {
    ...party,
    members: party.members.map((m) =>
      m.id === memberId
        ? {
            ...m,
            lastSeenAt: now,
            checkpointState: arrived ? (manualConfirmed ? "manual-confirmed" : "near") : "unknown",
            accuracyBand: accuracyBand || m.accuracyBand,
            arrivedStops,
          }
        : m,
    ),
  };
  return bump(maybeAdvanceStop(maybeReady(next)));
}

export function setReady(party, memberId, now = Date.now()) {
  const fresh = assertFresh(party, now);
  if (!fresh.ok) return fresh;
  if (party.members.length < 2 && !party.convertedToSolo) return { ok: false, error: "상대방을 먼저 기다리세요." };
  const member = party.members.find((m) => m.id === memberId);
  if (!member) return { ok: false, error: "참가자를 찾지 못했습니다." };
  if (!member.arrivedStops.includes(1) && party.status === "waiting") {
    return { ok: false, error: "시작 지점에 도착한 뒤 준비하세요." };
  }
  let next = {
    ...party,
    members: party.members.map((m) => (m.id === memberId ? { ...m, ready: true, lastSeenAt: now } : m)),
  };
  next = maybeStart(next, now);
  return bump(next);
}

export function collectPiece(party, memberId, { stop, pieceId }, now = Date.now()) {
  const fresh = assertFresh(party, now);
  if (!fresh.ok) return fresh;
  if (!["active", "assembling"].includes(party.status) && !party.convertedToSolo) {
    return { ok: false, error: "아직 걷기를 시작하지 않았습니다." };
  }
  if (Number(stop) !== Number(party.currentStop)) return { ok: false, error: "현재 정류장이 아닙니다." };
  const member = party.members.find((m) => m.id === memberId);
  if (!member) return { ok: false, error: "참가자를 찾지 못했습니다." };
  if (!member.arrivedStops.includes(party.currentStop)) return { ok: false, error: "정류장에 도착한 뒤 조각을 받으세요." };
  const allowed = party.convertedToSolo
    ? piecesForStop(stop, "solo", party.stopCount)
    : piecesForStop(stop, member.role, party.stopCount);
  if (!pieceId) {
    if (allowed.length) return { ok: false, error: "이 조각은 받을 수 없습니다." };
    return bump(maybeAdvanceStop(touchMember(party, memberId, now)));
  }
  if (!allowed.includes(pieceId)) return { ok: false, error: "이 조각은 받을 수 없습니다." };
  if (member.collectedPieceIds.includes(pieceId)) return bump(touchMember(party, memberId, now));
  if (allCollected(party).includes(pieceId)) return { ok: false, error: "이미 받은 조각입니다." };
  let next = {
    ...party,
    members: party.members.map((m) =>
      m.id === memberId ? { ...m, collectedPieceIds: unique(m.collectedPieceIds, pieceId), lastSeenAt: now } : m,
    ),
  };
  next = maybeAdvanceStop(next);
  return bump(next);
}

export function placePiece(party, memberId, { pieceId, cell, correct }, now = Date.now()) {
  const fresh = assertFresh(party, now);
  if (!fresh.ok) return fresh;
  const member = party.members.find((m) => m.id === memberId);
  if (!member) return { ok: false, error: "참가자를 찾지 못했습니다." };
  if (!correct) return bump(touchMember(party, memberId, now));
  const owner = ownerOfPiece(pieceId, party.pieces);
  if (owner === "team") {
    if (!teamUnlocked(party)) return { ok: false, error: "가운데 조각은 아직 잠겨 있습니다." };
  } else if (!party.convertedToSolo && owner !== member.role) {
    return { ok: false, error: "상대방 조각은 놓을 수 없습니다." };
  }
  if (!member.collectedPieceIds.includes(pieceId) && owner !== "team") {
    return { ok: false, error: "아직 모으지 않은 조각입니다." };
  }
  const next = {
    ...party,
    status: party.status === "complete" ? "complete" : "assembling",
    board: { ...party.board, [pieceId]: cell },
    members: party.members.map((m) => (m.id === memberId ? { ...m, lastSeenAt: now } : m)),
  };
  return bump(next);
}

export function setCompleteReady(party, memberId, now = Date.now()) {
  const fresh = assertFresh(party, now);
  if (!fresh.ok) return fresh;
  if (!personalBoardComplete(party)) return { ok: false, error: "개인 조각을 먼저 모두 놓으세요." };
  let next = {
    ...party,
    members: party.members.map((m) => (m.id === memberId ? { ...m, completeReady: true, lastSeenAt: now } : m)),
  };
  if (party.convertedToSolo || next.members.filter((m) => m.completeReady).length >= Math.min(2, next.members.length)) {
    const host = next.members[0];
    next = {
      ...next,
      members: next.members.map((m) =>
        m.id === host.id ? { ...m, collectedPieceIds: unique(m.collectedPieceIds, TEAM_PIECE) } : m,
      ),
    };
  }
  return bump(next);
}

export function leaveParty(party, memberId, now = Date.now()) {
  if (!party) return { ok: false, error: "파티가 없습니다." };
  const remaining = party.members.filter((m) => m.id !== memberId);
  if (!remaining.length) return bump({ ...party, status: "abandoned", members: [], expiresAt: now });
  return bump({
    ...party,
    members: remaining.map((m) => ({ ...m, lastSeenAt: now })),
  });
}

export function convertToSolo(party, memberId, now = Date.now()) {
  const fresh = assertFresh(party, now);
  if (!fresh.ok) return fresh;
  const member = party.members.find((m) => m.id === memberId);
  if (!member) return { ok: false, error: "참가자를 찾지 못했습니다." };
  const partner = party.members.find((m) => m.id !== memberId);
  if (partner && now - partner.lastSeenAt < RECONNECT_MS && partner.connected !== false) {
    return { ok: false, error: "상대방을 조금 더 기다려 주세요." };
  }
  const leftover = (partner?.collectedPieceIds || []).filter((id) => !member.collectedPieceIds.includes(id));
  return bump({
    ...party,
    convertedToSolo: true,
    members: [
      {
        ...member,
        collectedPieceIds: [...member.collectedPieceIds, ...leftover],
        lastSeenAt: now,
      },
    ],
    expiresAt: now + ACTIVE_MS,
  });
}

function maybeReady(party) {
  if (party.status !== "waiting") return party;
  if (party.members.length < 2) return party;
  const bothNear = party.members.every((m) => m.arrivedStops.includes(1));
  return bothNear ? { ...party, status: "ready" } : party;
}

function maybeStart(party, now) {
  const needed = party.convertedToSolo ? 1 : 2;
  if (party.members.filter((m) => m.ready).length < needed) return party;
  if (party.status === "waiting" && needed === 2 && party.members.length < 2) return party;
  if (["active", "assembling", "complete"].includes(party.status)) return party;
  return {
    ...party,
    status: "active",
    startedAt: party.startedAt || now,
    expiresAt: (party.startedAt || now) + ACTIVE_MS,
  };
}

function stopCountOf(party) {
  const n = Number(party.stopCount);
  return Number.isInteger(n) && n >= 2 ? Math.min(8, n) : 4;
}

function membersArrived(party, stop) {
  const needed = party.convertedToSolo ? 1 : Math.max(1, party.members.length);
  return party.members.filter((m) => (m.arrivedStops || []).includes(stop)).length >= needed;
}

function maybeAdvanceStop(party) {
  if (!["active", "assembling"].includes(party.status) && !party.convertedToSolo) return party;
  const stopCount = stopCountOf(party);
  const need = party.convertedToSolo
    ? piecesForStop(party.currentStop, "solo", stopCount)
    : [...piecesForStop(party.currentStop, "A", stopCount), ...piecesForStop(party.currentStop, "B", stopCount)];
  const have = allCollected(party);
  if (need.length && !need.every((id) => have.includes(id))) return party;
  if (!membersArrived(party, party.currentStop)) return party;
  if (party.currentStop >= stopCount) {
    return { ...party, status: "assembling" };
  }
  return {
    ...party,
    currentStop: party.currentStop + 1,
    members: party.members.map((m) => ({ ...m, checkpointState: "unknown" })),
  };
}

function allCollected(party) {
  return party.members.flatMap((m) => m.collectedPieceIds || []);
}

function personalBoardComplete(party) {
  const personal = [...party.pieces.playerA, ...party.pieces.playerB];
  return personal.every((id) => party.board[id]);
}

export function teamUnlocked(party) {
  if (!personalBoardComplete(party)) return false;
  const needed = party.convertedToSolo ? 1 : 2;
  return party.members.filter((m) => m.completeReady).length >= Math.min(needed, party.members.length);
}

function unique(list, value) {
  const next = Array.isArray(list) ? [...list] : [];
  if (value && !next.includes(value)) next.push(value);
  return next;
}

function bump(party) {
  return { ok: true, party: { ...party, version: (party.version || 0) + 1 } };
}

export function containsCoordinates(value) {
  const text = JSON.stringify(value);
  return /"(lat|lng|latitude|longitude)"\s*:/.test(text);
}
