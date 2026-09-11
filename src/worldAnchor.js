/**
 * Lightweight world-lock for the Stop 2 navy umbrella.
 * Uses DeviceOrientation (no AR framework): the clue stays fixed in heading/pitch
 * space so it appears anchored in the physical scene as the phone moves.
 */

const DEG = Math.PI / 180;
const PX_PER_DEG_X = 14;
const PX_PER_DEG_Y = 16;

function shortestDelta(from, to) {
  let d = to - from;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

export function createWorldAnchor({
  orientation = typeof window !== "undefined" ? window : null,
} = {}) {
  let listening = false;
  let origin = null;
  let target = null;
  let onUpdate = null;
  let last = null;

  function handleOrientation(event) {
    if (event.alpha == null || event.beta == null) return;
    const alpha = event.alpha;
    const beta = event.beta;
    const gamma = event.gamma ?? 0;
    last = { alpha, beta, gamma };

    if (!origin) {
      origin = { alpha, beta, gamma };
      // Place the clue slightly ahead and to the side of the first framing pose.
      target = {
        alpha: (alpha + 18 + 360) % 360,
        beta: beta - 6,
      };
    }

    const yaw = shortestDelta(target.alpha, alpha);
    const pitch = shortestDelta(target.beta, beta);
    // Opposite of phone motion → object appears fixed in the world.
    const x = -yaw * PX_PER_DEG_X;
    const y = -pitch * PX_PER_DEG_Y;
    const distance = Math.hypot(yaw, pitch);
    const visible = distance < 38;
    const scale = Math.max(0.72, 1.15 - Math.abs(pitch) * 0.012);
    onUpdate?.({
      x,
      y,
      scale,
      visible,
      ready: true,
      yaw,
      pitch,
    });
  }

  async function ensurePermission() {
    const DO = orientation?.DeviceOrientationEvent;
    if (DO && typeof DO.requestPermission === "function") {
      const result = await DO.requestPermission();
      return result === "granted";
    }
    return true;
  }

  return {
    async start(callback) {
      this.stop();
      onUpdate = callback;
      origin = null;
      target = null;
      last = null;
      const ok = await ensurePermission().catch(() => false);
      if (!ok || !orientation) {
        onUpdate?.({ x: 0, y: 0, scale: 1, visible: true, ready: false });
        return false;
      }
      orientation.addEventListener("deviceorientation", handleOrientation, true);
      listening = true;
      // Immediate fallback pose until the first orientation event arrives.
      onUpdate?.({ x: 0, y: 0, scale: 1, visible: true, ready: false });
      return true;
    },
    setHandler(callback) {
      onUpdate = callback;
      if (last && origin && target) {
        handleOrientation(last);
      }
    },
    stop() {
      if (listening && orientation) {
        orientation.removeEventListener("deviceorientation", handleOrientation, true);
      }
      listening = false;
      onUpdate = null;
      origin = null;
      target = null;
      last = null;
    },
    isListening() {
      return listening;
    },
  };
}

export function applyWorldAnchorStyle(element, pose, viewfinder) {
  if (!element || !pose) return;
  const vf = viewfinder || element.parentElement;
  const width = vf?.clientWidth || 320;
  const height = vf?.clientHeight || 260;
  const elW = element.offsetWidth || 72;
  const elH = element.offsetHeight || 72;
  const left = width * 0.5 + pose.x - elW / 2;
  const top = height * 0.5 + pose.y - elH / 2;
  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
  element.style.right = "auto";
  element.style.bottom = "auto";
  element.style.transform = `scale(${pose.scale})`;
  element.style.opacity = pose.visible ? "1" : "0";
  element.style.pointerEvents = pose.visible ? "auto" : "none";
  element.hidden = false;
  element.classList.toggle("is-world-locked", Boolean(pose.ready));
  element.classList.toggle("is-offscreen", !pose.visible);
}

// Keep DEG referenced for possible future projection work without unused-lint noise.
void DEG;
