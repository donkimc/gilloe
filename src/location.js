import { distanceMeters, isArrivalEligible } from "./geo.js";

const STATUS = {
  idle: "idle",
  locating: "locating",
  good: "good",
  lowAccuracy: "low-accuracy",
  denied: "denied",
  unavailable: "unavailable",
  timeout: "timeout",
};

export function createLocationService({
  geolocation = typeof navigator !== "undefined" ? navigator.geolocation : null,
  now = () => Date.now(),
} = {}) {
  let watchId = null;
  let startedAt = 0;
  let last = null;
  let listener = null;
  let fixListener = null;

  function emit(payload) {
    listener?.(payload);
  }

  function classify({ accuracyMeters, error }) {
    if (error) {
      if (error.code === 1) return STATUS.denied;
      if (error.code === 2) return STATUS.unavailable;
      if (error.code === 3) return STATUS.timeout;
      return STATUS.unavailable;
    }
    if (!Number.isFinite(accuracyMeters)) return STATUS.locating;
    return accuracyMeters <= last.accuracyCeiling ? STATUS.good : STATUS.lowAccuracy;
  }

  function handlePosition(position, stop, config) {
    const coords = position.coords;
    const accuracyMeters = coords.accuracy;
    const here = { lat: coords.latitude, lng: coords.longitude };
    const distance = distanceMeters(here, stop.coordinates);
    const eligible = isArrivalEligible({
      distanceMeters: distance,
      accuracyMeters,
      radiusMeters: stop.arrivalRadiusMeters,
      accuracyCeilingMeters: config.accuracyCeilingMeters,
    });
    last = {
      accuracyMeters,
      distanceMeters: distance,
      accuracyCeiling: config.accuracyCeilingMeters,
    };
    fixListener?.({
      lat: here.lat,
      lng: here.lng,
      accuracyMeters,
    });
    const status = classify({ accuracyMeters });
    const waited = now() - startedAt >= config.manualFallbackAfterMs;
    emit({
      status,
      accuracyMeters,
      distanceMeters: distance,
      canAutoArrive: eligible,
      manualAvailable: waited || status !== STATUS.good || !eligible,
    });
  }

  function handleError(error, config) {
    const status = classify({ error });
    emit({
      status,
      accuracyMeters: null,
      distanceMeters: last?.distanceMeters ?? null,
      canAutoArrive: false,
      manualAvailable: true,
    });
    void config;
  }

  return {
    STATUS,
    isSupported() {
      return Boolean(geolocation && typeof geolocation.watchPosition === "function");
    },
    onChange(fn) {
      listener = fn;
    },
    onFix(fn) {
      fixListener = fn;
    },
    start({ stop, options, accuracyCeilingMeters, manualFallbackAfterMs }) {
      this.stop();
      startedAt = now();
      last = { accuracyCeiling: accuracyCeilingMeters };
      if (!this.isSupported()) {
        emit({
          status: STATUS.unavailable,
          accuracyMeters: null,
          distanceMeters: null,
          canAutoArrive: false,
          manualAvailable: true,
        });
        return;
      }
      emit({
        status: STATUS.locating,
        accuracyMeters: null,
        distanceMeters: null,
        canAutoArrive: false,
        manualAvailable: false,
      });
      const config = { accuracyCeilingMeters, manualFallbackAfterMs };
      watchId = geolocation.watchPosition(
        (position) => handlePosition(position, stop, config),
        (error) => handleError(error, config),
        options,
      );
      this._fallbackTimer = setTimeout(() => {
        if (!last?.accuracyMeters && watchId != null) {
          emit({
            status: STATUS.timeout,
            accuracyMeters: null,
            distanceMeters: last?.distanceMeters ?? null,
            canAutoArrive: false,
            manualAvailable: true,
          });
        } else if (last) {
          emit({
            status: classify({ accuracyMeters: last.accuracyMeters }),
            accuracyMeters: last.accuracyMeters ?? null,
            distanceMeters: last.distanceMeters ?? null,
            canAutoArrive: isArrivalEligible({
              distanceMeters: last.distanceMeters,
              accuracyMeters: last.accuracyMeters,
              radiusMeters: stop.arrivalRadiusMeters,
              accuracyCeilingMeters,
            }),
            manualAvailable: true,
          });
        }
      }, manualFallbackAfterMs);
    },
    stop() {
      if (this._fallbackTimer) {
        clearTimeout(this._fallbackTimer);
        this._fallbackTimer = null;
      }
      if (watchId != null && geolocation) {
        geolocation.clearWatch(watchId);
      }
      watchId = null;
    },
  };
}
