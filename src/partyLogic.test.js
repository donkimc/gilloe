import { describe, expect, it } from "vitest";
import { piecesForStop, TEAM_PIECE } from "./coopPieces.js";
import {
  collectPiece,
  containsCoordinates,
  convertToSolo,
  createMember,
  createParty,
  joinParty,
  placePiece,
  publicParty,
  setCheckpoint,
  setCompleteReady,
  setReady,
} from "./partyLogic.js";

function hash(s) {
  return `h:${s}`;
}

function host(now = Date.now()) {
  return createMember({ id: "a", role: "A", tokenHash: hash("ta"), now });
}

function guest(now = Date.now()) {
  return createMember({ id: "b", role: "B", tokenHash: hash("tb"), now });
}

function startedParty(now = Date.now(), stopCount = 4) {
  let party = createParty({
    id: "p1",
    gameId: "g1",
    codeHash: hash("CODE"),
    salt: "s",
    host: host(now),
    now,
    stopCount,
  });
  party = joinParty(party, guest(now), now).party;
  party = setCheckpoint(party, "a", { stop: 1, near: true, accuracyBand: "good" }, now).party;
  party = setCheckpoint(party, "b", { stop: 1, near: true, accuracyBand: "good" }, now).party;
  party = setReady(party, "a", now).party;
  party = setReady(party, "b", now).party;
  return party;
}

describe("party join", () => {
  it("lets a second member join and rejects a third", () => {
    const now = 10;
    let party = createParty({ id: "p1", gameId: "g1", codeHash: "h", salt: "s", host: host(now), now });
    const joined = joinParty(party, guest(now), now);
    expect(joined.ok).toBe(true);
    expect(joined.party.members).toHaveLength(2);
    const third = joinParty(joined.party, createMember({ id: "c", role: "B", tokenHash: "x", now }), now);
    expect(third.ok).toBe(false);
  });
});

describe("start gate", () => {
  it("does not start until both are near stop 1 and ready", () => {
    const now = 20;
    let party = createParty({ id: "p1", gameId: "g1", codeHash: "h", salt: "s", host: host(now), now });
    party = joinParty(party, guest(now), now).party;
    expect(setReady(party, "a", now).ok).toBe(false);
    party = setCheckpoint(party, "a", { stop: 1, near: true, accuracyBand: "good" }, now).party;
    party = setCheckpoint(party, "b", { stop: 1, near: true, accuracyBand: "good" }, now).party;
    expect(party.status).toBe("ready");
    party = setReady(party, "a", now).party;
    expect(party.status).toBe("ready");
    party = setReady(party, "b", now).party;
    expect(party.status).toBe("active");
  });

  it("does not store coordinates in party or public views", () => {
    const party = startedParty();
    expect(containsCoordinates(party)).toBe(false);
    expect(containsCoordinates(publicParty(party, "a"))).toBe(false);
  });
});

describe("piece collection", () => {
  it("gives each player only their stop piece and advances after both collect", () => {
    const now = Date.now();
    let party = startedParty(now);
    expect(collectPiece(party, "a", { stop: 1, pieceId: piecesForStop(1, "B")[0] }, now).ok).toBe(false);
    party = collectPiece(party, "a", { stop: 1, pieceId: "piece-1" }, now).party;
    expect(party.currentStop).toBe(1);
    const again = collectPiece(party, "a", { stop: 1, pieceId: "piece-1" }, now);
    expect(again.ok).toBe(true);
    party = collectPiece(party, "b", { stop: 1, pieceId: "piece-2" }, now).party;
    expect(party.currentStop).toBe(2);
  });
});

describe("assembly ownership", () => {
  it("blocks moving the partner piece and unlocks the center after both confirm", () => {
    const now = Date.now();
    let party = startedParty(now);
    for (const stop of [1, 2, 3, 4]) {
      party = setCheckpoint(party, "a", { stop, near: true, accuracyBand: "good" }, now + stop).party;
      party = setCheckpoint(party, "b", { stop, near: true, accuracyBand: "good" }, now + stop).party;
      party = collectPiece(party, "a", { stop, pieceId: piecesForStop(stop, "A")[0] }, now + stop).party;
      party = collectPiece(party, "b", { stop, pieceId: piecesForStop(stop, "B")[0] }, now + stop).party;
    }
    expect(party.status).toBe("assembling");
    expect(placePiece(party, "a", { pieceId: "piece-2", cell: "r0c1", correct: true }).ok).toBe(false);
    party = placePiece(party, "a", { pieceId: "piece-1", cell: "r0c0", correct: true }).party;
    expect(party.board["piece-1"]).toBe("r0c0");
    for (const [role, ids] of [
      ["a", ["piece-3", "piece-6", "piece-8"]],
      ["b", ["piece-2", "piece-4", "piece-7", "piece-9"]],
    ]) {
      for (const id of ids) {
        party = placePiece(party, role, { pieceId: id, cell: `cell-${id}`, correct: true }).party;
      }
    }
    expect(setCompleteReady(party, "a").ok).toBe(true);
    party = setCompleteReady(party, "a").party;
    expect(party.members.some((m) => m.collectedPieceIds.includes(TEAM_PIECE))).toBe(false);
    party = setCompleteReady(party, "b").party;
    expect(party.members.some((m) => m.collectedPieceIds.includes(TEAM_PIECE))).toBe(true);
  });
});

describe("longer routes", () => {
  it("walks a six-stop game before assembling", () => {
    const now = Date.now();
    let party = startedParty(now, 6);
    expect(party.stopCount).toBe(6);
    for (let step = 1; step <= 8 && party.status !== "assembling"; step += 1) {
      const stop = party.currentStop;
      party = setCheckpoint(party, "a", { stop, near: true, accuracyBand: "good" }, now + step).party;
      party = setCheckpoint(party, "b", { stop: party.currentStop, near: true, accuracyBand: "good" }, now + step).party;
      if (party.status === "assembling" || party.currentStop !== stop) continue;
      const aIds = piecesForStop(stop, "A", 6);
      const bIds = piecesForStop(stop, "B", 6);
      for (const pieceId of bIds) {
        const result = collectPiece(party, "b", { stop, pieceId }, now + step);
        expect(result.ok).toBe(true);
        party = result.party;
      }
      for (const pieceId of aIds) {
        const result = collectPiece(party, "a", { stop, pieceId }, now + step);
        expect(result.ok).toBe(true);
        party = result.party;
      }
      if (!aIds.length && !bIds.length) {
        party = collectPiece(party, "a", { stop, pieceId: "" }, now + step).party;
        if (party.currentStop === stop && party.status !== "assembling") {
          party = collectPiece(party, "b", { stop, pieceId: "" }, now + step).party;
        }
      }
    }
    expect(party.status).toBe("assembling");
    expect(party.currentStop).toBe(6);
  });
});

describe("solo conversion", () => {
  it("reassigns the missing partner pieces after dropout", () => {
    const now = Date.now();
    let party = startedParty(now);
    party = collectPiece(party, "a", { stop: 1, pieceId: "piece-1" }, now).party;
    party = {
      ...party,
      members: party.members.map((m) => (m.id === "b" ? { ...m, lastSeenAt: now, connected: false } : m)),
    };
    const converted = convertToSolo(party, "a", now + 6 * 60 * 1000);
    expect(converted.ok).toBe(true);
    expect(converted.party.convertedToSolo).toBe(true);
    expect(converted.party.members).toHaveLength(1);
  });
});
