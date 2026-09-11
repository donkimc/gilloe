import { screens as SCREEN_LIST, game } from "./content.js";

export const SCREENS = SCREEN_LIST;

const FLOW = SCREEN_LIST;

export function createInitialState() {
  return {
    schemaVersion: 1,
    gameId: game.id,
    playerMode: null,
    screen: "cover",
    currentStop: 1,
    solvedPuzzleIds: [],
    collectedCameraClueIds: [],
    cameraFallbackIds: [],
    hintsUsed: {},
    startedAt: null,
    duoPhase: null,
    discussedStops: [],
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
    accusationCheck: null,
    feedbackAnswers: {},
    puzzleDraft: {},
    puzzleMessage: null,
    restored: false,
    invalidSave: false,
  };
}

export function needsLiveLocation(screen) {
  return (
    screen === "route-overview" ||
    screen.startsWith("navigating-stop-")
  );
}

export function needsCamera(screen) {
  return screen === "camera-stop-2";
}

export function notebookAllowed(screen) {
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
    accusationCheck: null,
    puzzleDraft: {},
    puzzleMessage: null,
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
        duoPhase: duoStart(state.playerMode, screen),
        puzzleMessage: null,
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
      if (!notebookAllowed(state.screen)) return state;
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
        duoPhase: duoStart(state.playerMode, screen),
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
        screen: "clue-stop-2",
        duoPhase: duoStart(state.playerMode, "clue-stop-2"),
      };
    }
    case "STOP_WALKING":
      return { ...state, stoppedWalking: true };
    case "SET_DUO_PHASE":
      return { ...state, duoPhase: action.phase };
    case "DISCUSSED":
      return {
        ...state,
        discussedStops: unique(state.discussedStops, state.currentStop),
        duoPhase: "puzzle",
        screen: puzzleScreen(state.currentStop),
      };
    case "USE_HINT":
      return {
        ...state,
        hintsUsed: { ...state.hintsUsed, [action.puzzleId]: true },
      };
    case "PUZZLE_DRAFT":
      return { ...state, puzzleDraft: { ...state.puzzleDraft, ...action.draft } };
    case "PUZZLE_MESSAGE":
      return { ...state, puzzleMessage: action.message };
    case "SOLVE":
      return {
        ...state,
        solvedPuzzleIds: unique(state.solvedPuzzleIds, action.puzzleId),
        puzzleMessage: action.message,
      };
    case "AFTER_PUZZLE": {
      const screen = afterPuzzle(state.currentStop);
      return {
        ...state,
        screen,
        currentStop: stopFromScreen(screen) ?? state.currentStop,
        puzzleDraft: {},
        puzzleMessage: null,
        duoPhase: duoStart(state.playerMode, screen),
        stoppedWalking: false,
      };
    }
    case "ACCUSATION_RESULT":
      return { ...state, accusationCheck: action.check };
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
        duoPhase: duoStart(state.playerMode, action.screen),
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
  if (stop === 4) return "clue-stop-4";
  return `clue-stop-${stop}`;
}

function puzzleScreen(stop) {
  if (stop === 4) return "accusation";
  return `puzzle-stop-${stop}`;
}

function afterPuzzle(stop) {
  if (stop === 4) return "accusation";
  return `navigating-stop-${stop + 1}`;
}

function duoStart(mode, screen) {
  if (mode !== "duo") return null;
  if (screen.startsWith("clue-stop-") || screen === "camera-stop-2") return "witness";
  return null;
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
