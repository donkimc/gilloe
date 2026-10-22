import { createHash, randomBytes } from "node:crypto";
import {
  collectPiece,
  convertToSolo,
  createMember,
  createParty,
  hashInviteCode,
  joinParty,
  leaveParty,
  placePiece,
  publicParty,
  setCheckpoint,
  setCompleteReady,
  setReady,
  touchMember,
} from "../src/partyLogic.js";

const parties = new Map();
const codeIndex = new Map();
const joinAttempts = [];
const createAttempts = [];

function sha256Hex(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function token() {
  return randomBytes(18).toString("hex");
}

function inviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[randomBytes(1)[0] % alphabet.length]).join("");
}

function inPersonCode() {
  return String(1000 + (randomBytes(2).readUInt16BE(0) % 9000));
}

function rateOk(list, key, windowMs, max) {
  const now = Date.now();
  const next = list.filter((row) => now - row.at < windowMs);
  list.length = 0;
  list.push(...next);
  if (next.filter((row) => row.key === key).length >= max) return false;
  list.push({ key, at: now });
  return true;
}

function findById(id) {
  return parties.get(id) || null;
}

function save(party) {
  parties.set(party.id, party);
  return party;
}

function memberByToken(party, memberToken) {
  const hashed = sha256Hex(memberToken);
  return party.members.find((m) => m.tokenHash === hashed) || null;
}

function authParty(partyId, memberToken) {
  const party = findById(partyId);
  if (!party) return { ok: false, error: "파티를 찾지 못했습니다.", status: 404 };
  const member = memberByToken(party, memberToken);
  if (!member) return { ok: false, error: "다시 참여할 수 없습니다.", status: 403 };
  save(touchMember(party, member.id));
  return { ok: true, party: findById(partyId), member };
}

export function createPartyRecord(gameId, clientKey = "local", stopCount = 4) {
  if (!rateOk(createAttempts, clientKey, 10 * 60 * 1000, 8)) {
    return { ok: false, error: "잠시 후 다시 만들어 주세요.", status: 429 };
  }
  const now = Date.now();
  const id = token();
  const code = inviteCode();
  const salt = randomBytes(8).toString("hex");
  const memberToken = token();
  const person = inPersonCode();
  const host = createMember({ id: token(), role: "A", tokenHash: sha256Hex(memberToken), now });
  const party = save(
    createParty({
      id,
      gameId,
      codeHash: hashInviteCode(code, salt, sha256Hex),
      salt,
      host,
      now,
      inPersonCodeHash: sha256Hex(person),
      stopCount,
    }),
  );
  codeIndex.set(code, id);
  return {
    ok: true,
    party: publicParty(party, host.id),
    memberToken,
    memberId: host.id,
    inviteCode: code,
    invitePath: `/?party=${code}`,
    inPersonCode: person,
  };
}

export function joinByCode(code, clientKey = "local") {
  const normalized = String(code || "").trim().toUpperCase();
  if (!rateOk(joinAttempts, clientKey, 10 * 60 * 1000, 20)) {
    return { ok: false, error: "코드 입력을 잠시 멈추세요.", status: 429 };
  }
  const id = codeIndex.get(normalized);
  const party = id ? findById(id) : null;
  if (!party) return { ok: false, error: "코드를 확인하세요.", status: 404 };
  const hashed = hashInviteCode(normalized, party.salt, sha256Hex);
  if (hashed !== party.inviteCodeHash) return { ok: false, error: "코드를 확인하세요.", status: 404 };
  const now = Date.now();
  const memberToken = token();
  const guest = createMember({ id: token(), role: "B", tokenHash: sha256Hex(memberToken), now });
  const result = joinParty(party, guest, now);
  if (!result.ok) return { ...result, status: 400 };
  save(result.party);
  return {
    ok: true,
    party: publicParty(result.party, guest.id),
    memberToken,
    memberId: guest.id,
  };
}

export function getParty(partyId, memberToken, afterVersion = 0) {
  const auth = authParty(partyId, memberToken);
  if (!auth.ok) return auth;
  const view = publicParty(auth.party, auth.member.id);
  if (Number(afterVersion) >= view.version) return { ok: true, unchanged: true, version: view.version };
  return { ok: true, party: view };
}

export function partyAction(partyId, memberToken, kind, payload = {}) {
  const auth = authParty(partyId, memberToken);
  if (!auth.ok) return auth;
  const now = Date.now();
  let result;
  switch (kind) {
    case "checkpoint":
      result = setCheckpoint(auth.party, auth.member.id, payload, now);
      break;
    case "ready":
      result = setReady(auth.party, auth.member.id, now);
      break;
    case "collect":
      result = collectPiece(auth.party, auth.member.id, payload, now);
      break;
    case "place":
      result = placePiece(auth.party, auth.member.id, payload, now);
      break;
    case "complete-ready":
      result = setCompleteReady(auth.party, auth.member.id, now);
      break;
    case "leave":
      result = leaveParty(auth.party, auth.member.id, now);
      break;
    case "solo":
      result = convertToSolo(auth.party, auth.member.id, now);
      break;
    default:
      return { ok: false, error: "알 수 없는 동작입니다.", status: 400 };
  }
  if (!result.ok) return { ...result, status: 400 };
  save(result.party);
  return { ok: true, party: publicParty(result.party, auth.member.id) };
}

export function sweepParties(now = Date.now()) {
  for (const [id, party] of parties) {
    if (now > party.expiresAt || party.status === "abandoned") parties.delete(id);
  }
}

export function _resetPartiesForTests() {
  parties.clear();
  codeIndex.clear();
  joinAttempts.length = 0;
  createAttempts.length = 0;
}
