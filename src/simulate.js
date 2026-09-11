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
    if (mode === "denied" || mode === "unavailable" || mode === "timeout") return;
    timer = setInterval(() => {
      if (listeners.success || listeners.error) emit();
    }, 1500);
  }

  return {
    watchPosition(success, error) {
      listeners.success = success;
      listeners.error = error;
      queueMicrotask(() => {
        emit();
        startTicker();
      });
      return 1;
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
      return createVisibleFakeStream();
    },
  };
}

/** Prefer a canvas captureStream so the viewfinder is visibly "live" in ?sim=1. */
function createVisibleFakeStream() {
  if (typeof document !== "undefined" && typeof HTMLCanvasElement !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 540;
    const ctx = canvas.getContext("2d");
    if (ctx && typeof canvas.captureStream === "function") {
      let frame = 0;
      let raf = 0;
      const draw = () => {
        frame += 1;
        const t = frame / 30;
        ctx.fillStyle = "#152238";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#2a4a73";
        ctx.beginPath();
        ctx.arc(360 + Math.cos(t) * 80, 250 + Math.sin(t) * 40, 70, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f3efe4";
        ctx.font = "bold 36px sans-serif";
        ctx.fillText("SIM CAMERA", 240, 80);
        ctx.font = "22px sans-serif";
        ctx.fillText("미리보기 · 실제 카메라 아님", 220, 120);
        raf = requestAnimationFrame(draw);
      };
      draw();
      const stream = canvas.captureStream(20);
      const stopAll = () => {
        cancelAnimationFrame(raf);
        for (const track of stream.getTracks()) track.stop();
      };
      for (const track of stream.getTracks()) {
        const original = track.stop.bind(track);
        track.stop = () => {
          cancelAnimationFrame(raf);
          original();
        };
      }
      stream._stopSimulation = stopAll;
      return stream;
    }
  }

  const track = {
    readyState: "live",
    kind: "video",
    stop() {
      this.readyState = "ended";
    },
  };
  return {
    getTracks() {
      return [track];
    },
    getVideoTracks() {
      return [track];
    },
  };
}
