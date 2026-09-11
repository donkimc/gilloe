export function createCameraService({
  mediaDevices = typeof navigator !== "undefined" ? navigator.mediaDevices : null,
} = {}) {
  let stream = null;
  let videoEl = null;

  function stopTracks() {
    if (!stream) return;
    for (const track of stream.getTracks()) {
      try {
        track.stop();
      } catch {
        /* ignore */
      }
    }
    stream = null;
    if (videoEl) {
      videoEl.srcObject = null;
    }
  }

  return {
    isSupported() {
      return Boolean(mediaDevices && typeof mediaDevices.getUserMedia === "function");
    },
    hasActiveStream() {
      return Boolean(stream && stream.getTracks().some((track) => track.readyState === "live"));
    },
    async start(video) {
      videoEl = video;
      stopTracks();
      if (!this.isSupported()) {
        const error = new Error("unavailable");
        error.name = "NotSupportedError";
        throw error;
      }
      stream = await mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {});
      }
      return stream;
    },
    stop() {
      stopTracks();
    },
  };
}
