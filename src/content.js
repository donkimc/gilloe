export const game = {
  id: "cheonho-pieces",
  brand: "Gilloe",
  title: "천호에서 길로 마크 모으기",
  area: "서울 강동구 천호동",
  duration: "약 20–30분",
  difficulty: "쉬움",
  walking: "약 1.1km · OSM 보행 경로 추정치",
  players: "1–2명 · 휴대폰 1대",
  operatingNote: "낮 시간, 사람이 많은 보행로에서만 진행하세요.",
  prototypeBanner: "현장 검증 전 임시 경로",
  notPublicReady: "이 버전은 현장 검증 전 프로토타입입니다. 공개 플레이용이 아닙니다.",
  geoJsonUrl: "/route.geojson",
  locationOptions: {
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 12000,
  },
  accuracyCeilingMeters: 80,
  manualFallbackAfterMs: 8000,
  fieldVerified: false,
};

export const cover = {
  kicker: "🧩 천호에서 길로 마크 모으기",
  lead: "네 곳에 도착하면 조각이 생깁니다. 네 장을 모아 길로 마크를 맞추세요.",
  start: "🚶 걷기 시작",
  resume: "▶️ 이어서 걷기",
  reset: "🔄 처음부터 다시 시작",
};

export const modes = {
  title: "어떻게 걸까요?",
  solo: {
    id: "solo",
    label: "혼자 걷기",
    body: "네 장소에 들러 조각을 모은 뒤, 마지막에 마크를 맞춥니다.",
  },
  duo: {
    id: "duo",
    label: "둘이 걷기",
    body: "휴대폰 한 대로 함께 걷습니다. 네트워크는 필요 없습니다.",
  },
};

export const safety = {
  title: "시작하기 전에",
  items: [
    "🛑 길을 완전히 멈춘 뒤에만 화면을 보고 카메라를 사용하세요.",
    "🚦 신호와 보행 규칙을 지키고, 공개된 보행 공간에만 머무르세요.",
    "🚫 골목, 차도, 주차장 입구, 사유지, 매장 안으로 들어가지 마세요.",
    "🛍️ 구매, 직원과의 대화, 설치된 물건을 만지는 일은 필요하지 않습니다.",
    "🎮 이것은 게임입니다. 실제 가게에 심부름을 하거나 물건을 찾을 필요는 없습니다.",
    "📍 위치는 게임이 열려 있는 동안만 브라우저에서 쓰이며, 좌표 기록은 저장하거나 전송하지 않습니다.",
    "📷 카메라는 조각을 겹쳐 보여 주기만 하며, 사진·영상·소리를 찍거나 올리지 않습니다.",
    "🙅 낯선 사람, 집, 차량 번호, 사적 실내를 향해 카메라를 두지 마세요.",
    "🌧️ 날씨, 공사, 혼잡이 불안하면 즉시 게임을 종료하고 안전한 곳으로 이동하세요.",
  ],
  accept: "✅ 읽고 동의합니다. 계속하기",
};

export const briefing = {
  title: "오늘 할 일",
  fictionTag: "게임",
  mission: "천호 네 곳에 도착해 길로 마크 조각 네 장을 모으세요.",
  how: "도착하면 조각이 나옵니다. 네 장을 모으면 한 장으로 맞춥니다.",
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
  arriveLocked: "반경 안에 들어오고 정확도가 충분하면 도착이 열립니다.",
  manual: "GPS가 정확하지 않아요 — 직접 도착 확인",
  manualConfirmTitle: "안전한 공개 지점에 서 있나요?",
  manualConfirmBody:
    "아래 장소의 보행 공간에 멈춰 서 있을 때만 확인하세요. 차도·매장 안·사유지가 아닙니다.",
  manualConfirm: "여기서 멈춰 서 있습니다",
  retryLocation: "위치 다시 찾기",
  help: "길을 찾기 어려워요",
  exit: "게임 종료",
  directionsExternal: "외부 도보 안내 열기",
};

export const cameraCopy = {
  start: "카메라로 조각 찾기",
  skip: "카메라 없이 조각 보기",
  collect: "조각 받기",
  active: "카메라 사용 중 · 녹화하지 않습니다",
  starting: "카메라를 켜는 중",
  denied: "카메라 권한이 거부되었습니다. 같은 조각을 정적으로 봅니다.",
  unavailable: "카메라를 열 수 없습니다. 정적 조각으로 이어갑니다.",
  interrupted: "카메라가 중단되었습니다. 다시 시도하거나 정적 조각을 보세요.",
  stopped: "카메라를 종료했습니다.",
  standStill: "안전한 공개 장소에 선 뒤, 사람·집·차량이 아닌 공개된 방향을 비추세요. 휴대폰을 천천히 돌려 조각을 찾으세요.",
  beforeStartHint: "후면 카메라를 켠 뒤 주변을 비추세요. 움직임 권한을 허용하면 조각이 바깥 인도에 고정됩니다.",
  overlayHint: "조각은 레코드피자 바깥 인도 GPS에 고정됩니다. 화살표·거리를 따라 가게 밖에서 찾아 탭하세요. 매장에 들어가지 마세요.",
  fallbackHint: "카메라 대신 같은 조각을 정적으로 보여 줍니다. 조각을 탭하세요.",
};

export const trayCopy = {
  title: "모은 조각",
  open: "조각함",
  close: "조각함 닫기",
  empty: "아직 모은 조각이 없습니다.",
  count: (n) => `조각 ${n} / 4`,
};

export const pieceCopy = {
  title: (n) => `조각 ${n} / 4`,
  collect: "조각 받기",
  next: "다음 장소로",
  assemble: "마크 맞추기",
  hint: "조각을 올바른 칸에 놓으세요.",
  done: "마크가 완성되었습니다.",
};

export const assembleCopy = {
  title: "길로 마크 맞추기",
  body: "네 조각을 칸에 놓아 마크를 완성하세요. 끌거나, 조각을 고른 뒤 칸을 탭해도 됩니다.",
  hint: "각 조각은 한 칸에만 들어갑니다.",
  continue: "완성 보기",
};

export const feedbackCopy = {
  title: "짧은 소감",
  download: "💾 소감 JSON 저장",
  skip: "마치기",
  savedLocal: "🔒 소감은 이 기기에만 남거나, 아래에서 파일로 저장할 수 있습니다. 서버로 보내지 않습니다.",
  questions: [
    { id: "understand", label: "🧩 할 일은 이해하기 쉬웠나요?" },
    { id: "walk", label: "🚶 걷는 거리는 괜찮았나요?" },
    { id: "gps", label: "📍 GPS와 지도가 도움이 되었나요?" },
    { id: "camera", label: "📷 카메라 조각이 장소와 연결되는 느낌이 있었나요?" },
    { id: "another", label: "🔎 다른 Gilloe 게임을 해보고 싶나요?" },
    { id: "duo", label: "👥 둘이 했을 때, 두 사람 모두 참여했나요?", duoOnly: true },
  ],
  scale: [
    { value: "1", label: "1" },
    { value: "2", label: "2" },
    { value: "3", label: "3" },
    { value: "4", label: "4" },
    { value: "5", label: "5" },
  ],
};

export const ending = {
  title: "마크 완성",
  thanks: "천호의 네 조각을 모아 길로 마크를 맞췄습니다. 걸어 주셔서 감사합니다.",
};

export const routeMeta = {
  overviewTitle: "오늘 걷는 길",
  totalHint: "임시 OSM 보행 경로 · 약 14–18분",
  attribution: "© OpenStreetMap contributors",
  mapFailed: "🗺️ 지도를 불러오지 못했습니다. 아래 글 안내로 이동하세요.",
  tilesFailed: "🗺️ 지도 타일을 표시하지 못했습니다. 글 안내와 외부 링크를 사용하세요.",
  helpBody:
    "🚶 공개된 보행로만 이용하세요. 확신이 없으면 🚇 천호역 5번 출구 방면의 넓은 인도로 돌아가 게임을 종료해도 됩니다.",
  exitBody:
    "🚪 게임을 종료하면 진행 상태를 지울 수 있습니다. 가장 가까운 큰 도로와 🚇 천호역 방면으로 안전하게 이동하세요.",
};

/**
 * Provisional stop coordinates snapped onto OpenStreetMap walkable ways
 * so the map line can follow a foot route instead of straight segments.
 * fieldVerified remains false until a physical survey.
 */
export const stops = [
  {
    id: "stop-1",
    order: 1,
    pieceId: "piece-1",
    title: "임시 지점 1 · 🚇 천호역 5번 출구 인근",
    publicName: "🚇 천호역 5번 출구 인근 공개 보행 공간",
    coordinates: { lat: 37.53865, lng: 127.12385 },
    fieldVerified: false,
    arrivalRadiusMeters: 60,
    directions:
      "🚇 천호역 5번 출구 쪽 넓은 인도로 나와, 매장 안이 아닌 공개 보행 공간에 멈춰 서세요.",
    fallbackDirections:
      "🚦 출구 번호와 큰 도로가 보이는 인도에서 멈추세요. 차도로 내려가지 마세요.",
    safeStandingNote: "🚶 출구 앞을 막지 말고, 보행 흐름 옆의 빈 공간에 서세요.",
    scene: "여기서 첫 번째 조각을 받습니다.",
  },
  {
    id: "stop-2",
    order: 2,
    pieceId: "piece-2",
    title: "임시 지점 2 · 레코드피자 바깥 인도",
    publicName: "천호대로157길 45 앞 공개 보행 공간",
    // Outdoor sidewalk in front of Record Pizza (천호대로157길 45). Do not enter the shop.
    coordinates: { lat: 37.53891, lng: 127.12755 },
    fieldVerified: false,
    arrivalRadiusMeters: 55,
    directions:
      "🛍️ 천호대로157길을 따라 레코드피자 간판이 보이는 공개 인도에서 멈추세요. 가게 안으로 들어가지 마세요.",
    fallbackDirections: "🪧 RECORD PIZZA 간판이 보이는 인도에서 멈추고, 출입구를 막지 마세요.",
    safeStandingNote: "🚶 가게 바깥 인도·보행자 옆구리에 서세요. 매장 내부는 조사 지점이 아닙니다.",
    scene: "카메라로 두 번째 조각을 찾거나, 카메라 없이 바로 받으세요.",
    cameraClue: {
      enabled: true,
      framingInstruction:
        "📷 가게 밖 인도에서 카메라를 켜세요. 조각은 레코드피자 바깥 GPS 좌표에 고정됩니다. 매장에 들어가지 마세요.",
      publicAnchor: "📍 레코드피자 천호점 바깥 인도 · 천호대로157길 45 (37.53891, 127.12755)",
      geoAnchor: {
        lat: 37.53891,
        lng: 127.12755,
        label: "레코드피자 바깥 인도",
        address: "서울 강동구 천호대로157길 45",
        outdoorOnly: true,
      },
      overlay: {
        motif: "mark-tile-2",
        placement: { top: "26%", left: "16%" },
      },
      fallbackTitle: "🖼️ 정적 조각 · 카메라 없음",
      fallbackClue: "가게 밖 인도에서 받는 길로 마크 조각입니다. 실제 가게와 무관합니다.",
    },
  },
  {
    id: "stop-3",
    order: 3,
    pieceId: "piece-3",
    title: "임시 지점 3 · 문구·완구거리 인근",
    publicName: "구천면로 일대 공개 보행 공간",
    coordinates: { lat: 37.54078, lng: 127.12936 },
    fieldVerified: false,
    arrivalRadiusMeters: 60,
    directions: "✏️ 문구·완구거리로 알려진 공개 가로 구간까지 걸어, 인도 위 빈 공간에 서세요.",
    fallbackDirections: "🚶 상점 앞을 가로막지 말고, 큰 가로가 보이는 인도에서 멈추세요.",
    safeStandingNote: "🚪 매장 출입문에서 한 걸음 떨어진 공개 보도에 서세요.",
    scene: "여기서 세 번째 조각을 받습니다.",
  },
  {
    id: "stop-4",
    order: 4,
    pieceId: "piece-4",
    title: "임시 지점 4 · 냉면거리 인근",
    publicName: "천중로 18길 일대 공개 보행 공간",
    coordinates: { lat: 37.54239, lng: 127.12949 },
    fieldVerified: false,
    arrivalRadiusMeters: 60,
    directions: "🍜 냉면거리로 알려진 공개 가로 구간까지 걸어, 식사할 곳이 보여도 게임에 필요한 구매는 없습니다.",
    fallbackDirections: "🚶 큰 가로와 역 방향이 보이는 인도에서 멈추세요. 골목 안쪽으로 들어가지 마세요.",
    safeStandingNote: "🍽️ 식사의 유무와 무관하게, 공개 보행 공간에서 마지막 조각을 받으세요.",
    scene: "여기서 마지막 조각을 받습니다. 네 장을 모아 마크를 맞춥니다.",
  },
];

export const screens = [
  "cover",
  "mode",
  "safety",
  "briefing",
  "route-overview",
  "navigating-stop-1",
  "piece-stop-1",
  "navigating-stop-2",
  "camera-stop-2",
  "piece-stop-2",
  "navigating-stop-3",
  "piece-stop-3",
  "navigating-stop-4",
  "piece-stop-4",
  "assemble",
  "resolution",
  "feedback",
];

export function stopByOrder(order) {
  return stops.find((stop) => stop.order === order);
}

export function stopById(id) {
  return stops.find((stop) => stop.id === id);
}

export function osmDirectionsUrl(stop) {
  const { lat, lng } = stop.coordinates;
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${lat}%2C${lng}`;
}
