import { screens as SCREEN_LIST } from "./content.js";
import { emptyPlacement, gridSizeForCount, isAssembled, piecesForGrid, shufflePieceOrder } from "./assemble.js";
import { SCHEMA_VERSION } from "./storage.js";
import { GRID_N, PERSONAL_TOTAL, PUZZLE_COUNT, piecesForStop } from "./coopPieces.js";

export const SCREENS = SCREEN_LIST;

export function createInitialState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    gameId: null,
    game: null,
    games: [],
    gamesError: null,
    screen: "library",
    currentStop: 1,
    collectedPieceIds: [],
    hintsUsed: {},
    startedAt: null,
    safetyAccepted: false,
    locationPermissionAsked: false,
    overlay: null,
    overlayReturnScreen: null,
    stoppedWalking: false,
    locationStatus: "idle",
    locationAccuracyMeters: null,
    distanceMeters: null,
    canAutoArrive: false,
    manualAvailable: false,
    mapStatus: "idle",
    playMode: "solo",
    party: null,
    partyWait: null,
    assemblePlacement: emptyPlacement(GRID_N),
    assembleOrder: [],
    assembleSelected: null,
    assembleComplete: false,
    createNotice: null,
    deleteGameId: null,
    deleteGameTitle: null,
    restored: false,
    invalidSave: false,
  };
}

export function needsLiveLocation(screen) {
  return screen === "preview" || screen === "navigating" || screen === "party";
}

export function needsCamera() {
  return false;
}

export function trayAllowed(screen) {
  return !["library", "create", "safety", "mode", "party"].includes(screen);
}

export function placeCount(state) {
  return state.game?.placeCount || 4;
}

export function puzzleCount(state) {
  return Number(state.game?.puzzleCount) || PUZZLE_COUNT;
}

export function gridN(state) {
  return gridSizeForCount(puzzleCount(state));
}

export function ensureAssembleKit(state) {
  if (!state.game) return state;
  const n = gridN(state);
  const ids = piecesForGrid(n).map((piece) => piece.id);
  return {
    ...state,
    assembleOrder: state.assembleOrder?.length === ids.length ? state.assembleOrder : shufflePieceOrder(ids),
    assemblePlacement: state.assemblePlacement?.["piece-1"] !== undefined ? state.assemblePlacement : emptyPlacement(n),
  };
}

export function applyPersisted(state, saved) {
  return {
    ...state,
    ...saved,
    overlay: null,
    overlayReturnScreen: null,
    stoppedWalking: false,
    locationStatus: saved.locationPermissionAsked ? "idle" : "idle",
    locationAccuracyMeters: null,
    distanceMeters: null,
    canAutoArrive: false,
    manualAvailable: Boolean(saved.locationPermissionAsked),
    mapStatus: "idle",
    assembleSelected: null,
    restored: true,
  };
}

export function reduce(state, action) {
  switch (action.type) {
    case "GAMES":
      return { ...state, games: action.games, gamesError: null };
    case "GAMES_ERROR":
      return { ...state, gamesError: action.error };
    case "RESTORE":
      return applyPersisted(createInitialState(), action.saved);
    case "INVALID_SAVE":
      return { ...createInitialState(), invalidSave: true };
    case "RESET":
      return {
        ...createInitialState(),
        games: state.games,
        game: null,
        screen: "library",
      };
    case "OPEN_CREATE":
      return { ...state, screen: "create", createNotice: null, overlay: null };
    case "OPEN_DELETE":
      return {
        ...state,
        overlay: "delete-game",
        deleteGameId: action.id,
        deleteGameTitle: action.title || "",
      };
    case "CREATE_SAVED":
      return {
        ...state,
        screen: "library",
        createNotice: action.message,
        games: action.games || state.games,
        overlay: null,
        deleteGameId: null,
        deleteGameTitle: null,
      };
    case "SELECT_GAME": {
      const game = action.game;
      const n = gridSizeForCount(game.puzzleCount || PUZZLE_COUNT);
      const ids = piecesForGrid(n).map((p) => p.id);
      return {
        ...createInitialState(),
        games: state.games,
        game,
        gameId: game.id,
        screen: "mode",
        startedAt: Date.now(),
        assemblePlacement: emptyPlacement(n),
        assembleOrder: shufflePieceOrder(ids),
      };
    }
    case "CHOOSE_SOLO":
      return { ...state, playMode: "solo", party: null, screen: "safety" };
    case "CHOOSE_COOP":
      return { ...state, playMode: "coop", screen: "party" };
    case "PARTY":
      return {
        ...state,
        playMode: "coop",
        party: action.party,
        partyWait: action.wait !== undefined ? action.wait : state.partyWait,
        screen: action.screen || state.screen,
        collectedPieceIds: action.collectedPieceIds || state.collectedPieceIds,
        currentStop: action.currentStop || state.currentStop,
        assemblePlacement: action.placement || state.assemblePlacement,
      };
    case "ACCEPT_SAFETY":
      return { ...state, safetyAccepted: true, screen: state.playMode === "coop" ? "party" : "preview" };
    case "CONTINUE": {
      const next = nextAfter(state.screen);
      return { ...state, screen: next, overlay: null, stoppedWalking: false };
    }
    case "PREV_PLACE": {
      if (state.currentStop <= 1) return { ...state, screen: "navigating" };
      return {
        ...state,
        currentStop: state.currentStop - 1,
        screen: "place",
        overlay: null,
        stoppedWalking: true,
      };
    }
    case "BACK":
      if (state.overlay) return { ...state, overlay: null };
      if (state.screen === "create") return { ...state, screen: "library" };
      if (state.screen === "navigating" || state.screen === "place") {
        return reduce(state, { type: "PREV_PLACE" });
      }
      return state;
    case "OPEN_NOTEBOOK":
      if (!trayAllowed(state.screen)) return state;
      return { ...state, overlay: "notebook", overlayReturnScreen: state.screen };
    case "CLOSE_OVERLAY":
      return { ...state, overlay: null, overlayReturnScreen: null, deleteGameId: null, deleteGameTitle: null };
    case "OPEN_HELP":
      return { ...state, overlay: "help" };
    case "OPEN_EXIT":
      return { ...state, overlay: "exit" };
    case "OPEN_MANUAL":
      return { ...state, overlay: "manual" };
    case "LOCATION_ASKED":
      return { ...state, locationPermissionAsked: true, locationStatus: "locating", manualAvailable: false };
    case "LOCATION_STATUS":
      return {
        ...state,
        locationStatus: action.status,
        locationAccuracyMeters: action.accuracyMeters ?? null,
        distanceMeters: action.distanceMeters ?? null,
        canAutoArrive: Boolean(action.canAutoArrive),
        manualAvailable: Boolean(action.manualAvailable),
      };
    case "ARRIVE": {
      if (!state.canAutoArrive && !action.manual) return state;
      return { ...state, screen: "place", overlay: null, stoppedWalking: false };
    }
    case "STOP_WALKING":
      return { ...state, stoppedWalking: true };
    case "COLLECT_PIECE": {
      const role = state.playMode === "coop" && state.party?.you?.role ? state.party.you.role : "solo";
      const ids = action.pieceIds || (action.pieceId ? [action.pieceId] : piecesForStop(state.currentStop, role, placeCount(state)));
      const collectedPieceIds = uniqueMany(state.collectedPieceIds, ids);
      const done = collectedPieceIds.length >= PERSONAL_TOTAL;
      return ensureAssembleKit({
        ...state,
        collectedPieceIds,
        screen: done ? "assemble" : "navigating",
        currentStop: done ? state.currentStop : state.currentStop + 1,
        stoppedWalking: false,
      });
    }
    case "USE_HINT":
      return { ...state, hintsUsed: { ...state.hintsUsed, [action.puzzleId]: true } };
    case "SELECT_PIECE":
      return { ...state, assembleSelected: action.pieceId };
    case "PLACE_PIECE": {
      const n = gridN(state);
      return {
        ...state,
        assemblePlacement: action.placement,
        assembleSelected: null,
        assembleComplete: isAssembled(action.placement, n),
      };
    }
    case "MAP_STATUS":
      return { ...state, mapStatus: action.status };
    case "GOTO":
      return { ...state, screen: action.screen, currentStop: action.stop ?? state.currentStop, overlay: null };
    default:
      return state;
  }
}

function nextAfter(screen) {
  if (screen === "preview") return "navigating";
  if (screen === "assemble") return "resolution";
  return screen;
}

function uniqueMany(list, ids) {
  const next = Array.isArray(list) ? [...list] : [];
  for (const id of ids || []) {
    if (id && !next.includes(id)) next.push(id);
  }
  return next;
}

export function currentPlace(state) {
  return state.game?.places?.find((p) => p.order === state.currentStop) || state.game?.places?.[0];
}
