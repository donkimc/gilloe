# Gilloe Two-Player Nearby Co-op Plan

**Status:** First client/server MVP implemented — still needs two-phone field testing  
**Scope:** Two people, two phones, one shared route session  
**Recommended puzzle:** Nine-piece 3×3 puzzle across four physical locations

## TL;DR

Two players can walk the same game together without exposing themselves to nearby strangers:

1. Player A opens a game and chooses **두 명이 함께 걷기**.
2. Gilloe creates a temporary party and an invite link or short code.
3. Player B opens the link or enters the code.
4. Both phones confirm that their users are near the same starting checkpoint.
5. Both tap **준비됐어요**.
6. At each of four stops, each player collects one different puzzle piece.
7. Four stops × two personal pieces = eight pieces.
8. When both players finish all four stops, Gilloe unlocks one shared center piece.
9. The players assemble a synchronized 3×3 puzzle together.

Each player owns four pieces and must place their own pieces on the shared board. Either player may place the ninth shared piece after both confirm completion.

For the first multiplayer MVP, joining should happen at the route start. Joining midway can be added later after the start flow is reliable.

## 1. Product decision

Use **invite-only nearby co-op**, not automatic discovery of strangers.

Gilloe must not announce that an unknown person is nearby, display another player's exact position, or invite strangers to meet. A player joins only through:

- a private invite link;
- a short temporary party code; or
- an in-person code shown on the host's phone.

Proximity confirms that both invited players are near the same public game checkpoint. It is not used to discover people.

## 2. Why use nine pieces at four locations

The existing puzzle system supports square puzzles. Nine pieces create an easy and balanced cooperative structure:

| Location | Player A | Player B | Team |
| --- | --- | --- | --- |
| Stop 1 | Piece A1 | Piece B1 | — |
| Stop 2 | Piece A2 | Piece B2 | — |
| Stop 3 | Piece A3 | Piece B3 | — |
| Stop 4 | Piece A4 | Piece B4 | — |
| Both finish | — | — | Center piece T1 |

Result:

- Player A collects four pieces.
- Player B collects four pieces.
- The party unlocks one shared piece.
- The final board is 3×3.
- Both people must participate to complete the normal co-op path.

The server assigns piece IDs when the party starts. The assignment must be deterministic for that party and must not change after refresh or reconnection.

## 3. Player flow

### Screen 1: Choose play mode

Offer:

- **혼자 걷기**
- **두 명이 함께 걷기**

Explain that two-player mode uses two phones and requires a temporary internet connection for synchronization.

### Screen 2: Create or join

Player A chooses **새 파티 만들기**.

Gilloe displays:

- private invite link;
- short code, such as six letters or digits;
- expiry time;
- **링크 공유하기**;
- **코드 복사하기**;
- cancel-party control.

Player B may:

- open the invite link; or
- choose **파티 코드 입력** and enter the short code.

The invite must identify the game and party without exposing either player's name, account, or location.

### Screen 3: Optional player labels

For the MVP, do not require accounts or real names. Assign:

- **탐험가 A**
- **탐험가 B**

Optionally allow a short local nickname with length and character limits. Do not require email, phone number, profile photograph, age, or social account.

### Screen 4: Nearby start check

After both players join:

1. Each phone requests location permission after a clear action.
2. Each phone determines locally whether the player is inside the start checkpoint radius.
3. Each phone sends only its readiness result, accuracy band, checkpoint ID, and timestamp to the party service.
4. Exact coordinates remain in browser memory and are not shared with the partner or stored in the party.
5. When both players are inside the same checkpoint and accuracy is acceptable, the party becomes ready.

Display only:

- **탐험가 A: 시작 지점 도착**
- **탐험가 B: 기다리는 중**

Never display the other player's coordinate, distance from the user, moving marker, route history, or background location.

If GPS is denied or inaccurate, use the existing confirmed manual-arrival fallback. For a manual start, require both the private invite and an additional in-person confirmation code displayed by one phone and entered on the other.

### Screen 5: Ready check

Both players tap **준비됐어요**. Start only when both are ready.

The party locks:

- game version;
- route version;
- piece assignment;
- player A/B roles;
- start time.

### Screen 6: Walk and collect

At each stop:

1. Each phone checks arrival independently.
2. A player who arrives sees **상대방을 기다리는 중** until the partner arrives.
3. Each player taps **내 조각 받기** on their own phone.
4. The server grants that player's assigned piece exactly once.
5. Both collected pieces appear in the party tray.
6. The next stop unlocks when both pieces are collected.

The UI can show presence states but not live location:

- 이동 중
- 도착
- 조각 받음
- 연결 끊김

### Screen 7: Shared final assembly

After both players collect four pieces:

1. The eight personal pieces appear on a synchronized 3×3 board.
2. Player A can move only A-owned pieces.
3. Player B can move only B-owned pieces.
4. Correct placements synchronize to both phones.
5. Wrong placements remain local and return to the tray.
6. When all eight personal pieces are placed, both tap **함께 완성하기**.
7. The ninth center piece unlocks.
8. Either player places the center piece.
9. Both phones show the completion animation and result.

This gives each person visible responsibility while avoiding simultaneous edits to the same piece.

## 4. Solo-mode puzzle behavior

Solo mode should still work with the same nine-piece image:

- each of four stops grants two pieces;
- completing all four stops grants eight pieces;
- the center piece unlocks after the final stop;
- one player assembles all nine pieces.

This lets one game asset support solo and co-op without separate puzzle artwork.

## 5. Party synchronization

For the disposable MVP, use the existing Node server with a short-lived in-memory party store.

Recommended synchronization:

- normal REST actions for create, join, ready, arrive, collect, place, leave, and convert-to-solo;
- lightweight polling every two seconds while a party screen is active;
- slower polling when the page is hidden;
- version numbers so a client receives updates only when state changes;
- idempotency keys for collect and place actions.

WebSockets are unnecessary for two players and add deployment complexity. The synchronized puzzle does not require frame-level updates.

Known MVP limitation: an application-server restart ends active in-memory parties. Document this clearly. Persistent party infrastructure can be evaluated after the experience proves useful.

## 6. Party data model

A conceptual short-lived party record:

```json
{
  "id": "unguessable-party-id",
  "gameId": "game-id",
  "gameVersion": 1,
  "inviteCodeHash": "hash",
  "status": "waiting | ready | active | assembling | complete | abandoned",
  "currentStop": 1,
  "members": [
    {
      "id": "member-a",
      "role": "A",
      "label": "탐험가 A",
      "ready": false,
      "checkpointState": "unknown | near | manual-confirmed",
      "accuracyBand": "good | weak | unavailable",
      "collectedPieceIds": [],
      "lastSeenAt": "timestamp"
    }
  ],
  "pieces": {
    "playerA": ["piece-1", "piece-3", "piece-6", "piece-8"],
    "playerB": ["piece-2", "piece-4", "piece-7", "piece-9"],
    "team": "piece-5"
  },
  "board": {},
  "version": 1,
  "createdAt": "timestamp",
  "expiresAt": "timestamp"
}
```

The sample IDs show ownership only; final piece positions may be shuffled per game. The team piece should be the visual center piece where possible.

Do not store:

- exact coordinates;
- location history;
- device identifiers;
- contacts;
- real names;
- chat messages;
- photographs of players.

## 7. Suggested API

```text
POST /api/parties
POST /api/parties/join
GET  /api/parties/:partyId?afterVersion=12
POST /api/parties/:partyId/ready
POST /api/parties/:partyId/checkpoints/:stopId/arrive
POST /api/parties/:partyId/checkpoints/:stopId/collect
POST /api/parties/:partyId/board/place
POST /api/parties/:partyId/complete-ready
POST /api/parties/:partyId/leave
POST /api/parties/:partyId/convert-to-solo
```

Authentication uses:

- an unguessable party secret or invite token;
- an unguessable per-member token stored locally;
- a short code only as a rate-limited fallback.

Never use the short code as the sole authorization secret after joining.

## 8. Server-authoritative rules

The server must enforce:

- maximum two active members;
- both members belong to the same party and game version;
- party state transitions occur in order;
- piece assignments cannot change mid-game;
- each personal piece can be collected once by its owner;
- a stop cannot advance until both required pieces are collected or solo conversion completes;
- board placement changes only the requesting player's pieces;
- team piece remains locked until all eight personal pieces are correctly placed and both players confirm;
- repeated requests are idempotent;
- expired or abandoned parties reject new actions.

GPS arrival remains a gameplay signal rather than a strong anti-cheat security boundary. The server should prevent state corruption without pretending browser GPS proves identity or physical presence.

## 9. Connection and dropout handling

### Temporary disconnection

- Keep a player in the party for five minutes.
- Let the player reconnect using the local member token.
- Restore stop, pieces, and board state.
- Show the partner **연결을 다시 기다리는 중**.

### Partner leaves

After a reasonable waiting period, offer the remaining player:

- **계속 기다리기**;
- **혼자 계속하기**;
- **게임 종료**.

When converting to solo:

- preserve already collected pieces;
- reassign missing partner pieces to the remaining player;
- unlock future stops under solo rules;
- record the conversion so the former partner cannot continue changing the board.

### GPS or permission failure

- A failure on one phone must not block the other permanently.
- Use confirmed manual arrival on the affected phone.
- Do not let one player confirm arrival for the partner.

### Conflicting actions

- Use party version numbers.
- Reject stale board mutations with the latest state.
- Make collect and placement actions idempotent.

## 10. Privacy and safety

- No automatic nearby-player discovery.
- No anonymous stranger matching.
- No map marker for the partner.
- No exact location sent to the partner.
- No continuous background tracking.
- No chat in the MVP.
- No public profile or contact exchange.
- Invite expires after a short period, such as 15 minutes before the game starts.
- Party expires a few hours after creation.
- Rate-limit code attempts and party creation.
- Provide leave, cancel, and report-a-problem controls.
- Do not encourage one player to wait in an unsafe area for the other.
- Each phone continues to show the route-exit and emergency-safe-exit guidance.

## 11. Mid-route joining

Do not implement unrestricted mid-route joining in the first multiplayer MVP.

Recommended first release:

- both players join at the start checkpoint;
- the party locks after the first stop begins;
- no third person can join;
- no replacement partner can join.

Later experiment:

- allow one invited partner to join only at the party's current checkpoint;
- require both players to be near that same checkpoint;
- require at least one uncompleted stop;
- give the new partner a personal welcome piece and future assigned pieces;
- keep past pieces team-owned;
- never advertise the active party to nearby strangers.

This later design requires a different puzzle-allocation rule and should be tested separately.

## 12. State machine

```text
solo-or-coop-selection
→ party-create-or-join
→ waiting-for-second-player
→ start-proximity-check
→ both-ready
→ active-stop-1
→ active-stop-2
→ active-stop-3
→ active-stop-4
→ shared-assembly
→ both-complete-ready
→ team-piece
→ complete
```

Alternative exits:

```text
waiting → cancelled
active → reconnecting
reconnecting → active
reconnecting → solo-converted
active → abandoned
```

## 13. Tests

### Party creation and joining

- invite link joins the correct game;
- short code is rate-limited and expires;
- a third member is rejected;
- duplicate joins are idempotent;
- cancelled and expired parties reject joins.

### Proximity and readiness

- both players must refer to the same start checkpoint;
- one ready player cannot start alone;
- exact coordinates are not saved in party state;
- manual confirmation requires the private in-person step;
- stale arrival claims expire.

### Piece distribution

- each stop assigns one unique piece to each player;
- each player finishes with four personal pieces;
- no piece can be collected twice;
- one player cannot collect the partner's piece;
- team center piece stays locked until the cooperative requirement is met;
- solo conversion reassigns missing pieces correctly.

### Shared assembly

- players can move only their own pieces;
- correct placement synchronizes;
- stale placement is rejected safely;
- reconnect restores the board;
- both completion confirmations unlock the center piece;
- final completion is identical on both devices.

### Privacy and failure

- party responses contain no coordinates or history;
- member tokens cannot access another party;
- expired party data is deleted;
- reconnect and dropout paths do not corrupt progress;
- one permission failure does not strand the party.

## 14. MVP metrics

Collect only non-location event counts needed to judge the experience:

- party created;
- partner joined;
- both ready;
- start failures;
- stops completed by both;
- average wait per stop;
- reconnects;
- solo conversions;
- parties reaching assembly;
- both players placing at least one piece;
- team completions;
- sync errors.

Do not record coordinate history. For the first test, these may be written as anonymous short-lived party events or captured by an observer rather than a third-party analytics SDK.

## 15. Acceptance criteria

The co-op prototype is ready for a two-person field test when:

- two phones can create and join one private party;
- both must be near the same start checkpoint or complete the manual in-person fallback;
- no exact partner position is displayed or stored;
- each of four stops grants one unique piece per player;
- each player collects four personal pieces;
- the ninth team piece requires both players;
- both clients remain synchronized after refresh and brief disconnection;
- duplicate requests cannot grant extra pieces;
- one player cannot move the other player's pieces;
- the remaining player can safely convert to solo after partner dropout;
- party codes, tokens, expiry, and rate limits work;
- the complete experience works without accounts or chat;
- the route and all stops have passed physical field verification;
- the existing solo game still works with the same nine-piece puzzle.

## 16. Implementation sequence after approval

1. Change the four-piece game asset to a nine-piece 3×3 puzzle.
2. Confirm the solo nine-piece distribution and assembly still work.
3. Add party state and secure temporary tokens to the Node server.
4. Add create, join, wait, ready, leave, and reconnect screens.
5. Add start-checkpoint proximity status without transmitting exact coordinates.
6. Add deterministic four-piece-per-player assignment.
7. Synchronize stop collection with versioned polling.
8. Add the shared assembly board and ownership rules.
9. Add the shared center-piece completion step.
10. Add dropout and solo-conversion recovery.
11. Add expiry, rate limits, validation, and cleanup.
12. Test with two browsers, two physical phones, and the real route.

## 17. Decisions to review

1. **Party model:** Invite-only two-person party; no stranger discovery.
2. **Devices:** One phone per player.
3. **Joining window:** Start checkpoint only for the first multiplayer MVP.
4. **Puzzle:** Nine-piece 3×3 board.
5. **Distribution:** Four personal pieces per player plus one shared center piece.
6. **Progress:** Next stop waits until both players collect their pieces.
7. **Final play:** Synchronized board; players place only their own pieces.
8. **Dropout:** Allow conversion to solo after a wait.
9. **Synchronization:** Versioned two-second polling rather than WebSockets.
10. **Privacy:** Checkpoint status only; no partner location display or history.
