export function parseSim(search = "") {
  const params = new URLSearchParams(search);
  return {
    panel: params.get("sim") === "1",
    gps: params.get("gps") || "",
    camera: params.get("camera") || "",
    map: params.get("map") || "",
  };
}

export function createSimulatedGeolocation(mode, { stop } = {}) {
  const listeners = { success: null, error: null };
  let watchId = 0;
  let timer = null;
  let activeStop = stop;

  function clearTimer() {
    if (timer != null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function emit() {
    applyGpsMode(mode, {
      success: listeners.success,
      error: listeners.error,
      stop: activeStop,
    });
  }

  function startTicker() {
    clearTimer();
    // Keep emitting while watching so the player pin tracks like real GPS.
    if (mode === "denied" || mode === "unavailable" || mode === "timeout") return;
    timer = setInterval(() => {
      if (listeners.success || listeners.error) emit();
    }, 1500);
  }

  return {
    watchPosition(success, error) {
      listeners.success = success;
      listeners.error = error;
      watchId += 1;
      queueMicrotask(() => {
        emit();
        startTicker();
      });
      return watchId;
    },
    clearWatch() {
      listeners.success = null;
      listeners.error = null;
      clearTimer();
    },
    _setMode(next, ctx) {
      mode = next;
      if (ctx?.stop) activeStop = ctx.stop;
      if (listeners.success || listeners.error) {
        emit();
        startTicker();
      }
    },
  };
}

function applyGpsMode(mode, { success, error, stop }) {
  if (mode === "denied") {
    error?.({ code: 1, message: "denied" });
    return;
  }
  if (mode === "unavailable") {
    error?.({ code: 2, message: "unavailable" });
    return;
  }
  if (mode === "timeout") {
    error?.({ code: 3, message: "timeout" });
    return;
  }
  const target = stop?.coordinates ?? { lat: 37.53865, lng: 127.12385 };
  const inaccurate = mode === "inaccurate";
  const far = mode === "far";
  success?.({
    coords: {
      latitude: far ? target.lat + 0.01 : target.lat,
      longitude: far ? target.lng + 0.01 : target.lng,
      accuracy: inaccurate ? 180 : 18,
    },
  });
}

export function createSimulatedMedia(mode) {
  return {
    async getUserMedia() {
      if (mode === "denied") {
        const err = new Error("denied");
        err.name = "NotAllowedError";
        throw err;
      }
      if (mode === "unavailable") {
        const err = new Error("unavailable");
        err.name = "NotFoundError";
        throw err;
      }
      const track = {
        readyState: "live",
        stop() {
          this.readyState = "ended";
        },
      };
      return {
        getTracks() {
          return [track];
        },
      };
    },
  };
}
