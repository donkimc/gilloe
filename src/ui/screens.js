import {
  assembleCopy,
  brand,
  coopCopy,
  copy,
  createCopy,
  ending,
  gps,
  osmPlaceUrl,
  pieceCopy,
  previewCopy,
  routeMeta,
  safety,
  screens as screenList,
  trayCopy,
} from "../content.js";
import { gridSizeForCount, assembledPreview, pieceMarkup, piecesForGrid, displayImageUrl } from "../assemble.js";
import { formatApproxDistance } from "../geo.js";
import { currentPlace, gridN, placeCount, trayAllowed } from "../state.js";
import { TEAM_PIECE, piecesForStop } from "../coopPieces.js";
import { OSM_ATTRIBUTION_TEXT } from "../mapConfig.js";
import { DEFAULT_STOP_COUNT, MAX_STOP_COUNT, MIN_STOP_COUNT, formatWalkLabel, walkingStatsFromLine } from "../routeSchema.js";

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
const ICO_REPLAY = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 6V3L7 8l5 5V10c3.3 0 6 2.7 6 6a6 6 0 0 1-10.2 4.3l-1.5 1.6A8 8 0 0 0 20 16c0-4.4-3.6-8-8-8z"/></svg>`;
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
    case "mode":
      return modeView(state);
    case "party":
      return partyView(state);
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

const HERO_ROUTE = "M55 330Q140 350 155 260T270 240T380 150T485 110";

function heroWalkArt() {
  return `
      <div class="walk-art" role="img" aria-label="점선 길을 따라 정류장을 지나가는 산책 일러스트. 실제 경로가 아닙니다.">
        <span class="art-label">오늘의 작은 발견</span>
        <svg viewBox="0 0 560 420" aria-hidden="true">
          <defs>
            <pattern id="street-grid" width="56" height="56" patternUnits="userSpaceOnUse"><path d="M56 0H0V56" fill="none" stroke="#d2c9b6" stroke-width="1"/></pattern>
          </defs>
          <rect width="560" height="420" fill="#e9e3d4"/>
          <rect width="560" height="420" fill="url(#street-grid)"/>
          <path d="M-20 300L140 210 245 240 380 140 590 180" stroke="#f8f5ec" stroke-width="48" fill="none"/>
          <path d="M130 -20L180 140 140 210 190 450M390 -20L380 140 440 300 600 360" stroke="#f8f5ec" stroke-width="30" fill="none"/>
          <path class="hero-route-dots" d="${HERO_ROUTE}" fill="none" stroke="#b47b29" stroke-width="5" stroke-dasharray="2 11" stroke-linecap="round"/>
          <path class="hero-route-progress" d="${HERO_ROUTE}" fill="none" stroke="#d4a054" stroke-width="6" stroke-linecap="round" pathLength="1"/>
          <g fill="#b9c8ad"><rect x="28" y="55" width="88" height="102" rx="24"/><rect x="424" y="248" width="100" height="80" rx="25"/></g>
          <g fill="#d7c9af"><rect x="229" y="43" width="80" height="100" rx="9"/><rect x="236" y="315" width="108" height="65" rx="9"/></g>
          <g class="hero-stop hero-stop--1" fill="#142839" stroke="#f7f0df" stroke-width="5"><circle cx="55" cy="330" r="23"/></g>
          <g class="hero-stop hero-stop--2" fill="#142839" stroke="#f7f0df" stroke-width="5"><circle cx="169" cy="220" r="23"/></g>
          <g class="hero-stop hero-stop--3" fill="#142839" stroke="#f7f0df" stroke-width="5"><circle cx="342" cy="192" r="23"/></g>
          <g fill="#f5f0e5" font-size="17" font-family="sans-serif" text-anchor="middle"><text x="55" y="336">1</text><text x="169" y="226">2</text><text x="342" y="198">3</text></g>
          <g class="hero-stop hero-stop--4">
            <circle cx="485" cy="110" r="30" fill="#d9a54b" stroke="#f7f0df" stroke-width="5"/>
            <path d="M475 110l7 7 13-15" stroke="#142839" stroke-width="3" fill="none"/>
          </g>
          <g class="hero-walker">
            <circle r="11" fill="#4aa3ff" stroke="#f8f5ec" stroke-width="3"/>
            <circle r="3.5" fill="#f8f5ec"/>
          </g>
        </svg>
        <span class="art-ticket"><span>발걸음이 모이면</span><strong>하나의 그림이 되는 산책</strong><span class="ticket-arrow" aria-hidden="true">↗</span></span>
      </div>`;
}

function statusChip(g) {
  if (g.quarantined) return `<span class="status-chip status-chip--bad">${createCopy.quarantined}</span>`;
  if (g.fieldStatus === "field-verified" || g.fieldVerified) return `<span class="status-chip status-chip--ok">${createCopy.verified}</span>`;
  return `<span class="status-chip">${createCopy.unverified}</span>`;
}

function libraryView(state) {
  const games = state.games || [];
  return `
    <main id="main" class="screen card-screen library-screen">
      <nav class="home-nav" aria-label="주 메뉴"><a class="wordmark" href="/" aria-label="Gilloe 홈"><span class="brand-mark" aria-hidden="true">g.</span>Gilloe</a><span class="nav-caption">걸어서 완성하는 하루</span></nav>
      <div class="home-hero"><div class="hero-copy"><p class="kicker">${copy.libraryTitle} · 작은 동네 모험</p>
      <h1 class="home-title">${brand.name} <span class="tagline">${copy.libraryTagline}</span></h1>
      <p class="hero-heading">익숙한 길에서,<br>새로운 조각을.</p>
      <p class="lead">동네를 걷고, 장소마다 숨은 조각을 모으세요.<br>한 걸음씩 나만의 그림이 완성됩니다.</p>
      ${btn("open-create", `${copy.create} <span aria-hidden="true">↗</span>`, "hero-cta")}
      <p class="hero-footnote">GPS 또는 OpenStreetMap으로 나만의 산책 만들기</p></div>
      ${heroWalkArt()}
      </div>
      <div class="how-strip" aria-label="플레이 방법"><span><b>01</b> 걷고 싶은 게임 고르기</span><span><b>02</b> 장소마다 조각 모으기</span><span><b>03</b> 나만의 그림 완성하기</span></div>
      <div class="section-heading"><div><p class="kicker">당신의 다음 산책</p><h2>어디부터 걸어볼까요?</h2></div><span class="collection-count">${games.length}개의 게임</span></div>
      <p class="warn">${ico("🚧", brand.notPublicReady)}</p>
      ${state.invalidSave ? `<p class="warn">저장본이 오래되어 목록부터 시작합니다.</p>` : ""}
      ${state.createNotice ? `<p class="ok">${state.createNotice}</p>` : ""}
      ${state.gamesError ? `<p class="warn">${state.gamesError === "list" ? "목록을 불러오지 못했습니다. API가 켜져 있는지 확인하세요." : state.gamesError === "quarantined" ? createCopy.notPlayable : "게임을 수정하거나 삭제하지 못했습니다."}</p>` : ""}

      <ul class="game-list">
        ${games
          .map(
            (g) => `
          <li class="game-item">
            <button type="button" class="choice" data-action="select-game" data-id="${escapeHtml(g.id)}" ${g.quarantined || g.playable === false ? "disabled" : ""}>
              <span class="game-card-index" aria-hidden="true">↗</span><span class="game-card-tag">동네 퍼즐 산책 · ${g.placeCount}개의 발견</span><strong>${escapeHtml(g.title)}</strong>
              <span>${g.placeCount}곳 · ${escapeHtml(g.walkLabel || "")}</span>
              ${statusChip(g)}
            </button>
            <div class="row-actions">
              ${btn("edit-game", `✏️ ${createCopy.edit}`, "btn--ghost", `data-id="${escapeHtml(g.id)}"`)}
              ${btn("ask-delete-game", `🗑️ ${createCopy.delete}`, "btn--ghost", `data-id="${escapeHtml(g.id)}" data-title="${escapeHtml(g.title)}"`)}
            </div>
          </li>`,
          )
          .join("")}
      </ul>
      <footer class="home-footer"><span class="wordmark">Gilloe</span><span>오늘은 어디로? 길로.</span><p class="osm-credit">${OSM_ATTRIBUTION_TEXT}</p></footer>
    </main>
  `;
}

export function defaultDraft() {
  return {
    step: "landing",
    editingId: null,
    title: "",
    method: null,
    jigsawSource: "system",
    imageDataUrl: null,
    ownershipConfirmed: false,
    gps: { recording: false, paused: false, points: [], stops: [], lastRejected: null },
    draw: { mode: "stops", stops: [], vertices: [], stopTarget: DEFAULT_STOP_COUNT, autoRouted: false, routing: false, routingError: "" },
    osmPick: null,
    gpxError: "",
    checklist: {},
    warnings: [],
  };
}

function createView(state) {
  const draft = state.createDraft || defaultDraft();
  const editing = Boolean(draft.editingId);
  const step = draft.step || "landing";
  return `
    <main id="main" class="screen card-screen create-screen" data-create-step="${step}">
      <h1>${editing ? createCopy.editTitle : createCopy.title}</h1>
      ${btn("back-library", copy.backLibrary, "btn--ghost")}
      ${step === "landing" ? landingStep(draft) : ""}
      ${step === "record" ? recordStep(draft) : ""}
      ${step === "draw" ? drawStep(draft) : ""}
      ${step === "review" ? reviewStep(state, draft) : ""}
      ${state.createError ? `<p class="warn">${state.createError}</p>` : ""}
    </main>
  `;
}

function landingStep(draft) {
  return `
    <p class="lead">${createCopy.landingLead}</p>
    <label class="field">
      <span>${createCopy.name}</span>
      <input type="text" name="title" value="${escapeHtml(draft.title)}" maxlength="80" />
    </label>
    <div class="method-grid">
      ${btn("create-method-gps", `📍 ${createCopy.methodGps}`)}
      ${btn("create-method-osm", `🗺️ ${createCopy.methodOsm}`)}
    </div>
    <label class="field">
      <span>${createCopy.methodGpx}</span>
      <input type="file" name="gpxFile" accept=".gpx,application/gpx+xml,text/xml" />
      ${draft.gpxError ? `<p class="warn">${escapeHtml(draft.gpxError)}</p>` : ""}
    </label>
  `;
}

function recordStep(draft) {
  const gpsState = draft.gps || {};
  return `
    ${btn("create-landing", "방법 다시 고르기", "btn--ghost")}
    <p class="note">정확도 30m 이내 점만 기록합니다. 화면이 꺼지면 위치가 끊길 수 있고, 다시 켜지면 그 사이를 보행 길로 잇습니다. 정류장은 길을 멈춘 뒤에만 추가하세요.</p>
    <p>점 ${gpsState.points?.length || 0}개 · 정류장 ${gpsState.stops?.length || 0}/4 ${gpsState.filling ? "· 보행 길을 따라 잇는 중…" : gpsState.lastRejected ? `· ${gpsState.lastRejected}` : ""}</p>
    ${!gpsState.recording ? btn("gps-start", createCopy.startRecord) : ""}
    ${gpsState.recording && !gpsState.paused ? btn("gps-pause", createCopy.pause, "btn--ghost") : ""}
    ${gpsState.paused ? btn("gps-resume", createCopy.resume) : ""}
    ${gpsState.recording ? btn("gps-add-stop", createCopy.addStop, gpsState.stops?.length >= 4 ? "is-disabled" : "") : ""}
    ${btn("gps-cancel", createCopy.cancelRecord, "btn--ghost")}
    ${gpsState.stops?.length === 4 && (gpsState.points?.length || 0) >= 2 && !gpsState.filling ? btn("gps-finish", createCopy.finishRecord) : ""}
    <ol class="order">${(gpsState.stops || []).map((s) => `<li>${s.order}. ${escapeHtml(s.title || "정류장")}</li>`).join("")}</ol>
    <p class="osm-credit">${OSM_ATTRIBUTION_TEXT}</p>
  `;
}

function drawStep(draft) {
  const draw = draft.draw || { mode: "stops", stops: [], vertices: [], stopTarget: DEFAULT_STOP_COUNT };
  const target = Number(draw.stopTarget) || DEFAULT_STOP_COUNT;
  const ready = (draw.stops?.length || 0) === target && (draw.vertices?.length || 0) >= 2 && !draw.routing;
  const pick = draft.osmPick;
  return `
    ${btn("create-landing", "방법 다시 고르기", "btn--ghost")}
    <p class="note">정류장 수를 고른 뒤 지도를 누르세요. 이름과 설명을 확인하고 정하면, 마지막 정류장에서 걸을 수 있는 길을 따라 경로가 그려집니다.</p>
    <label class="field">
      <span>정류장 수 (${MIN_STOP_COUNT}~${MAX_STOP_COUNT})</span>
      <input type="number" name="stop-target" min="${MIN_STOP_COUNT}" max="${MAX_STOP_COUNT}" step="1" value="${target}" />
    </label>
    <div class="row-actions">
      ${btn("draw-mode-stops", createCopy.drawStops, draw.mode === "stops" ? "" : "btn--ghost")}
      ${btn("draw-mode-path", createCopy.drawPath, draw.mode === "path" ? "" : "btn--ghost")}
      ${btn("draw-undo", createCopy.undo, "btn--ghost")}
    </div>
    <p>정류장 ${draw.stops?.length || 0}/${target} · 경로 점 ${draw.vertices?.length || 0}개${draw.routing ? " · 길을 따라 그리는 중…" : ""}</p>
    ${draw.routingError ? `<p class="warn">${escapeHtml(draw.routingError)}</p>` : ""}
    ${(draw.stops || [])
      .map(
        (s) => `
      <label class="field">
        <span>${s.order}. 이름</span>
        <input type="text" name="stop-title" data-id="${s.id}" value="${escapeHtml(s.title || "")}" maxlength="80" />
      </label>
      <label class="field">
        <span>짧은 안내</span>
        <input type="text" name="stop-directions" data-id="${s.id}" value="${escapeHtml(s.directions || "")}" maxlength="200" />
      </label>`,
      )
      .join("")}
    ${ready ? btn("draw-finish", "검토하기") : `<p class="muted">${draw.routing ? "OpenStreetMap 보행 길을 따라 경로를 그리는 중입니다." : `정류장 ${target}곳을 정하면 걸을 수 있는 길을 따라 경로가 그려집니다.`}</p>`}
    <p class="osm-credit">${OSM_ATTRIBUTION_TEXT}</p>
    ${
      pick
        ? `<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="osm-pick-title">
            <div class="overlay-card">
              <h2 id="osm-pick-title">이 장소로 할까요?</h2>
              ${pick.loading ? `<p class="note">OpenStreetMap에서 이름과 설명을 찾는 중…</p>` : ""}
              ${pick.error ? `<p class="warn">${escapeHtml(pick.error)}</p>` : ""}
              ${
                !pick.loading
                  ? `
                <p class="muted">${pick.found ? "OpenStreetMap 이름·설명입니다. 고친 뒤 정하세요." : "가까운 이름 있는 지점을 찾지 못했습니다. 직접 적어 정하세요."}</p>
                <label class="field"><span>이름</span><input type="text" name="osm-pick-name" value="${escapeHtml(pick.name || "")}" maxlength="80" /></label>
                <label class="field"><span>설명</span><textarea name="osm-pick-description" rows="3" maxlength="200">${escapeHtml(pick.description || "")}</textarea></label>
                ${btn("osm-pick-confirm", "이 위치로 정하기")}
              `
                  : ""
              }
              ${btn("osm-pick-cancel", "취소", "btn--ghost")}
            </div>
          </div>`
        : ""
    }
  `;
}

function reviewStep(state, draft) {
  const { places, routeLine, method } = draftPreview(draft);
  const stats = walkingStatsFromLine(routeLine, places.length);
  const checks = draft.checklist || {};
  const gpsReady = method === "creator-gps-recording";
  return `
    ${btn("create-back-method", "이어서 고치기", "btn--ghost")}
    <label class="field">
      <span>${createCopy.name}</span>
      <input type="text" name="title" value="${escapeHtml(draft.title)}" maxlength="80" />
    </label>
    <p class="note">${formatWalkLabel(stats)} · 방법: ${method || ""}</p>
    <p class="status-chip">${gpsReady ? "GPS 기록 · 체크리스트 후 현장 확인 가능" : "OpenStreetMap 초안 · 현장 확인 걷기 필요"}</p>
    <ol class="order">
      ${places
        .map(
          (p, i) => `
        <li>
          <label class="field"><span>${i + 1}. 이름</span><input type="text" name="review-name" data-index="${i}" value="${escapeHtml(p.name || "")}" maxlength="80" /></label>
          <label class="field"><span>안내</span><input type="text" name="review-blurb" data-index="${i}" value="${escapeHtml(p.blurb || "")}" maxlength="200" /></label>
          <label class="chip"><input type="checkbox" name="public-stop" data-index="${i}" ${p.publicStopConfirmed ? "checked" : ""} /> 공개 보행 공간입니다</label>
        </li>`,
        )
        .join("")}
    </ol>
    <fieldset>
      <legend>${createCopy.jigsaw}</legend>
      <label class="chip"><input type="radio" name="jigsawSource" value="upload" ${draft.jigsawSource === "upload" ? "checked" : ""} /> ${createCopy.jigsawUpload}</label>
      <label class="chip"><input type="radio" name="jigsawSource" value="system" ${draft.jigsawSource !== "upload" ? "checked" : ""} /> ${createCopy.jigsawSystem}</label>
      ${draft.jigsawSource === "upload" ? `<input type="file" name="jigsawFile" accept="image/jpeg,image/png,image/webp" /><label class="chip"><input type="checkbox" name="ownership" ${draft.ownershipConfirmed ? "checked" : ""} /> ${createCopy.ownership}</label>` : ""}
    </fieldset>
    <fieldset>
      <legend>현장 확인</legend>
      <label class="chip"><input type="checkbox" name="check-walked" ${checks.walked ? "checked" : ""} /> 이 경로를 걸었습니다</label>
      <label class="chip"><input type="checkbox" name="check-public" ${checks.public ? "checked" : ""} /> 정류장은 공개 보행 공간입니다</label>
      <label class="chip"><input type="checkbox" name="check-private" ${checks.noPrivate ? "checked" : ""} /> 사유지·매장 안이 아닙니다</label>
      <label class="chip"><input type="checkbox" name="check-alley" ${checks.noAlley ? "checked" : ""} /> 골목·차도·주차장 입구가 아닙니다</label>
      <label class="chip"><input type="checkbox" name="check-purchase" ${checks.noPurchase ? "checked" : ""} /> 구매나 직원 대화가 필요하지 않습니다</label>
    </fieldset>
    ${btn("submit-create", state.createBusy ? "저장 중…" : draft.editingId ? createCopy.save : createCopy.submit, state.createBusy ? "is-disabled" : "")}
    <p class="muted">현장 확인 전에는 외부 테스트·공개를 하지 마세요. ${OSM_ATTRIBUTION_TEXT}</p>
  `;
}

export function draftPreview(draft) {
  const method = draft.method;
  if (method === "creator-gps-recording") {
    const stops = draft.gps?.stops || [];
    return {
      method,
      places: stops.map((s) => ({
        name: s.title,
        lat: s.lat,
        lng: s.lng,
        blurb: s.directions,
        publicStopConfirmed: s.publicStopConfirmed,
        photoUrl: s.photoDataUrl || "",
        coordinateSource: method,
      })),
      routeLine: (draft.gps?.points || []).map((p) => [p.lng, p.lat]),
    };
  }
  if (method === "openstreetmap-assisted-drawing" || method === "creator-gpx-import") {
    const stops = draft.draw?.stops || [];
    return {
      method,
      places: stops.map((s) => ({
        name: s.title,
        lat: s.lat,
        lng: s.lng,
        blurb: s.directions,
        publicStopConfirmed: s.publicStopConfirmed,
        photoUrl: s.photoDataUrl || "",
        coordinateSource: method,
      })),
      routeLine: draft.draw?.vertices || [],
    };
  }
  return { method: method || "openstreetmap-assisted-drawing", places: [], routeLine: [] };
}

function modeView(state) {
  return `
    <main id="main" class="screen card-screen">
      ${btn("back-library", copy.backLibrary, "btn--ghost")}
      <h1>${coopCopy.title}</h1>
      <p class="lead">${escapeHtml(state.game?.title || "")}</p>
      <p class="note">${coopCopy.coopHint}</p>
      ${btn("choose-solo", `🚶 ${coopCopy.solo}`)}
      ${btn("choose-coop", `🤝 ${coopCopy.coop}`)}
    </main>
  `;
}

function partyView(state) {
  const party = state.party;
  const wait = state.partyWait || {};
  if (!party && !wait.joinMode) {
    return `
      <main id="main" class="screen card-screen">
        ${btn("back-library", copy.backLibrary, "btn--ghost")}
        <h1>${coopCopy.coop}</h1>
        ${btn("party-create", coopCopy.createParty)}
        ${btn("party-join-form", coopCopy.joinParty, "btn--ghost")}
        ${state.partyError ? `<p class="warn">${escapeHtml(state.partyError)}</p>` : ""}
      </main>
    `;
  }
  if (wait.joinMode && !party) {
    return `
      <main id="main" class="screen card-screen">
        ${btn("back-library", copy.backLibrary, "btn--ghost")}
        <label class="field"><span>${coopCopy.enterCode}</span><input type="text" name="party-code" maxlength="8" value="${escapeHtml(wait.code || "")}" /></label>
        ${btn("party-join", coopCopy.join)}
        ${state.partyError ? `<p class="warn">${escapeHtml(state.partyError)}</p>` : ""}
      </main>
    `;
  }
  const members = party.members || [];
  const you = party.you;
  const partner = members.find((m) => m.role !== you?.role);
  return `
    <main id="main" class="screen card-screen">
      <h1>${coopCopy.coop}</h1>
      ${wait.inviteCode ? `<p class="note">${coopCopy.code}: <strong>${escapeHtml(wait.inviteCode)}</strong></p>
        ${btn("party-copy", coopCopy.copyCode, "btn--ghost")}
        ${btn("party-share", coopCopy.share, "btn--ghost")}
        ${wait.inPersonCode ? `<p class="note">${coopCopy.inPerson}: <strong>${escapeHtml(wait.inPersonCode)}</strong></p>` : ""}` : ""}
      <ul class="order">
        ${members.map((m) => `<li>${escapeHtml(m.label)} · ${m.arrivedStops?.includes(1) ? coopCopy.nearStart : coopCopy.waiting} · ${escapeHtml(m.presence || "")}</li>`).join("")}
      </ul>
      ${partner?.presence === "연결 끊김" ? `<p class="warn">${coopCopy.disconnected}</p>${btn("party-solo", coopCopy.goSolo, "btn--ghost")}` : ""}
      ${party.status === "waiting" || party.status === "ready" ? `${btn("party-near", `📍 ${coopCopy.nearStart}`)}${btn("party-ready", coopCopy.ready)}` : ""}
      ${state.partyError ? `<p class="warn">${escapeHtml(state.partyError)}</p>` : ""}
      ${btn("party-leave", gps.exit, "btn--ghost")}
      <p class="muted">상대방의 정확한 위치는 저장하거나 보여 주지 않습니다.</p>
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

function previewView(state) {
  const game = state.game;
  if (state.previewTour) {
    const place = game.places?.[state.previewStopIndex] || game.places?.[0];
    const skippable = Boolean(state.previewCard && !state.previewDone);
    const photo = displayImageUrl(place?.photoUrl);
    return `
      <main id="main" class="screen map-screen map-screen--tour">
        <div class="tour-bar">
          ${iconBtn("replay-preview", ICO_REPLAY, previewCopy.replay, "icon-btn--back")}
          ${iconBtn("close-preview", ICO_PREV, previewCopy.closeTour, "icon-btn--back")}
        </div>
        ${
          state.previewCard && place
            ? `<article class="tour-card"${skippable ? ` data-action="tour-next"` : ""}>
            <p class="kicker">${place.order} / ${game.placeCount}</p>
            <h2>${escapeHtml(place.name)}</h2>
            ${
              photo
                ? `<figure class="photo-card"><img src="${escapeHtml(photo)}" alt="${escapeHtml(place.name)}" /></figure>`
                : ""
            }
            ${place.address ? `<p class="note">${escapeHtml(place.address)}</p>` : ""}
            ${place.blurb ? `<p>${escapeHtml(place.blurb)}</p>` : ""}
            <a class="ext" href="${osmPlaceUrl(place)}" target="_blank" rel="noopener noreferrer">${previewCopy.openOsm}</a>
            ${skippable ? `<p class="muted">${previewCopy.nextStop}</p>` : ""}
          </article>`
            : state.previewDone
              ? ""
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
      ${game.fieldStatus !== "field-verified" ? `<p class="warn">${ico("⚠️", brand.prototypeBanner)}</p>` : ""}
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
      <a class="ext" href="${osmPlaceUrl(place)}" target="_blank" rel="noopener noreferrer">${ico("🧭", gps.directionsExternal)}</a>
    </main>
  `;
}

function placeView(state) {
  const place = currentPlace(state);
  const role = state.playMode === "coop" ? state.party?.you?.role || "A" : "solo";
  const ids = piecesForStop(place.order, role, placeCount(state));
  const haveAll = ids.every((id) => (state.collectedPieceIds || []).includes(id));
  const photo = displayImageUrl(place.photoUrl);
  return `
    <main id="main" class="screen card-screen">
      ${chrome(state, { showExit: true, showTray: true, showPrev: true })}
      <h1>${place.order}. ${place.name}</h1>
      ${!state.stoppedWalking ? `<p class="warn">${ico("🛑", "길을 멈춘 뒤에 안내를 보세요.")}</p>${btn("stopped", "🛑 멈췄어요")}` : `
        ${photo ? `<figure class="photo-card"><img src="${escapeHtml(photo)}" alt="${escapeHtml(place.name)}" /></figure>` : `<p class="muted">등록된 사진이 없습니다. 글 안내로 장소를 확인하세요.</p>`}
        ${place.address ? `<p class="note">${place.address}</p>` : ""}
        <p>${place.blurb || ""}</p>
        <a class="ext" href="${osmPlaceUrl(place)}" target="_blank" rel="noopener noreferrer">${createCopy.osmLink}</a>
        ${
          ids.length
            ? `<div class="piece-award">${ids.map((id) => tile(state, id, "mark-tile--large")).join("")}</div>
        ${haveAll ? `<p class="ok">${coopCopy.waitPartner}</p>` : btn("collect-piece", `🧩 ${state.playMode === "coop" ? coopCopy.collectMine : pieceCopy.collect}`)}`
            : `<p class="muted">이 정류장에서 받을 내 조각은 없습니다.</p>${btn("collect-piece", "다음으로")}`
        }
      `}
    </main>
  `;
}

function canMovePiece(state, owned, id, personalSeated) {
  if (id === TEAM_PIECE && personalSeated < 8 && !(state.collectedPieceIds || []).includes(TEAM_PIECE)) return false;
  if (owned && !owned.has(id)) return false;
  return true;
}

function assembleView(state) {
  const n = gridN(state);
  const pieces = piecesForGrid(n);
  const placement = state.assemblePlacement?.["piece-1"] !== undefined ? state.assemblePlacement : Object.fromEntries(pieces.map((p) => [p.id, null]));
  const hint = state.hintsUsed.assemble ? `<p class="hint">${assembleCopy.hint}</p>` : btn("hint", "💡 힌트", "btn--ghost");
  const seated = new Set(Object.entries(placement).filter(([, cell]) => cell).map(([id]) => id));
  const order = state.assembleOrder?.length ? state.assembleOrder : pieces.map((p) => p.id);
  const tray = order.filter((id) => !seated.has(id));
  const ownedIds = [...(state.party?.you?.ownedPieceIds || [])];
  if ((state.collectedPieceIds || []).includes(TEAM_PIECE)) ownedIds.push(TEAM_PIECE);
  const owned = state.playMode === "coop" ? new Set(ownedIds) : null;
  const personalSeated = Object.entries(placement).filter(([id, cell]) => cell && id !== TEAM_PIECE).length;
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
          <button type="button" class="assemble-piece${state.assembleSelected === id ? " is-selected" : ""}${!canMovePiece(state, owned, id, personalSeated) ? " is-disabled" : ""}" data-action="select-piece" data-piece="${id}" aria-label="${id}" ${!canMovePiece(state, owned, id, personalSeated) ? "disabled" : ""}>
            ${tile(state, id)}
          </button>`,
          )
          .join("")}
      </div>
      ${state.playMode === "coop" && personalSeated >= 8 && !state.collectedPieceIds?.includes(TEAM_PIECE) ? btn("party-complete-ready", coopCopy.finishTogether) : ""}
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
      <div class="mark-preview mark-preview--done">${assembledPreview(jigsaw(state), n)}</div>
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
