export const brand = {
  name: "Gilloe",
  prototypeBanner: "현장 검증 전 임시 경로",
  notPublicReady: "이 버전은 현장 검증 전 프로토타입입니다. 공개 플레이용이 아닙니다.",
  locationOptions: {
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 12000,
  },
  accuracyCeilingMeters: 80,
  manualFallbackAfterMs: 8000,
};

export const copy = {
  libraryTitle: "퍼즐 걷기",
  libraryTagline: "오늘은 어디로? 길로",
  libraryLead: "만든 게임을 고르거나, 네이버 지도 링크로 새 퍼즐을 만드세요.",
  create: "게임 만들기",
  play: "이 게임 걷기",
  resume: "이어서 걷기",
  reset: "처음부터",
  backLibrary: "목록으로",
};

export const safety = {
  title: "시작하기 전에",
  items: [
    "🛑 길을 완전히 멈춘 뒤에만 화면을 보세요.",
    "🚦 신호와 보행 규칙을 지키고, 공개된 보행 공간에만 머무르세요.",
    "🚫 골목, 차도, 주차장 입구, 사유지로 들어가지 마세요.",
    "🛍️ 구매나 직원과의 대화는 필요하지 않습니다. 가게 안은 기본 지점이 아닙니다.",
    "🎮 이것은 게임입니다. 실제 심부름이 아닙니다.",
    "📍 위치는 게임이 열려 있는 동안만 브라우저에서 쓰이며, 좌표는 저장하거나 전송하지 않습니다.",
    "🌧️ 날씨, 공사, 혼잡이 불안하면 즉시 종료하고 안전한 곳으로 이동하세요.",
  ],
  accept: "✅ 읽고 동의합니다. 계속하기",
};

export const gps = {
  findMe: "내 위치 찾기",
  locating: "위치를 찾는 중",
  good: "위치 수신 중 · 정확도 양호",
  lowAccuracy: "위치는 있으나 정확도가 낮습니다. 정확한 도착으로 보지 않습니다.",
  denied: "위치 권한이 거부되었습니다. 글 안내로 이동한 뒤 직접 도착을 확인하세요.",
  unavailable: "이 기기에서 위치를 쓸 수 없습니다. 글 안내로 진행하세요.",
  timeout: "위치 수신이 지연되었습니다. 잠시 후 다시 시도하거나 직접 도착을 확인하세요.",
  idle: "위치는 아직 요청하지 않았습니다.",
  approx: "직선 거리 · 대략값",
  arrive: "도착했어요",
  arriveLocked: "장소 가까이에서 정확도가 충분하면 도착이 열립니다.",
  manual: "GPS가 정확하지 않아요",
  manualConfirmTitle: "도착하였나요?",
  manualConfirmBody: "공개된 보행 공간에 멈춰 있을 때만 확인하세요. 차도·매장 안·사유지는 안 됩니다.",
  manualConfirm: "도착확인",
  retryLocation: "위치 다시 찾기",
  help: "길을 찾기 어려워요",
  exit: "게임 종료",
  directionsExternal: "외부 도보 안내 열기",
  prevPlace: "이전 장소",
  skipLocate: "위치 없이 계속",
  locatingHint: "지도에 지금 위치를 올리고 있습니다. 오래 걸리면 위치 없이 계속할 수 있습니다.",
};

export const trayCopy = {
  title: "모은 조각",
  open: "모은 조각",
  close: "닫기",
  empty: "아직 모은 조각이 없습니다.",
  count: (n, total) => `조각 ${n} / ${total}`,
};

export const pieceCopy = {
  collect: "조각 받기",
  hint: "조각을 올바른 칸에 놓으세요.",
  done: "그림이 완성되었습니다.",
};

export const assembleCopy = {
  title: "조각 맞추기",
  body: "조각을 칸에 놓으세요. 끌거나, 조각을 고른 뒤 칸을 탭해도 됩니다.",
  hint: "각 조각은 한 칸에만 들어갑니다.",
  continue: "완성 보기",
};

export const previewCopy = {
  title: "오늘 걷는 길",
  play: "경로 미리보기",
  startWalk: "걷기 시작",
  playing: "경로를 따라가는 중",
  closeTour: "게임으로",
  nextStop: "탭하면 다음 장소",
  openNaver: "네이버 지도",
};

export const createCopy = {
  title: "퍼즐 게임 만들기",
  name: "게임 제목",
  count: "장소 수 (조각 수)",
  url: "네이버 지도 URL",
  resolving: "장소를 읽는 중…",
  needCoords: "위치를 읽지 못했습니다. 지도에서 장소 공유 URL을 다시 붙여 넣으세요.",
  needServer: "장소 서버에 연결하지 못했습니다. 개발 서버(API)가 켜져 있는지 확인하세요.",
  jigsaw: "퍼즐 그림",
  jigsawFinal: "마지막 장소 사진",
  jigsawUpload: "사진 올리기",
  jigsawSystem: "시스템 그림",
  submit: "게임 만들기",
  save: "저장하기",
  editTitle: "퍼즐 게임 수정",
  edit: "수정",
  delete: "삭제",
  deleteTitle: "이 게임을 삭제할까요?",
  deleteBody: "목록에서 지워지며, 이 게임의 걷기 진행도 사라집니다.",
  deleteConfirm: "삭제하기",
  deleted: "삭제했습니다.",
  saved: "저장했습니다.",
  naverLink: "네이버에서 보기",
};

export const ending = {
  title: "완성",
  thanks: "걸어 주셔서 감사합니다.",
};

export const routeMeta = {
  mapFailed: "🗺️ 지도를 불러오지 못했습니다. 아래 글 안내로 이동하세요.",
  tilesFailed: "🗺️ 지도 타일을 표시하지 못했습니다. 글 안내와 외부 링크를 사용하세요.",
  helpBody: "🚶 공개된 보행로만 이용하세요. 확신이 없으면 큰 도로로 돌아가 게임을 종료해도 됩니다.",
  exitBody: "🚪 게임을 종료하면 이 게임의 진행만 지울 수 있습니다. 가까운 큰 도로로 안전하게 이동하세요.",
};

export const screens = [
  "library",
  "create",
  "safety",
  "preview",
  "navigating",
  "place",
  "assemble",
  "resolution",
];

export function osmDirectionsUrl(place) {
  const { lat, lng } = place;
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${lat}%2C${lng}`;
}

export function naverPlaceUrl(place) {
  return place.naverUrl || `https://map.naver.com/p?c=16,${place.lng},${place.lat},0,0,0,dh`;
}

export function naverMapAppUrl(place) {
  if (Number.isFinite(place?.lat) && Number.isFinite(place?.lng)) {
    const name = encodeURIComponent(place.name || "장소");
    return `nmap://place?lat=${place.lat}&lng=${place.lng}&name=${name}&appname=gilloe`;
  }
  return naverPlaceUrl(place);
}
