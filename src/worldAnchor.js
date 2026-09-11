/**
 * World-lock for the Stop 2 navy umbrella (no AR framework).
 * Prefer GPS bearing + compass heading so the clue sits at a real outdoor
 * lat/lng (Record Pizza sidewalk). Fall back to relative orientation / drag.
 */

import { bearingDegrees, distanceMeters, shortestAngleDelta } from "./geo.js";

const PX_PER_DEG_X = 12;
const PX_PER_DEG_Y = 14;
const VISIBLE_DEG = 42;

function poseFromLook(lookYaw, lookPitch, targetYaw, targetPitch, distanceMetersOverride) {
  const yaw = shortestAngleDelta(lookYaw, targetYaw);
  const pitch = shortestAngleDelta(lookPitch, targetPitch);
  const x = yaw * PX_PER_DEG_X;
  const y = -pitch * PX_PER_DEG_Y;
  const angularDistance = Math.hypot(yaw, pitch);
  const meters =
    Number.isFinite(distanceMetersOverride)
      ? Math.max(0.4, distanceMetersOverride)
      : Math.max(0.4, angularDistance * 0.12);
  const arrowDeg = (Math.atan2(x, -y) * 180) / Math.PI;
  return {
    x,
    y,
    scale: Math.max(0.7, 1.25 - Math.min(meters, 80) * 0.006),
    visible: angularDistance < VISIBLE_DEG,
    ready: true,
    yaw,
    pitch,
    angularDistance,
    distanceMeters: meters,
    arrowDeg,
    mode: Number.isFinite(distanceMetersOverride) ? "geo" : "relative",
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
  let geoTarget = null;
  let playerFix = null;
  let compassHeading = null;

  function emit() {
    if (!onUpdate) return;

    if (geoTarget && playerFix && Number.isFinite(compassHeading)) {
      const bearing = bearingDegrees(playerFix, geoTarget);
      const meters = distanceMeters(playerFix, geoTarget);
      if (bearing != null && meters != null) {
        // Keep a gentle downward pitch so the clue reads as street-level, not sky.
        const pitchTarget = Math.max(-12, -4 - Math.min(meters, 60) * 0.05);
        onUpdate(poseFromLook(compassHeading, lookPitch || 0, bearing, pitchTarget, meters));
        return;
      }
    }

    if (!calibrated) {
      onUpdate({
        x: 0,
        y: 0,
        scale: 1,
        visible: true,
        ready: false,
        angularDistance: 0,
        distanceMeters: 0,
        arrowDeg: 0,
        mode: "pending",
      });
      return;
    }
    onUpdate(poseFromLook(lookYaw, lookPitch, targetYaw, targetPitch));
  }

  function calibrateIfNeeded() {
    if (calibrated) return;
    originYaw = lookYaw;
    originPitch = lookPitch;
    // Relative fallback only — geo mode uses real lat/lng instead.
    targetYaw = originYaw + 10;
    targetPitch = originPitch - 4;
    calibrated = true;
  }

  function setLookFromDevice(alpha, beta) {
    lookYaw = alpha;
    lookPitch = beta;
    compassHeading = alpha;
    calibrateIfNeeded();
    emit();
  }

  function onDeviceOrientation(event) {
    if (event.alpha == null || event.beta == null) return;
    // webkitCompassHeading is iOS absolute compass (0 = north).
    const heading =
      typeof event.webkitCompassHeading === "number"
        ? event.webkitCompassHeading
        : event.absolute
          ? event.alpha
          : event.alpha;
    setLookFromDevice(heading, event.beta);
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
        const yaw = (Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z)) * 180) / Math.PI;
        const pitch = (Math.asin(Math.max(-1, Math.min(1, 2 * (w * y - z * x)))) * 180) / Math.PI;
        setLookFromDevice((yaw + 360) % 360, pitch);
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
      heading: compassHeading ?? lookYaw,
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
    lookYaw = pointerDrag.yaw - dx * 0.18;
    lookPitch = pointerDrag.pitch + dy * 0.16;
    compassHeading = ((pointerDrag.heading - dx * 0.18) % 360 + 360) % 360;
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
    raf = root?.requestAnimationFrame ? root.requestAnimationFrame(tick) : 0;
  }

  function stopRaf() {
    if (raf && root?.cancelAnimationFrame) root.cancelAnimationFrame(raf);
    raf = 0;
  }

  return {
    async requestPermission() {
      const DO = root?.DeviceOrientationEvent;
      if (DO && typeof DO.requestPermission === "function") {
        const result = await DO.requestPermission();
        return result === "granted";
      }
      return true;
    },

    setGeoTarget(coords) {
      geoTarget =
        coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)
          ? { lat: coords.lat, lng: coords.lng }
          : null;
      emit();
    },

    setPlayerFix(fix) {
      playerFix =
        fix && Number.isFinite(fix.lat) && Number.isFinite(fix.lng)
          ? { lat: fix.lat, lng: fix.lng, accuracyMeters: fix.accuracyMeters }
          : null;
      emit();
    },

    async start(callback, { viewfinder } = {}) {
      this.stop();
      onUpdate = callback;
      calibrated = false;
      lookYaw = 0;
      lookPitch = 0;
      compassHeading = null;
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
  if (!element || !pose) {
    return { onScreen: false, arrowDeg: 0, distanceMeters: 0, angularDistance: 0 };
  }
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
  return {
    onScreen,
    arrowDeg: pose.arrowDeg ?? 0,
    distanceMeters: pose.distanceMeters ?? 0,
    angularDistance: pose.angularDistance ?? 0,
  };
}

export function updateLookGuidance(guide, pose, onScreen) {
  if (!guide) return;
  const show = Boolean(pose?.ready) && !onScreen;
  guide.hidden = !show;
  if (!show) return;
  const arrow = guide.querySelector("[data-look-arrow]");
  const dist = guide.querySelector("[data-look-distance]");
  const label = guide.querySelector("[data-look-label]");
  const deg = pose.arrowDeg ?? 0;
  const meters = pose.distanceMeters ?? 0;
  if (arrow) arrow.style.transform = `rotate(${deg}deg)`;
  if (dist) dist.textContent = `${meters.toFixed(1)}m`;
  if (label) {
    if (pose.mode === "geo") {
      label.textContent = meters < 8 ? "레코드피자 바깥쪽" : "남색 우산 · 가게 밖 인도";
    } else {
      const turn = Math.round(Math.abs(pose.angularDistance ?? 0));
      label.textContent = turn > 0 ? `이 방향으로 ${turn}°` : "남색 우산 방향";
    }
  }
}
