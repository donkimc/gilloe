import {
  assembleCopy,
  brand,
  copy,
  createCopy,
  ending,
  gps,
  osmDirectionsUrl,
  naverPlaceUrl,
  pieceCopy,
  previewCopy,
  routeMeta,
  safety,
  screens as screenList,
  trayCopy,
} from "../content.js";
import { gridSizeForCount, outlinePreview, pieceMarkup, piecesForGrid } from "../assemble.js";
import { formatApproxDistance } from "../geo.js";
import { currentPlace, gridN, placeCount, trayAllowed } from "../state.js";

const locationIcons = {
  idle: "📍",
  locating: "🔄",
  good: "✅",
  "low-accuracy": "⚠️",
  denied: "🚫",
  unavailable: "❌",
  timeout: "⏳",
};

function ico(symbol, text) {
  return `<span class="ico"><span class="ico__mark" aria-hidden="true">${symbol}</span><span>${text}</span></span>`;
}

function btn(action, label, extra = "", attrs = "") {
  return `<button type="button" class="btn ${extra}" data-action="${action}" ${attrs}>${label}</button>`;
}

function banner() {
  return `<div class="proto-banner" role="status">${ico("⚠️", brand.prototypeBanner)}</div>`;
}

function jigsaw(state) {
  return state.game?.jigsaw || { source: "system", systemImageId: "station" };
}

function tile(state, pieceId, extraClass = "") {
  return pieceMarkup(pieceId, extraClass, jigsaw(state), gridN(state));
}

function iconBtn(action, svg, label, extra = "") {
  return `<button type="button" class="icon-btn ${extra}" data-action="${action}" aria-label="${label}" title="${label}">${svg}</button>`;
}

const ICO_PREV = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15.7 4.3 7 13l8.7 8.7 1.6-1.6L10.2 13l7.1-7.1z"/></svg>`;
const ICO_TRAY = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1.2" fill="currentColor"/><rect x="13" y="3" width="8" height="8" rx="1.2" fill="currentColor" opacity=".75"/><rect x="3" y="13" width="8" height="8" rx="1.2" fill="currentColor" opacity=".75"/><rect x="13" y="13" width="8" height="8" rx="1.2" fill="currentColor"/></svg>`;
const ICO_EXIT = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6z"/></svg>`;

function progress(state) {
  const total = placeCount(state);
  const n = state.collectedPieceIds?.length || 0;
  return `<span class="tray-badge">${Math.min(n, total)}</span>`;
}

function chrome(state, { showExit = false, showTray = false, showPrev = false } = {}) {
  const count = state.collectedPieceIds?.length || 0;
  return `
    <header class="top">
      <p class="brand">${brand.name}</p>
      <div class="top-actions">
        ${showPrev && state.currentStop > 1 ? iconBtn("prev-place", ICO_PREV, gps.prevPlace) : ""}
        ${
          showTray && trayAllowed(state.screen)
            ? `<span class="icon-wrap">${iconBtn("notebook", ICO_TRAY, trayCopy.open)}${count ? progress(state) : ""}</span>`
            : ""
        }
        ${showExit ? iconBtn("exit", ICO_EXIT, gps.exit) : ""}
      </div>
    </header>
  `;
}

export function render(state) {
  return `
    <a class="skip-link" href="#main">본문으로</a>
    ${banner()}
    <div class="app-shell" data-screen="${state.screen}">
      ${view(state)}
    </div>
    ${renderOverlay(state)}
    ${state.simPanel ? renderSimPanel(state) : ""}
  `;
}

function view(state) {
  switch (state.screen) {
    case "library":
      return libraryView(state);
    case "create":
      return createView(state);
    case "safety":
      return safetyView();
    case "preview":
      return previewView(state);
    case "navigating":
      return navView(state);
    case "place":
      return placeView(state);
    case "assemble":
      return assembleView(state);
    case "resolution":
      return resolutionView(state);
    default:
      return libraryView(state);
  }
}

function libraryView(state) {
  const games = state.games || [];
  return `
    <main id="main" class="screen card-screen">
      <p class="kicker">${copy.libraryTitle}</p>
      <h1 class="home-title">${brand.name} <span class="tagline">${copy.libraryTagline}</span></h1>
      <p class="lead">${copy.libraryLead}</p>
      <p class="warn">${ico("🚧", brand.notPublicReady)}</p>
      ${state.invalidSave ? `<p class="warn">저장본이 오래되어 목록부터 시작합니다.</p>` : ""}
      ${state.createNotice ? `<p class="ok">${state.createNotice}</p>` : ""}
      ${state.gamesError ? `<p class="warn">${state.gamesError === "list" ? "목록을 불러오지 못했습니다. API가 켜져 있는지 확인하세요." : "게임을 수정하거나 삭제하지 못했습니다."}</p>` : ""}
      ${btn("open-create", `➕ ${copy.create}`)}
      <ul class="game-list">
        ${games
          .map(
            (g) => `
          <li class="game-item">
            <button type="button" class="choice" data-action="select-game" data-id="${escapeHtml(g.id)}">
              <strong>${escapeHtml(g.title)}</strong>
              <span>${g.placeCount}곳 · ${escapeHtml(g.walkLabel || "")}</span>
            </button>
            <div class="row-actions">
              ${btn("edit-game", `✏️ ${createCopy.edit}`, "btn--ghost", `data-id="${escapeHtml(g.id)}"`)}
              ${btn("ask-delete-game", `🗑️ ${createCopy.delete}`, "btn--ghost", `data-id="${escapeHtml(g.id)}" data-title="${escapeHtml(g.title)}"`)}
            </div>
          </li>`,
          )
          .join("")}
      </ul>
    </main>
  `;
}

function createView(state) {
  const draft = state.createDraft || defaultDraft();
  const n = Number(draft.placeCount) || 4;
  const editing = Boolean(draft.editingId);
  return `
    <main id="main" class="screen card-screen">
      <h1>${editing ? createCopy.editTitle : createCopy.title}</h1>
      ${btn("back-library", copy.backLibrary, "btn--ghost")}
      <label class="field">
        <span>${createCopy.name}</span>
        <input type="text" name="title" value="${escapeHtml(draft.title)}" maxlength="80" />
      </label>
      <fieldset>
        <legend>${createCopy.count}</legend>
        ${[4, 9, 16, 25]
          .map(
            (c) => `
          <label class="chip">
            <input type="radio" name="placeCount" value="${c}" ${n === c ? "checked" : ""} />
            ${c}곳 (${Math.sqrt(c)}×${Math.sqrt(c)})
          </label>`,
          )
          .join("")}
      </fieldset>
      ${Array.from({ length: n }, (_, i) => placeRow(draft, i)).join("")}
      <fieldset>
        <legend>${createCopy.jigsaw}</legend>
        <label class="chip"><input type="radio" name="jigsawSource" value="final-place" ${draft.jigsawSource === "final-place" ? "checked" : ""} /> ${createCopy.jigsawFinal}</label>
        <label class="chip"><input type="radio" name="jigsawSource" value="upload" ${draft.jigsawSource === "upload" ? "checked" : ""} /> ${createCopy.jigsawUpload}</label>
        <label class="chip"><input type="radio" name="jigsawSource" value="system" ${draft.jigsawSource === "system" ? "checked" : ""} /> ${createCopy.jigsawSystem}</label>
        ${draft.jigsawSource === "upload" ? `<input type="file" name="jigsawFile" accept="image/jpeg,image/png,image/webp" />` : ""}
        ${draft.jigsawSource === "system" ? `<p class="note">저장 시 시스템 그림 중 하나가 쓰입니다.</p>` : ""}
      </fieldset>
      ${state.createError ? `<p class="warn">${state.createError}</p>` : ""}
      ${btn("submit-create", state.createBusy ? "저장 중…" : editing ? createCopy.save : createCopy.submit, state.createBusy ? "is-disabled" : "")}
    </main>
  `;
}

function defaultDraft() {
  return { title: "", placeCount: 4, rows: [{ url: "" }], jigsawSource: "final-place" };
}

function placeRow(draft, i) {
  const row = draft.rows?.[i] || { url: "" };
  const resolved = row.resolved;
  return `
    <label class="field">
      <span>${i + 1}. ${createCopy.url}</span>
      <input type="url" name="place-url" data-index="${i}" value="${escapeHtml(row.url || "")}" placeholder="https://naver.me/… 또는 map.naver.com" />
      ${row.resolving ? `<p class="muted">${createCopy.resolving}</p>` : ""}
      ${resolved?.ok ? `<p class="ok">${resolved.name || "위치 확인"} · ${resolved.lat.toFixed(4)}, ${resolved.lng.toFixed(4)}</p>` : ""}
      ${row.url && resolved && !resolved.ok ? `<p class="warn">${resolved.error || createCopy.needCoords}</p>` : ""}
    </label>
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

function previewView(state) {
  const game = state.game;
  if (state.previewTour) {
    const place = game.places?.[state.previewStopIndex] || game.places?.[0];
    return `
      <main id="main" class="screen map-screen map-screen--tour">
        <div class="tour-bar">
          ${iconBtn("close-preview", ICO_EXIT, previewCopy.closeTour)}
        </div>
        ${
          state.previewCard
            ? `<article class="tour-card" data-action="tour-next">
            <p class="kicker">${place.order} / ${game.placeCount}</p>
            <h2>${escapeHtml(place.name)}</h2>
            ${place.photoUrl ? `<figure class="photo-card"><img src="${escapeHtml(place.photoUrl)}" alt="" /></figure>` : ""}
            ${place.address ? `<p class="note">${escapeHtml(place.address)}</p>` : ""}
            ${place.blurb ? `<p>${escapeHtml(place.blurb)}</p>` : ""}
            <p class="muted">${previewCopy.nextStop}</p>
          </article>`
            : `<p class="tour-status">${previewCopy.playing}</p>`
        }
      </main>
    `;
  }
  const locateStuck = ["denied", "unavailable", "timeout"].includes(state.locationStatus);
  const locateWait = state.locationPermissionAsked && (state.locationStatus === "locating" || locateStuck);
  return `
    <main id="main" class="screen map-screen">
      ${chrome(state, { showExit: true })}
      <h1>${previewCopy.title}</h1>
      <p><strong>${escapeHtml(game.title)}</strong></p>
      <p class="note">${game.walkLabel} · ${game.placeCount}곳</p>
      ${locationPanel(state)}
      ${state.locationPermissionAsked && state.locationStatus === "locating" ? `<p class="muted">${gps.locatingHint}</p>` : ""}
      ${locateWait ? btn("skip-locate", gps.skipLocate, "btn--ghost") : ""}
      ${!state.locationPermissionAsked ? btn("find-location", `📍 ${gps.findMe}`) : ""}
      ${btn("start-preview", previewCopy.play)}
      ${btn("continue", previewCopy.startWalk, "btn--ghost")}
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
  const accuracy = Number.isFinite(state.locationAccuracyMeters)
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

function navView(state) {
  const place = currentPlace(state);
  const arriveEnabled = state.canAutoArrive;
  return `
    <main id="main" class="screen map-screen">
      ${chrome(state, { showExit: true, showTray: true, showPrev: true })}
      <h1>${place.order}. ${place.name}</h1>
      <p>${place.blurb || "공개 보행 공간에서 멈추세요."}</p>
      ${place.address ? `<p class="note">${place.address}</p>` : ""}
      ${state.mapStatus !== "ok" ? `<p class="warn">${place.address || routeMeta.mapFailed}</p>` : ""}
      ${locationPanel(state)}
      ${btn("arrive", gps.arrive, arriveEnabled ? "" : "is-disabled")}
      ${!arriveEnabled ? `<p class="muted">${gps.arriveLocked}</p>` : ""}
      ${state.manualAvailable || ["denied", "unavailable", "timeout", "low-accuracy"].includes(state.locationStatus) ? btn("manual", gps.manual, "btn--ghost") : ""}
      ${btn("help", gps.help, "btn--ghost")}
      ${btn("retry-location", gps.retryLocation, "btn--ghost")}
      <a class="ext" href="${osmDirectionsUrl(place)}" target="_blank" rel="noopener noreferrer">${ico("🧭", gps.directionsExternal)}</a>
    </main>
  `;
}

function placeView(state) {
  const place = currentPlace(state);
  const pieceId = `piece-${place.order}`;
  return `
    <main id="main" class="screen card-screen">
      ${chrome(state, { showExit: true, showTray: true, showPrev: true })}
      <h1>${place.order}. ${place.name}</h1>
      ${!state.stoppedWalking ? `<p class="warn">${ico("🛑", "길을 멈춘 뒤에 안내를 보세요.")}</p>${btn("stopped", "🛑 멈췄어요")}` : `
        ${place.photoUrl ? `<figure class="photo-card"><img src="${escapeHtml(place.photoUrl)}" alt="${escapeHtml(place.name)}" /></figure>` : `<p class="muted">등록된 사진이 없습니다.</p>`}
        ${place.address ? `<p class="note">${place.address}</p>` : ""}
        <p>${place.blurb || ""}</p>
        <a class="ext" href="${naverPlaceUrl(place)}" target="_blank" rel="noopener noreferrer">${createCopy.naverLink}</a>
        <div class="piece-award">${tile(state, pieceId, "mark-tile--large")}</div>
        ${btn("collect-piece", `🧩 ${pieceCopy.collect}`)}
      `}
    </main>
  `;
}

function assembleView(state) {
  const n = gridN(state);
  const pieces = piecesForGrid(n);
  const placement = state.assemblePlacement?.["piece-1"] !== undefined ? state.assemblePlacement : Object.fromEntries(pieces.map((p) => [p.id, null]));
  const hint = state.hintsUsed.assemble ? `<p class="hint">${assembleCopy.hint}</p>` : btn("hint", "💡 힌트", "btn--ghost");
  const seated = new Set(Object.entries(placement).filter(([, cell]) => cell).map(([id]) => id));
  const order = state.assembleOrder?.length ? state.assembleOrder : pieces.map((p) => p.id);
  const tray = order.filter((id) => !seated.has(id));
  return `
    <main id="main" class="screen card-screen">
      ${chrome(state, { showExit: true, showTray: true })}
      <h1>${assembleCopy.title}</h1>
      <p>${assembleCopy.body}</p>
      ${hint}
      <div class="assemble-board" data-assemble-board style="--grid:${n}">
        <div class="assemble-fit" aria-hidden="true">
          ${Object.entries(placement)
            .filter(([, cell]) => cell)
            .map(([id]) => tile(state, id, "mark-tile--seated"))
            .join("")}
        </div>
        <div class="assemble-slots" style="grid-template-columns:repeat(${n},1fr);grid-template-rows:repeat(${n},1fr)">
          ${pieces
            .map((p) => {
              const occupant = Object.entries(placement).find(([, c]) => c === p.cell);
              return `<button type="button" class="assemble-cell${occupant ? " is-filled" : ""}" data-action="place-cell" data-cell="${p.cell}" aria-label="${p.cell}"></button>`;
            })
            .join("")}
        </div>
      </div>
      <div class="assemble-tray">
        ${tray
          .map(
            (id) => `
          <button type="button" class="assemble-piece${state.assembleSelected === id ? " is-selected" : ""}" data-action="select-piece" data-piece="${id}" aria-label="${id}">
            ${tile(state, id)}
          </button>`,
          )
          .join("")}
      </div>
      ${state.assembleComplete ? `<p class="ok">${pieceCopy.done}</p>${btn("continue", assembleCopy.continue)}` : ""}
    </main>
  `;
}

function resolutionView(state) {
  const n = gridN(state);
  return `
    <main id="main" class="screen card-screen">
      ${chrome(state)}
      <h1>${ending.title}</h1>
      <div class="mark-preview mark-preview--done">${outlinePreview(n)}</div>
      <p class="note">맞춘 그림은 바로 앞 화면의 조각판에 있습니다. 시작 전에는 전체를 보여 주지 않습니다.</p>
      <p>${ending.thanks}</p>
      ${btn("reset", copy.backLibrary)}
    </main>
  `;
}

function renderOverlay(state) {
  if (!state.overlay) return "";
  if (state.overlay === "notebook") return tray(state);
  if (state.overlay === "help") return modal("❓ 도움", `<p>${routeMeta.helpBody}</p>${btn("close-overlay", "닫기")}`);
  if (state.overlay === "exit") {
    return modal(gps.exit, `<p>${routeMeta.exitBody}</p>${btn("reset", "진행 지우고 종료")}${btn("close-overlay", "돌아가기", "btn--ghost")}`);
  }
  if (state.overlay === "manual") {
    const place = currentPlace(state);
    return modal(
      gps.manualConfirmTitle,
      `<p>${gps.manualConfirmBody}</p><p><strong>${place?.name || ""}</strong></p>${btn("confirm-manual", gps.manualConfirm)}${btn("close-overlay", "취소", "btn--ghost")}`,
    );
  }
  if (state.overlay === "delete-game") {
    return modal(
      createCopy.deleteTitle,
      `<p>${createCopy.deleteBody}</p><p><strong>${escapeHtml(state.deleteGameTitle || "")}</strong></p>${btn("confirm-delete-game", createCopy.deleteConfirm, "", `data-id="${escapeHtml(state.deleteGameId || "")}"`)}${btn("close-overlay", "취소", "btn--ghost")}`,
    );
  }
  return "";
}

function modal(title, body) {
  return `<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="dlg-title"><div class="overlay-card"><h2 id="dlg-title">${title}</h2>${body}</div></div>`;
}

function tray(state) {
  const n = gridN(state);
  const collected = new Set(state.collectedPieceIds || []);
  return modal(
    trayCopy.title,
    `
      <div class="tray-grid" style="grid-template-columns:repeat(${Math.min(n, 5)},1fr)">
        ${piecesForGrid(n)
          .map((piece) => {
            const have = collected.has(piece.id);
            return `<div class="tray-slot${have ? " is-filled" : ""}">${have ? tile(state, piece.id) : `<span class="muted">${piece.order}</span>`}</div>`;
          })
          .join("")}
      </div>
      <p>${collected.size ? trayCopy.count(collected.size, placeCount(state)) : trayCopy.empty}</p>
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
        <button type="button" class="sim-toggle" data-action="sim-toggle" aria-expanded="${minimized ? "false" : "true"}">${minimized ? "펼치기" : "접기"}</button>
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
        <button type="button" data-sim="map" data-value="fail">${ico("🗺️", "지도 실패")}</button>
      </div>`
      }
    </aside>
  `;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

export { gridSizeForCount, screenList };
