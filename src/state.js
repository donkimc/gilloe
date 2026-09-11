import { screens as SCREEN_LIST, game } from "./content.js";
import { emptyPlacement, isAssembled } from "./assemble.js";
import { SCHEMA_VERSION } from "./storage.js";

export const SCREENS = SCREEN_LIST;

const FLOW = SCREEN_LIST;

export function createInitialState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    gameId: game.id,
    playerMode: null,
    screen: "cover",
    currentStop: 1,
    collectedPieceIds: [],
    collectedCameraClueIds: [],
    cameraFallbackIds: [],
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
    cameraStatus: "idle",
    mapStatus: "idle",
    feedbackAnswers: {},
    assemblePlacement: emptyPlacement(),
    assembleOrder: ["piece-2", "piece-4", "piece-1", "piece-3"],
    assembleSelected: null,
    assembleComplete: false,
    restored: false,
    invalidSave: false,
  };
}

export function needsLiveLocation(screen) {
  return (
    screen === "route-overview" ||
    screen.startsWith("navigating-stop-") ||
    screen === "camera-stop-2"
  );
}

export function needsCamera(screen) {
  return screen === "camera-stop-2";
}

export function trayAllowed(screen) {
  const blocked = new Set(["cover", "mode", "safety"]);
  return !blocked.has(screen);
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
    manualAvailable: saved.locationPermissionAsked ? true : false,
    cameraStatus: "idle",
    mapStatus: "idle",
    assemblePlacement: saved.assemblePlacement || emptyPlacement(),
    assembleSelected: null,
    assembleComplete: isAssembled(saved.assemblePlacement || emptyPlacement()),
    restored: true,
  };
}

function nextScreen(screen) {
  const index = FLOW.indexOf(screen);
  if (index < 0 || index === FLOW.length - 1) return screen;
  return FLOW[index + 1];
}

function previousScreen(screen) {
  const index = FLOW.indexOf(screen);
  if (index <= 0) return screen;
  return FLOW[index - 1];
}

export function reduce(state, action) {
  switch (action.type) {
    case "RESTORE":
      return applyPersisted(createInitialState(), action.saved);
    case "INVALID_SAVE":
      return { ...createInitialState(), invalidSave: true };
    case "RESET":
      return createInitialState();
    case "SELECT_MODE":
      return {
        ...state,
        playerMode: action.mode,
        screen: "safety",
        startedAt: state.startedAt ?? Date.now(),
      };
    case "ACCEPT_SAFETY":
      return { ...state, safetyAccepted: true, screen: "briefing" };
    case "CONTINUE": {
      const screen = nextScreen(state.screen);
      const currentStop = stopFromScreen(screen) ?? state.currentStop;
      return {
        ...state,
        screen,
        currentStop,
        overlay: null,
        stoppedWalking: false,
        cameraStatus: needsCamera(screen) ? "idle" : "idle",
      };
    }
    case "BACK": {
      if (state.overlay) {
        return { ...state, overlay: null };
      }
      const screen = previousScreen(state.screen);
      return {
        ...state,
        screen,
        currentStop: stopFromScreen(screen) ?? state.currentStop,
        cameraStatus: "idle",
      };
    }
    case "OPEN_NOTEBOOK":
      if (!trayAllowed(state.screen)) return state;
      return {
        ...state,
        overlay: "notebook",
        overlayReturnScreen: state.screen,
      };
    case "CLOSE_OVERLAY":
      return { ...state, overlay: null, overlayReturnScreen: null };
    case "OPEN_HELP":
      return { ...state, overlay: "help" };
    case "OPEN_EXIT":
      return { ...state, overlay: "exit" };
    case "OPEN_MANUAL":
      return { ...state, overlay: "manual" };
    case "LOCATION_ASKED":
      return {
        ...state,
        locationPermissionAsked: true,
        locationStatus: "locating",
        manualAvailable: false,
      };
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
      const screen = arrivingScreen(state.currentStop);
      return {
        ...state,
        screen,
        overlay: null,
        stoppedWalking: false,
        cameraStatus: "idle",
      };
    }
    case "CAMERA_STATUS":
      return { ...state, cameraStatus: action.status };
    case "COLLECT_CAMERA": {
      const ids = unique(state.collectedCameraClueIds, "stop-2");
      const fallbackIds = action.fallback ? unique(state.cameraFallbackIds, "stop-2") : state.cameraFallbackIds;
      return {
        ...state,
        collectedCameraClueIds: ids,
        cameraFallbackIds: fallbackIds,
        cameraStatus: "stopped",
        screen: "piece-stop-2",
      };
    }
    case "STOP_WALKING":
      return { ...state, stoppedWalking: true };
    case "COLLECT_PIECE": {
      const pieceId = action.pieceId;
      const collectedPieceIds = unique(state.collectedPieceIds, pieceId);
      const afterFour = collectedPieceIds.length >= 4;
      const next = afterFour ? "assemble" : `navigating-stop-${state.currentStop + 1}`;
      return {
        ...state,
        collectedPieceIds,
        screen: next,
        currentStop: afterFour ? 4 : state.currentStop + 1,
        stoppedWalking: false,
      };
    }
    case "USE_HINT":
      return {
        ...state,
        hintsUsed: { ...state.hintsUsed, [action.puzzleId]: true },
      };
    case "SELECT_PIECE":
      return { ...state, assembleSelected: action.pieceId };
    case "PLACE_PIECE": {
      const assemblePlacement = action.placement;
      return {
        ...state,
        assemblePlacement,
        assembleSelected: null,
        assembleComplete: isAssembled(assemblePlacement),
      };
    }
    case "FEEDBACK":
      return {
        ...state,
        feedbackAnswers: { ...state.feedbackAnswers, [action.id]: action.value },
      };
    case "MAP_STATUS":
      return { ...state, mapStatus: action.status };
    case "GOTO":
      return {
        ...state,
        screen: action.screen,
        currentStop: action.stop ?? stopFromScreen(action.screen) ?? state.currentStop,
        overlay: null,
      };
    default:
      return state;
  }
}

export function stopFromScreen(screen) {
  const match = String(screen).match(/stop-(\d)/);
  return match ? Number(match[1]) : null;
}

function arrivingScreen(stop) {
  if (stop === 2) return "camera-stop-2";
  return `piece-stop-${stop}`;
}

function unique(list, value) {
  const next = Array.isArray(list) ? [...list] : [];
  if (!next.includes(value)) next.push(value);
  return next;
}

export function canTransitionToArrive(state, { manual }) {
  if (manual) return true;
  return Boolean(state.canAutoArrive);
}
