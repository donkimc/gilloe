import {
  assembleCopy,
  briefing,
  cameraCopy,
  cover,
  ending,
  feedbackCopy,
  game,
  gps,
  modes,
  osmDirectionsUrl,
  pieceCopy,
  routeMeta,
  safety,
  screens as screenList,
  stopByOrder,
  trayCopy,
} from "../content.js";
import { CELLS, markSvg, pieceMarkup, PIECES } from "../assemble.js";
import { formatApproxDistance } from "../geo.js";
import { trayAllowed } from "../state.js";

const locationIcons = {
  idle: "📍",
  locating: "🔄",
  good: "✅",
  "low-accuracy": "⚠️",
  denied: "🚫",
  unavailable: "❌",
  timeout: "⏳",
};

function h(strings, ...values) {
  return String.raw({ raw: strings }, ...values);
}

function ico(symbol, text) {
  return `<span class="ico"><span class="ico__mark" aria-hidden="true">${symbol}</span><span>${text}</span></span>`;
}

function btn(action, label, extra = "") {
  return `<button type="button" class="btn ${extra}" data-action="${action}">${label}</button>`;
}

function banner() {
  return `<div class="proto-banner" role="status">${ico("⚠️", game.prototypeBanner)}</div>`;
}

function progress(state) {
  const n = state.collectedPieceIds?.length || 0;
  return `<p class="progress">${ico("🧩", trayCopy.count(Math.min(n, 4)))}</p>`;
}

function chrome(state, { showExit = false, showTray = false } = {}) {
  return `
    <header class="top">
      <p class="brand">${game.brand}</p>
      ${progress(state)}
      <div class="top-actions">
        ${showTray && trayAllowed(state.screen) ? btn("notebook", `🧩 ${trayCopy.open}`, "btn--ghost") : ""}
        ${showExit ? btn("exit", `🚪 ${gps.exit}`, "btn--ghost") : ""}
      </div>
    </header>
  `;
}

export function render(state) {
  const overlayHtml = renderOverlay(state);
  return `
    <a class="skip-link" href="#main">본문으로</a>
    ${banner()}
    <div class="app-shell" data-screen="${state.screen}">
      ${view(state)}
    </div>
    ${overlayHtml}
    ${state.simPanel ? renderSimPanel(state) : ""}
  `;
}

function view(state) {
  switch (state.screen) {
    case "cover":
      return coverView(state);
    case "mode":
      return modeView();
    case "safety":
      return safetyView();
    case "briefing":
      return briefingView(state);
    case "route-overview":
      return overviewView(state);
    case "navigating-stop-1":
    case "navigating-stop-2":
    case "navigating-stop-3":
    case "navigating-stop-4":
      return navView(state);
    case "camera-stop-2":
      return cameraView(state);
    case "piece-stop-1":
    case "piece-stop-2":
    case "piece-stop-3":
    case "piece-stop-4":
      return pieceView(state);
    case "assemble":
      return assembleView(state);
    case "resolution":
      return resolutionView(state);
    case "feedback":
      return feedbackView(state);
    default:
      return coverView(state);
  }
}

function coverView(state) {
  return h`
    <main id="main" class="screen card-screen">
      ${chrome(state)}
      <p class="kicker">${cover.kicker}</p>
      <h1>${game.title}</h1>
      <p class="lead">${cover.lead}</p>
      <ul class="meta">
        <li>${ico("⏱️", game.duration)}</li>
        <li>${ico("⭐", game.difficulty)}</li>
        <li>${ico("🚶", game.walking)}</li>
        <li>${ico("👥", game.players)}</li>
      </ul>
      <p class="note">${ico("☀️", game.operatingNote)}</p>
      <p class="warn">${ico("🚧", game.notPublicReady)}</p>
      ${state.restored ? `<p class="ok">${ico("✅", "이전 진행을 복구했습니다.")}</p>` : ""}
      ${state.invalidSave ? `<p class="warn">${ico("⚠️", "저장본이 오래되었거나 손상되어 처음부터 시작합니다.")}</p>` : ""}
      ${state.playerMode ? btn("resume", cover.resume) : btn("start", cover.start)}
      ${state.playerMode ? btn("reset", cover.reset, "btn--ghost") : ""}
    </main>
  `;
}

function modeView() {
  return `
    <main id="main" class="screen card-screen">
      <h1>${modes.title}</h1>
      <button type="button" class="choice" data-action="mode" data-mode="solo">
        <strong>${ico("👤", modes.solo.label)}</strong>
        <span>${modes.solo.body}</span>
      </button>
      <button type="button" class="choice" data-action="mode" data-mode="duo">
        <strong>${ico("👥", modes.duo.label)}</strong>
        <span>${modes.duo.body}</span>
      </button>
    </main>
  `;
}

function safetyView() {
  return `
    <main id="main" class="screen card-screen">
      <h1>${safety.title}</h1>
      <ul class="safety">${safety.items.map((item) => `<li>${item}</li>`).join("")}</ul>
      ${btn("accept-safety", safety.accept)}
    </main>
  `;
}

function briefingView(state) {
  return `
    <main id="main" class="screen card-screen">
      ${chrome(state, { showTray: true })}
      <p class="tag">${ico("🎮", briefing.fictionTag)}</p>
      <h1>${briefing.title}</h1>
      <p class="mission">${ico("🎯", briefing.mission)}</p>
      <p>${briefing.how}</p>
      <div class="mark-preview">${markSvg({ clip: "full" })}</div>
      ${btn("continue", "🗺️ 경로 보기")}
    </main>
  `;
}

function locationPanel(state) {
  const label = {
    idle: gps.idle,
    locating: gps.locating,
    good: gps.good,
    "low-accuracy": gps.lowAccuracy,
    denied: gps.denied,
    unavailable: gps.unavailable,
    timeout: gps.timeout,
  }[state.locationStatus];
  const accuracy =
    Number.isFinite(state.locationAccuracyMeters)
      ? `수신 정확도 약 ${Math.round(state.locationAccuracyMeters)}m`
      : "정확도 미확인";
  const distance = `${gps.approx}: ${formatApproxDistance(state.distanceMeters)}`;
  return `
    <section class="loc" aria-live="polite">
      <p><strong>${ico(locationIcons[state.locationStatus] || "📍", label)}</strong></p>
      <p>${ico("🎯", accuracy)}</p>
      <p>${ico("📏", distance)}</p>
    </section>
  `;
}

function overviewView(state) {
  return `
    <main id="main" class="screen map-screen">
      ${chrome(state, { showExit: true, showTray: true })}
      <h1>${ico("🗺️", routeMeta.overviewTitle)}</h1>
      <p class="note">${ico("⏱️", routeMeta.totalHint)}</p>
      ${state.mapStatus === "failed" ? `<p class="warn">${routeMeta.mapFailed}</p>` : ""}
      ${state.mapStatus === "tiles" ? `<p class="warn">${routeMeta.tilesFailed}</p>` : ""}
      ${locationPanel(state)}
      ${!state.locationPermissionAsked ? btn("find-location", `📍 ${gps.findMe}`) : btn("retry-location", `🔄 ${gps.retryLocation}`, "btn--ghost")}
      ${btn("continue", "🚶 첫 장소로 이동")}
    </main>
  `;
}

function navView(state) {
  const stop = stopByOrder(state.currentStop);
  const arriveEnabled = state.canAutoArrive;
  return `
    <main id="main" class="screen map-screen">
      ${chrome(state, { showExit: true, showTray: true })}
      <h1>${stop.title}</h1>
      <p>${stop.directions}</p>
      <p class="note">${stop.safeStandingNote}</p>
      ${state.mapStatus !== "ok" ? `<p class="warn">${stop.fallbackDirections}</p>` : ""}
      ${locationPanel(state)}
      ${btn("arrive", `📍 ${gps.arrive}`, arriveEnabled ? "" : "is-disabled")}
      ${!arriveEnabled ? `<p class="muted">${ico("ℹ️", gps.arriveLocked)}</p>` : ""}
      ${state.manualAvailable || ["denied", "unavailable", "timeout", "low-accuracy"].includes(state.locationStatus) ? btn("manual", `✋ ${gps.manual}`, "btn--ghost") : ""}
      ${btn("help", `❓ ${gps.help}`, "btn--ghost")}
      ${btn("retry-location", `🔄 ${gps.retryLocation}`, "btn--ghost")}
      <a class="ext" href="${osmDirectionsUrl(stop)}" target="_blank" rel="noopener noreferrer">${ico("🧭", gps.directionsExternal)}</a>
    </main>
  `;
}

function cameraView(state) {
  const stop = stopByOrder(2);
  const clue = stop.cameraClue;
  const place = clue.overlay.placement;
  const live = state.cameraStatus === "active";
  const fallback = ["fallback", "skipped", "denied", "unavailable"].includes(state.cameraStatus);
  return `
    <main id="main" class="screen camera-screen">
      ${chrome(state, { showExit: true, showTray: true })}
      <h1>${ico("📷", "카메라 조각")}</h1>
      <p>${clue.framingInstruction}</p>
      <p class="note">${ico("🛑", cameraCopy.standStill)}</p>
      <p class="live ${live ? "is-on" : ""}">${ico(live ? "🔴" : "📷", live ? cameraCopy.active : cameraStatusLabel(state.cameraStatus))}</p>
      <p class="note">${ico("ℹ️", live ? cameraCopy.overlayHint : fallback ? cameraCopy.fallbackHint : cameraCopy.beforeStartHint)}</p>
      <div class="viewfinder">
        <video id="camera-video" class="camera-video" playsinline webkit-playsinline muted autoplay></video>
        <div class="frame-guide" aria-hidden="true"></div>
        <p class="ar-hint" id="ar-hint" hidden>📱 휴대폰을 돌리거나 화면을 드래그해 공간에 고정된 조각을 찾으세요.</p>
        <div class="ar-guide" id="ar-guide" hidden aria-live="polite">
          <div class="ar-guide-arrow" data-look-arrow aria-hidden="true">▲</div>
          <p class="ar-guide-distance" data-look-distance>0.0m</p>
          <p class="ar-guide-label" data-look-label>조각 방향</p>
        </div>
        ${
          live || fallback
            ? `<button type="button" class="ar-clue${fallback ? " is-fallback" : " is-world-locked"}" data-action="collect-camera" data-ar-clue="1" style="${fallback ? `top:${place.top};left:${place.left}` : "left:0;top:0"}" aria-label="길로 마크 조각">
                ${pieceMarkup("piece-2", "mark-tile--overlay")}
                <span class="ar-label">조각 2 / 4</span>
              </button>`
            : ""
        }
        ${fallback ? `<div class="static-clue"><p>${clue.fallbackTitle}</p><p>${clue.fallbackClue}</p></div>` : ""}
      </div>
      ${state.cameraStatus === "idle" || state.cameraStatus === "stopped" || state.cameraStatus === "interrupted" ? btn("start-camera", `📷 ${cameraCopy.start}`) : ""}
      ${btn("skip-camera", `👁️ ${cameraCopy.skip}`, "btn--ghost")}
    </main>
  `;
}

function cameraStatusLabel(status) {
  return {
    idle: "카메라 대기",
    starting: cameraCopy.starting,
    denied: cameraCopy.denied,
    unavailable: cameraCopy.unavailable,
    interrupted: cameraCopy.interrupted,
    stopped: cameraCopy.stopped,
    fallback: cameraCopy.skip,
    skipped: cameraCopy.skip,
  }[status] || "카메라 대기";
}

function pieceView(state) {
  const stop = stopByOrder(state.currentStop);
  return `
    <main id="main" class="screen card-screen">
      ${chrome(state, { showExit: true, showTray: true })}
      <h1>${pieceCopy.title(stop.order)}</h1>
      ${!state.stoppedWalking ? `<p class="warn">${ico("🛑", "길을 멈춘 뒤에 조각을 받으세요.")}</p>${btn("stopped", "🛑 멈췄어요")}` : `
        <p>${stop.scene}</p>
        <div class="piece-award">${pieceMarkup(stop.pieceId, "mark-tile--large")}</div>
        ${btn("collect-piece", `🧩 ${pieceCopy.collect}`)}
      `}
    </main>
  `;
}

function assembleView(state) {
  const placement = state.assemblePlacement;
  const hint = state.hintsUsed.assemble ? `<p class="hint">${assembleCopy.hint}</p>` : btn("hint", "💡 힌트", "btn--ghost");
  const seated = new Set(Object.entries(placement).filter(([, cell]) => cell).map(([id]) => id));
  const tray = (state.assembleOrder || PIECES.map((p) => p.id)).filter((id) => !seated.has(id));
  return `
    <main id="main" class="screen card-screen">
      ${chrome(state, { showExit: true, showTray: true })}
      <h1>${assembleCopy.title}</h1>
      <p>${assembleCopy.body}</p>
      ${hint}
      <div class="assemble-board" data-assemble-board>
        ${CELLS.map((cell) => {
          const occupant = Object.entries(placement).find(([, seatedCell]) => seatedCell === cell);
          return `<button type="button" class="assemble-cell" data-action="place-cell" data-cell="${cell}" aria-label="${cell} 칸">
            ${occupant ? pieceMarkup(occupant[0], "mark-tile--seated") : ""}
          </button>`;
        }).join("")}
      </div>
      <div class="assemble-tray" data-assemble-tray>
        ${tray
          .map(
            (id) => `
          <button type="button" class="assemble-piece${state.assembleSelected === id ? " is-selected" : ""}" data-action="select-piece" data-piece="${id}" aria-label="${id}">
            ${pieceMarkup(id)}
          </button>`,
          )
          .join("")}
      </div>
      ${state.assembleComplete ? `<p class="ok">${pieceCopy.done}</p>${btn("continue", assembleCopy.continue)}` : ""}
    </main>
  `;
}

function resolutionView(state) {
  const elapsed = state.startedAt ? Math.round((Date.now() - state.startedAt) / 60000) : "—";
  return `
    <main id="main" class="screen card-screen">
      ${chrome(state)}
      <h1>${ending.title}</h1>
      <div class="mark-preview mark-preview--done">${markSvg({ clip: "full" })}</div>
      <p>${ending.thanks}</p>
      <p class="note">${ico("⏱️", `경과 시간 약 ${elapsed}분 · 기기에만 표시`)}</p>
      ${btn("continue", "📝 소감 남기기")}
    </main>
  `;
}

function feedbackView(state) {
  return `
    <main id="main" class="screen card-screen">
      <h1>${feedbackCopy.title}</h1>
      <p class="note">${feedbackCopy.savedLocal}</p>
      ${feedbackCopy.questions
        .filter((q) => !q.duoOnly || state.playerMode === "duo")
        .map(
          (q) => `
        <fieldset>
          <legend>${q.label}</legend>
          ${feedbackCopy.scale
            .map(
              (s) => `
            <label class="chip">
              <input type="radio" name="${q.id}" value="${s.value}" ${state.feedbackAnswers[q.id] === s.value ? "checked" : ""} />
              ${s.label}
            </label>`,
          )
            .join("")}
        </fieldset>`,
        )
        .join("")}
      ${btn("download-feedback", feedbackCopy.download)}
      ${btn("reset", feedbackCopy.skip, "btn--ghost")}
    </main>
  `;
}

function renderOverlay(state) {
  if (!state.overlay) return "";
  if (state.overlay === "notebook") return tray(state);
  if (state.overlay === "help") {
    return modal("❓ 도움", `<p>${routeMeta.helpBody}</p>${btn("close-overlay", "닫기")}`);
  }
  if (state.overlay === "exit") {
    return modal(
      gps.exit,
      `<p>${routeMeta.exitBody}</p>${btn("reset", "진행 지우고 종료")}${btn("close-overlay", "돌아가기", "btn--ghost")}`,
    );
  }
  if (state.overlay === "manual") {
    const stop = stopByOrder(state.currentStop);
    return modal(
      gps.manualConfirmTitle,
      `<p>${gps.manualConfirmBody}</p><p><strong>${stop.publicName}</strong></p><p>${stop.safeStandingNote}</p>${btn("confirm-manual", gps.manualConfirm)}${btn("close-overlay", "취소", "btn--ghost")}`,
    );
  }
  return "";
}

function modal(title, body) {
  return `<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="dlg-title"><div class="overlay-card"><h2 id="dlg-title">${title}</h2>${body}</div></div>`;
}

function tray(state) {
  const collected = new Set(state.collectedPieceIds || []);
  return modal(
    trayCopy.title,
    `
      <div class="tray-grid">
        ${PIECES.map((piece) => {
          const have = collected.has(piece.id);
          return `<div class="tray-slot${have ? " is-filled" : ""}">${have ? pieceMarkup(piece.id) : `<span class="muted">${piece.order}</span>`}</div>`;
        }).join("")}
      </div>
      ${collected.size ? `<p>${trayCopy.count(collected.size)}</p>` : `<p>${trayCopy.empty}</p>`}
      ${btn("close-overlay", trayCopy.close)}
    `,
  );
}

function renderSimPanel(state) {
  const minimized = Boolean(state.simMinimized);
  return `
    <aside class="sim${minimized ? " is-min" : ""}" aria-label="프로토타입 시뮬레이터">
      <div class="sim-head">
        <p>${ico("🧪", minimized ? "시뮬레이터" : "시뮬레이터 · 실제 기기 검증이 아닙니다")}</p>
        <button type="button" class="sim-toggle" data-action="sim-toggle" aria-expanded="${minimized ? "false" : "true"}">
          ${minimized ? "펼치기" : "접기"}
        </button>
      </div>
      ${
        minimized
          ? ""
          : `<div class="sim-body">
        <button type="button" data-sim="gps" data-value="good">${ico("✅", "GPS 양호")}</button>
        <button type="button" data-sim="gps" data-value="inaccurate">${ico("⚠️", "GPS 부정확")}</button>
        <button type="button" data-sim="gps" data-value="denied">${ico("🚫", "GPS 거부")}</button>
        <button type="button" data-sim="gps" data-value="unavailable">${ico("❌", "GPS 없음")}</button>
        <button type="button" data-sim="gps" data-value="timeout">${ico("⏳", "GPS 시간초과")}</button>
        <button type="button" data-sim="camera" data-value="ok">${ico("📷", "카메라 허용")}</button>
        <button type="button" data-sim="camera" data-value="denied">${ico("🚫", "카메라 거부")}</button>
        <button type="button" data-sim="map" data-value="fail">${ico("🗺️", "지도 실패")}</button>
      </div>`
      }
    </aside>
  `;
}

export { screenList };
