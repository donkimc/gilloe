/**
 * World-lock for the Stop 2 navy umbrella (no AR framework).
 * Combines orientation sensors + pointer look-around so the clue stays in
 * physical/heading space instead of a fixed CSS spot on the screen.
 */

const PX_PER_DEG_X = 12;
const PX_PER_DEG_Y = 14;
const VISIBLE_DEG = 42;

function shortestDelta(from, to) {
  let d = to - from;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

function poseFromLook(lookYaw, lookPitch, targetYaw, targetPitch) {
  const yaw = shortestDelta(lookYaw, targetYaw);
  const pitch = shortestDelta(lookPitch, targetPitch);
  // Phone turns right → world object slides left on the viewfinder.
  const x = yaw * PX_PER_DEG_X;
  const y = -pitch * PX_PER_DEG_Y;
  const distance = Math.hypot(yaw, pitch);
  return {
    x,
    y,
    scale: Math.max(0.7, 1.2 - distance * 0.012),
    visible: distance < VISIBLE_DEG,
    ready: true,
    yaw,
    pitch,
  };
}

export function createWorldAnchor({
  root = typeof window !== "undefined" ? window : null,
  documentRef = typeof document !== "undefined" ? document : null,
} = {}) {
  let listening = false;
  let sensor = null;
  let onUpdate = null;
  let raf = 0;
  let calibrated = false;
  let originYaw = 0;
  let originPitch = 0;
  let targetYaw = 18;
  let targetPitch = -8;
  let lookYaw = 0;
  let lookPitch = 0;
  let pointerDrag = null;
  let viewfinderEl = null;

  function emit() {
    if (!onUpdate) return;
    if (!calibrated) {
      onUpdate({ x: 0, y: 0, scale: 1, visible: true, ready: false });
      return;
    }
    onUpdate(poseFromLook(lookYaw, lookPitch, targetYaw, targetPitch));
  }

  function calibrateIfNeeded() {
    if (calibrated) return;
    originYaw = lookYaw;
    originPitch = lookPitch;
    // Anchor the umbrella slightly off the first framing direction.
    targetYaw = originYaw + 14;
    targetPitch = originPitch - 6;
    calibrated = true;
  }

  function setLookFromDevice(alpha, beta) {
    // alpha: compass yaw, beta: front-back tilt. Normalize into look space.
    lookYaw = alpha;
    lookPitch = beta;
    calibrateIfNeeded();
    emit();
  }

  function onDeviceOrientation(event) {
    if (event.alpha == null || event.beta == null) return;
    setLookFromDevice(event.alpha, event.beta);
  }

  function startOrientationListeners() {
    if (!root) return false;
    root.addEventListener("deviceorientationabsolute", onDeviceOrientation, true);
    root.addEventListener("deviceorientation", onDeviceOrientation, true);
    return true;
  }

  function stopOrientationListeners() {
    if (!root) return;
    root.removeEventListener("deviceorientationabsolute", onDeviceOrientation, true);
    root.removeEventListener("deviceorientation", onDeviceOrientation, true);
  }

  function startGenericSensor() {
    if (typeof root?.RelativeOrientationSensor !== "function") return false;
    try {
      sensor = new root.RelativeOrientationSensor({ frequency: 30, referenceFrame: "screen" });
      sensor.addEventListener("reading", () => {
        const q = sensor.quaternion;
        if (!q) return;
        const [x, y, z, w] = q;
        // Yaw / pitch from quaternion (screen frame).
        const yaw = (Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z)) * 180) / Math.PI;
        const pitch = (Math.asin(Math.max(-1, Math.min(1, 2 * (w * y - z * x)))) * 180) / Math.PI;
        setLookFromDevice(yaw, pitch);
      });
      sensor.addEventListener("error", () => {
        try {
          sensor.stop();
        } catch {
          /* ignore */
        }
        sensor = null;
      });
      sensor.start();
      return true;
    } catch {
      sensor = null;
      return false;
    }
  }

  function stopGenericSensor() {
    if (!sensor) return;
    try {
      sensor.stop();
    } catch {
      /* ignore */
    }
    sensor = null;
  }

  function onPointerDown(event) {
    if (!viewfinderEl) return;
    pointerDrag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      yaw: lookYaw,
      pitch: lookPitch,
    };
    try {
      viewfinderEl.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onPointerMove(event) {
    if (!pointerDrag || event.pointerId !== pointerDrag.id) return;
    const dx = event.clientX - pointerDrag.x;
    const dy = event.clientY - pointerDrag.y;
    // Drag looks around the world; umbrella stays world-fixed.
    lookYaw = pointerDrag.yaw - dx * 0.18;
    lookPitch = pointerDrag.pitch + dy * 0.16;
    calibrateIfNeeded();
    emit();
  }

  function onPointerUp(event) {
    if (!pointerDrag || event.pointerId !== pointerDrag.id) return;
    pointerDrag = null;
  }

  function bindPointer(viewfinder) {
    unbindPointer();
    viewfinderEl = viewfinder;
    if (!viewfinderEl) return;
    viewfinderEl.style.touchAction = "none";
    viewfinderEl.addEventListener("pointerdown", onPointerDown);
    viewfinderEl.addEventListener("pointermove", onPointerMove);
    viewfinderEl.addEventListener("pointerup", onPointerUp);
    viewfinderEl.addEventListener("pointercancel", onPointerUp);
  }

  function unbindPointer() {
    if (!viewfinderEl) return;
    viewfinderEl.removeEventListener("pointerdown", onPointerDown);
    viewfinderEl.removeEventListener("pointermove", onPointerMove);
    viewfinderEl.removeEventListener("pointerup", onPointerUp);
    viewfinderEl.removeEventListener("pointercancel", onPointerUp);
    viewfinderEl = null;
    pointerDrag = null;
  }

  function startRaf() {
    stopRaf();
    const tick = () => {
      emit();
      raf = root?.requestAnimationFrame ? root.requestAnimationFrame(tick) : 0;
    };
    // Orientation events already emit; raf keeps pose applied after DOM remounts.
    raf = root?.requestAnimationFrame ? root.requestAnimationFrame(tick) : 0;
  }

  function stopRaf() {
    if (raf && root?.cancelAnimationFrame) root.cancelAnimationFrame(raf);
    raf = 0;
  }

  return {
    /**
     * Must run inside the original tap gesture (before await getUserMedia)
     * or iOS will refuse DeviceOrientation permission.
     */
    async requestPermission() {
      const DO = root?.DeviceOrientationEvent;
      if (DO && typeof DO.requestPermission === "function") {
        const result = await DO.requestPermission();
        return result === "granted";
      }
      return true;
    },

    async start(callback, { viewfinder } = {}) {
      this.stop();
      onUpdate = callback;
      calibrated = false;
      lookYaw = 0;
      lookPitch = 0;
      // Seed a world pose immediately so the umbrella is NOT screen-centered.
      // Sensors/pointer then move the look direction around this fixed world target.
      calibrateIfNeeded();
      bindPointer(viewfinder || documentRef?.querySelector?.(".viewfinder"));
      startGenericSensor();
      startOrientationListeners();
      listening = true;
      startRaf();
      emit();
      return true;
    },

    setHandler(callback) {
      onUpdate = callback;
      emit();
    },

    bindViewfinder(viewfinder) {
      bindPointer(viewfinder);
    },

    stop() {
      stopRaf();
      stopOrientationListeners();
      stopGenericSensor();
      unbindPointer();
      listening = false;
      onUpdate = null;
      calibrated = false;
      pointerDrag = null;
    },

    isListening() {
      return listening;
    },
  };
}

export function applyWorldAnchorStyle(element, pose, viewfinder) {
  if (!element || !pose) return false;
  const vf = viewfinder || element.parentElement;
  const width = vf?.clientWidth || 320;
  const height = vf?.clientHeight || 260;
  const elW = element.offsetWidth || 72;
  const elH = element.offsetHeight || 72;
  const left = width * 0.5 + pose.x - elW / 2;
  const top = height * 0.5 + pose.y - elH / 2;
  const onScreen =
    Boolean(pose.ready) &&
    pose.visible &&
    left > -elW * 0.35 &&
    left < width - elW * 0.15 &&
    top > -elH * 0.35 &&
    top < height - elH * 0.15;
  element.style.left = "0px";
  element.style.top = "0px";
  element.style.right = "auto";
  element.style.bottom = "auto";
  element.style.transform = `translate3d(${left}px, ${top}px, 0) scale(${pose.scale})`;
  element.style.opacity = onScreen ? "1" : "0";
  element.style.pointerEvents = onScreen ? "auto" : "none";
  element.hidden = false;
  element.classList.toggle("is-world-locked", Boolean(pose.ready));
  element.classList.toggle("is-offscreen", !onScreen);
  return onScreen;
}
