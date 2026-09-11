import {
  accusation,
  briefing,
  cameraCopy,
  cover,
  duoCopy,
  ending,
  feedbackCopy,
  game,
  gps,
  modes,
  notebookCopy,
  osmDirectionsUrl,
  routeMeta,
  safety,
  screens as screenList,
  stopById,
  stopByOrder,
  suspects,
  duoRoles,
} from "../content.js";
import { formatApproxDistance } from "../geo.js";
import { notebookAllowed } from "../state.js";

const suspectIcons = {
  "kang-min-jae": "☂️",
  "seo-yu-na": "🟨",
  "lee-do-yun": "🧢",
};
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
  const solved = state.solvedPuzzleIds.length;
  return `<p class="progress">${ico("🔎", `단서 ${Math.min(solved, 4)} / 4`)}</p>`;
}

function chrome(state, { showExit = false, showNotebook = false } = {}) {
  return `
    <header class="top">
      <p class="brand">${game.brand}</p>
      ${progress(state)}
      <div class="top-actions">
        ${showNotebook && notebookAllowed(state.screen) ? btn("notebook", `📒 ${notebookCopy.open}`, "btn--ghost") : ""}
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
    case "clue-stop-1":
    case "clue-stop-2":
    case "clue-stop-3":
    case "clue-stop-4":
      return clueView(state);
    case "puzzle-stop-1":
    case "puzzle-stop-2":
    case "puzzle-stop-3":
      return puzzleView(state);
    case "accusation":
      return accusationView(state);
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
      ${chrome(state, { showNotebook: true })}
      <p class="tag">${ico("📖", briefing.fictionTag)}</p>
      <h1>${briefing.title}</h1>
      <p>${briefing.victim}</p>
      <p>${briefing.money}</p>
      <p class="mission">${ico("🎯", briefing.mission)}</p>
      <p class="note">${ico("🕖", briefing.window)}</p>
      <div class="suspects">
        ${suspects
          .map(
            (s) => `
          <article class="suspect">
            <h2>${ico(suspectIcons[s.id] || "👤", s.name)}</h2>
            <p class="muted">${s.role} · ${s.cue}</p>
            <p>${s.claim}</p>
          </article>`,
          )
          .join("")}
      </div>
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
      ${chrome(state, { showExit: true, showNotebook: true })}
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
      ${chrome(state, { showExit: true, showNotebook: true })}
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
      ${chrome(state, { showExit: true, showNotebook: true })}
      <h1>${ico("📷", "카메라 단서")}</h1>
      <p>${clue.framingInstruction}</p>
      <p class="note">${ico("🛑", cameraCopy.standStill)}</p>
      <p class="live ${live ? "is-on" : ""}">${ico(live ? "🔴" : "📷", live ? cameraCopy.active : cameraStatusLabel(state.cameraStatus))}</p>
      <p class="note">${ico("ℹ️", live ? cameraCopy.overlayHint : fallback ? cameraCopy.fallbackHint : cameraCopy.beforeStartHint)}</p>
      <div class="viewfinder">
        <video id="camera-video" class="camera-video" playsinline muted autoplay></video>
        <div class="frame-guide" aria-hidden="true"></div>
        ${
          live || fallback
            ? `<button type="button" class="overlay-clue" data-action="collect-camera" style="top:${place.top};left:${place.left}">
                <span class="umbrella" aria-hidden="true"></span>
                <span>남색 우산 · ${clue.overlay.timestamp}</span>
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

function clueView(state) {
  const stop = stopByOrder(state.currentStop);
  const duo = state.playerMode === "duo";
  const roles = duoRoles(stop.order);
  if (duo && state.duoPhase !== "puzzle") {
    return duoClue(state, stop, roles);
  }
  return `
    <main id="main" class="screen card-screen">
      ${chrome(state, { showExit: true, showNotebook: true })}
      <h1>${stop.title}</h1>
      ${!state.stoppedWalking ? `<p class="warn">${ico("🛑", "길을 멈춘 뒤에 단서를 읽으세요.")}</p>${btn("stopped", "🛑 멈췄어요")}` : `
        <p>${stop.scene}</p>
        <article class="paper"><p>${stop.witnessCard}</p></article>
        <article class="paper"><p>${stop.evidenceCard}</p></article>
        ${btn("to-puzzle", "🧩 퍼즐 열기")}
      `}
    </main>
  `;
}

function duoClue(state, stop, roles) {
  const phase = state.duoPhase || "witness";
  if (phase === "witness") {
    return `
      <main id="main" class="screen card-screen">
        ${chrome(state, { showExit: true, showNotebook: true })}
        <p class="kicker">${duoCopy.holdPhone} · 수사관 ${roles.witness} · ${duoCopy.witness}</p>
        <h1>${stop.title}</h1>
        ${!state.stoppedWalking ? `<p class="warn">${ico("🛑", "길을 멈춘 뒤에 읽으세요.")}</p>${btn("stopped", "🛑 멈췄어요")}` : `
          <article class="paper"><p>${stop.witnessCard}</p></article>
          ${btn("duo-pass-evidence", duoCopy.pass)}
        `}
      </main>
    `;
  }
  if (phase === "pass-evidence") {
    return `
      <main id="main" class="screen card-screen">
        <h1>${duoCopy.pass}</h1>
        <p>📱 수사관 ${roles.evidence}에게 휴대폰을 건네 증거 카드를 확인하세요.</p>
        ${btn("duo-evidence", duoCopy.passed)}
        ${btn("duo-alone", duoCopy.continueAlone, "btn--ghost")}
      </main>
    `;
  }
  if (phase === "evidence") {
    return `
      <main id="main" class="screen card-screen">
        ${chrome(state, { showExit: true, showNotebook: true })}
        <p class="kicker">${duoCopy.holdPhone} · 수사관 ${roles.evidence} · ${duoCopy.evidence}</p>
        <button type="button" class="hold" data-action="hold-evidence">${duoCopy.holdToReveal}</button>
        <article class="paper is-hidden" id="private-card"><p>${stop.evidenceCard}</p></article>
        ${btn("duo-pass-discuss", duoCopy.pass)}
        ${btn("duo-alone", duoCopy.continueAlone, "btn--ghost")}
      </main>
    `;
  }
  if (phase === "pass-discuss") {
    return `
      <main id="main" class="screen card-screen">
        <h1>${duoCopy.pass}</h1>
        <p>${duoCopy.discussPrompt}</p>
        ${btn("duo-discuss", duoCopy.passed)}
      </main>
    `;
  }
  return `
    <main id="main" class="screen card-screen">
      ${chrome(state, { showExit: true, showNotebook: true })}
      <p>${duoCopy.discussPrompt}</p>
      ${btn("discussed", duoCopy.discussed)}
      ${btn("duo-alone", duoCopy.continueAlone, "btn--ghost")}
    </main>
  `;
}

function puzzleView(state) {
  const stop = stopByOrder(state.currentStop);
  const puzzle = stop.puzzle;
  const hint = state.hintsUsed[stop.id] ? `<p class="hint">${puzzle.hint}</p>` : btn("hint", "💡 힌트", "btn--ghost");
  const solved = state.solvedPuzzleIds.includes(stop.id);
  let body = "";
  if (puzzle.type === "match") body = matchPuzzle(stop, state);
  if (puzzle.type === "hotspot") body = hotspotPuzzle(stop, state);
  if (puzzle.type === "order") body = orderPuzzle(stop, state);
  return `
    <main id="main" class="screen card-screen">
      ${chrome(state, { showExit: true, showNotebook: true })}
      <h1>${puzzle.prompt}</h1>
      ${hint}
      ${state.puzzleMessage ? `<p class="${solved ? "ok" : "warn"}">${state.puzzleMessage}</p>` : ""}
      ${body}
      ${solved ? btn("after-puzzle", "🚶 다음 장소") : ""}
    </main>
  `;
}

function matchPuzzle(stop, state) {
  const draft = state.puzzleDraft;
  return `
    <form class="puzzle" data-puzzle="match">
      ${stop.puzzle.slots
        .map((slot) => {
          const selected = draft[slot.id] || "";
          return `
            <fieldset>
              <legend>${slot.label}</legend>
              ${stop.puzzle.options
                .map(
                  (opt) => `
                <label class="chip">
                  <input type="radio" name="${slot.id}" value="${opt.id}" ${selected === opt.id ? "checked" : ""} />
                  ${opt.label}
                </label>`,
                )
                .join("")}
            </fieldset>`;
        })
        .join("")}
      ${btn("check-match", "✅ 확인")}
    </form>
  `;
}

function hotspotPuzzle(stop, state) {
  const selected = state.puzzleDraft.choice;
  return `
    <div class="photo" role="group" aria-label="가상 증거 이미지">
      <svg viewBox="0 0 320 200" role="img" aria-label="가상 유리 반영. 노란 우산, 남색 우산, 빨간 모자가 보입니다.">
        <rect width="320" height="200" fill="#1b2438"/>
        <text x="16" y="28" fill="#d4a054" font-size="14">19:38 · 가상 반영</text>
        <g data-choice="yellow-umbrella" tabindex="0" role="button" aria-label="노란 우산">
          <circle cx="70" cy="110" r="28" fill="#e6c84a"/>
        </g>
        <g data-choice="navy-umbrella" tabindex="0" role="button" aria-label="남색 우산">
          <circle cx="160" cy="120" r="32" fill="#1a3a66"/>
        </g>
        <g data-choice="red-cap" tabindex="0" role="button" aria-label="빨간 모자">
          <rect x="230" y="96" width="54" height="28" rx="8" fill="#b33a3a"/>
        </g>
      </svg>
    </div>
    <fieldset>
      <legend>또는 목록에서 고르기</legend>
      ${stop.puzzle.choices
        .map(
          (c) => `
        <label class="chip">
          <input type="radio" name="hotspot" value="${c.id}" ${selected === c.id ? "checked" : ""} />
          ${c.label}
        </label>`,
        )
        .join("")}
    </fieldset>
    ${btn("check-hotspot", "✅ 확인")}
  `;
}

function orderPuzzle(stop, state) {
  const ids = state.puzzleDraft.order || stop.puzzle.items.map((item) => item.id);
  const items = ids.map((id) => stop.puzzle.items.find((item) => item.id === id));
  return `
    <ol class="order">
      ${items
        .map(
          (item, index) => `
        <li>
          <span>${index + 1}. ${item.label}</span>
          <span class="row-actions">
            <button type="button" data-action="move-up" data-index="${index}" aria-label="위로">⬆️ 위로</button>
            <button type="button" data-action="move-down" data-index="${index}" aria-label="아래로">⬇️ 아래로</button>
          </span>
        </li>`,
        )
        .join("")}
    </ol>
    ${btn("check-order", "✅ 확인")}
  `;
}

function accusationView(state) {
  const check = state.accusationCheck;
  const draft = state.puzzleDraft;
  return `
    <main id="main" class="screen card-screen">
      ${chrome(state, { showExit: true, showNotebook: true })}
      <h1>${accusation.title}</h1>
      ${accusation.fields
        .map((field) => {
          const ok = check ? check[field.id] : null;
          return `
            <fieldset>
              <legend>${field.label}</legend>
              ${field.options
                .map(
                  (opt) => `
                <label class="chip">
                  <input type="radio" name="${field.id}" value="${opt.id}" ${draft[field.id] === opt.id ? "checked" : ""} />
                  ${opt.label}
                </label>`,
                )
                .join("")}
              ${ok === false ? `<p class="warn">${field.notebookHint}</p>` : ""}
            </fieldset>`;
        })
        .join("")}
      ${check?.allCorrect ? `<p class="ok">${accusation.success}</p>${btn("continue", "📖 재구성 보기")}` : btn("check-accusation", accusation.submit)}
    </main>
  `;
}

function resolutionView(state) {
  const elapsed = state.startedAt ? Math.round((Date.now() - state.startedAt) / 60000) : "—";
  return `
    <main id="main" class="screen card-screen">
      ${chrome(state)}
      <h1>${ending.title}</h1>
      <ol class="ending">${ending.panels.map((p) => `<li>${p}</li>`).join("")}</ol>
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
  if (state.overlay === "notebook") return notebook(state);
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

function notebook(state) {
  const entries = [];
  for (const id of state.solvedPuzzleIds) {
    const stop = stopById(id);
    if (stop?.notebookEntry) entries.push(stop.notebookEntry);
  }
  if (state.collectedCameraClueIds.includes("stop-2") && !state.solvedPuzzleIds.includes("stop-2")) {
    entries.push("📷 카메라 단서: 19:38 ☂️ 남색 우산 반영(가상).");
  }
  return modal(
    notebookCopy.title,
    `
      ${suspects.map((s) => `<p><strong>${s.name}</strong> — ${s.claim}</p>`).join("")}
      ${entries.length ? entries.map((e) => `<p>${e}</p>`).join("") : `<p>${notebookCopy.empty}</p>`}
      <p class="mission">${notebookCopy.question}</p>
      ${btn("close-overlay", notebookCopy.close)}
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
