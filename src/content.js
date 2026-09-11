export const game = {
  id: "cheonho-1942",
  brand: "Gilloe",
  title: "천호 19:42 — 마지막 봉투",
  area: "서울 강동구 천호동",
  duration: "약 25–35분",
  difficulty: "쉬움",
  walking: "약 600–900m · 임시 추정치",
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
  kicker: "가상의 살인사건",
  lead: "천호의 네 장소를 따라가며 가상의 살인사건을 해결하세요.",
  start: "수사 시작",
  resume: "이어서 수사하기",
  reset: "처음부터 다시 시작",
};

export const modes = {
  title: "어떻게 수사할까요?",
  solo: {
    id: "solo",
    label: "혼자 수사하기",
    body: "모든 진술과 단서를 혼자 확인하고, 네 장소의 퍼즐을 풀어 사건을 재구성합니다.",
  },
  duo: {
    id: "duo",
    label: "둘이 수사하기",
    body: "휴대폰 한 대를 번갈아 봅니다. 한 명은 진술을 읽고, 다른 한 명은 시각 단서를 본 뒤 함께 이야기합니다. 네트워크는 필요 없습니다.",
  },
};

export const safety = {
  title: "시작하기 전에",
  items: [
    "길을 완전히 멈춘 뒤에만 단서를 읽고 카메라를 사용하세요.",
    "신호와 보행 규칙을 지키고, 공개된 보행 공간에만 머무르세요.",
    "골목, 차도, 주차장 입구, 사유지, 매장 안으로 들어가지 마세요.",
    "구매, 직원과의 대화, 설치된 물건을 만지는 일은 필요하지 않습니다.",
    "등장하는 사람, 모임, 금액, 범행은 모두 가상의 설정입니다. 실제 가게·건물·사람과 사건을 연결하지 마세요.",
    "위치는 게임이 열려 있는 동안만 브라우저에서 쓰이며, 좌표 기록은 저장하거나 전송하지 않습니다.",
    "카메라는 단서를 겹쳐 보여 주기만 하며, 사진·영상·소리를 찍거나 올리지 않습니다.",
    "낯선 사람, 집, 차량 번호, 사적 실내를 향해 카메라를 두지 마세요.",
    "날씨, 공사, 혼잡이 불안하면 즉시 게임을 종료하고 안전한 곳으로 이동하세요.",
  ],
  accept: "읽고 동의합니다. 계속하기",
};

export const briefing = {
  title: "사건 개요",
  fictionTag: "허구",
  victim:
    "밤 8시 5분, 가상의 퍼즐 기획자 한성준이 천호 인근의 가상 작업실에서 숨진 채 발견됩니다. 묘사는 생략합니다. 여러분은 7시 31분부터 7시 45분 사이를 재구성해야 합니다.",
  money:
    "성준은 가상 동네 퍼즐 행사의 일부가 빠져 나간 사실을 알고, 증거 자료를 파란 봉투에 담아 두었습니다. 그날 저녁 세 사람과 시간을 정해 두었습니다.",
  mission: "범인, 동기, 그리고 알리바이를 깨는 결정적 단서를 찾으세요.",
  window: "핵심 시간: 19:31–19:45",
};

export const suspects = [
  {
    id: "kang-min-jae",
    name: "강민재",
    role: "사업 파트너",
    claim: "7시 20분에 나와 7시 30분 전에 천호역으로 들어갔다.",
    cue: "남색 우산",
  },
  {
    id: "seo-yu-na",
    name: "서유나",
    role: "행사 일러스트레이터",
    claim: "7시 31분에 파란 봉투를 전하고 바로 떠났다.",
    cue: "노란 우산",
  },
  {
    id: "lee-do-yun",
    name: "이도윤",
    role: "택배 기사 · 오랜 친구",
    claim: "7시 45분에 도착했으나 작업실 문은 이미 잠겨 있었다.",
    cue: "빨간 모자",
  },
];

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
  start: "카메라 단서 찾기",
  skip: "카메라 없이 단서 보기",
  collect: "단서 수집",
  active: "카메라 사용 중 · 녹화하지 않습니다",
  starting: "카메라를 켜는 중",
  denied: "카메라 권한이 거부되었습니다. 같은 내용의 정적 단서를 봅니다.",
  unavailable: "카메라를 열 수 없습니다. 정적 단서로 이어갑니다.",
  interrupted: "카메라가 중단되었습니다. 다시 시도하거나 정적 단서를 보세요.",
  stopped: "카메라를 종료했습니다.",
  standStill: "완전히 멈춘 뒤, 사람·집·차량이 아닌 공개된 시각 기준만 담으세요.",
};

export const duoCopy = {
  witness: "증인",
  evidence: "증거",
  holdPhone: "휴대폰을 들고 있을 사람",
  pass: "휴대폰을 건네주세요",
  passed: "받았습니다",
  holdToReveal: "길게 눌러 증거 카드 보기",
  continueAlone: "혼자 이어서 보기",
  discussed: "함께 이야기했어요",
  discussPrompt: "방금 본 진술과 증거를 짧게 이야기한 뒤에 퍼즐을 푸세요.",
};

export const notebookCopy = {
  title: "수첩",
  open: "수첩",
  close: "수첩 닫기",
  empty: "아직 수집한 단서가 없습니다.",
  question: "아직 남은 질문: 범인, 동기, 알리바이를 깨는 증거는?",
};

export const feedbackCopy = {
  title: "짧은 소감",
  download: "소감 JSON 저장",
  skip: "저장하지 않고 마치기",
  savedLocal: "소감은 이 기기에만 남거나, 아래에서 파일로 저장할 수 있습니다. 서버로 보내지 않습니다.",
  questions: [
    { id: "understand", label: "사건은 이해하기 쉬웠나요?" },
    { id: "walk", label: "걷는 거리는 괜찮았나요?" },
    { id: "gps", label: "GPS와 지도가 도움이 되었나요?" },
    { id: "camera", label: "카메라 단서가 장소와 연결되는 느낌이 있었나요?" },
    { id: "another", label: "다른 Gilloe 게임을 해보고 싶나요?" },
    { id: "duo", label: "둘이 했을 때, 두 사람 모두 참여했나요?", duoOnly: true },
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
  title: "재구성",
  panels: [
    "서유나는 19:31 약속대로 파란 봉투를 전하고 19:32경 자리를 뜹니다.",
    "강민재는 역으로 갔다고 했지만, 19:38 반영에는 그의 남색 우산이 작업실 쪽에 남아 있습니다.",
    "이도윤은 19:45 기록대로 도착했을 때 이미 문이 잠겨 있었습니다.",
    "성준은 빠진 행사 자금을 민재에게 물었고, 민재는 그 사실을 덮기 위해 범행했습니다. 묘사는 여기까지입니다.",
  ],
};

export const routeMeta = {
  overviewTitle: "오늘 걷는 길",
  totalHint: "임시 추정치 · 약 10–14분 도보",
  attribution: "© OpenStreetMap contributors",
  mapFailed: "지도를 불러오지 못했습니다. 아래 글 안내로 이동하세요.",
  tilesFailed: "지도 타일을 표시하지 못했습니다. 글 안내와 외부 링크를 사용하세요.",
  helpBody:
    "공개된 보행로만 이용하세요. 확신이 없으면 천호역 5번 출구 방면의 넓은 인도로 돌아가 게임을 종료해도 됩니다.",
  exitBody:
    "게임을 종료하면 진행 상태를 지울 수 있습니다. 가장 가까운 큰 도로와 천호역 방면으로 안전하게 이동하세요.",
};

/**
 * Provisional stop coordinates for a testable map only.
 * fieldVerified is false. These are not a field survey.
 * Replace after walking Cheonho Station Exit 5 → Rodeo → stationery/toy street → naengmyeon street.
 */
export const stops = [
  {
    id: "stop-1",
    order: 1,
    title: "임시 지점 1 · 천호역 5번 출구 인근",
    publicName: "천호역 5번 출구 인근 공개 보행 공간",
    coordinates: { lat: 37.53865, lng: 127.12385 },
    fieldVerified: false,
    arrivalRadiusMeters: 60,
    directions:
      "천호역 5번 출구 쪽 넓은 인도로 나와, 매장 안이 아닌 공개 보행 공간에 멈춰 서세요.",
    fallbackDirections:
      "출구 번호와 큰 도로가 보이는 인도에서 멈추세요. 차도로 내려가지 마세요.",
    safeStandingNote: "출구 앞을 막지 말고, 보행 흐름 옆의 빈 공간에 서세요.",
    scene: "성준의 수첩에 당일 약속 쪽지가 접혀 있습니다. 이니셜만 남아 있습니다.",
    witnessCard:
      "수첩 메모: 19:31 Y · 파란 봉투 / 19:38 M · 마지막 이야기 / 19:45 D · 전달.",
    evidenceCard: "세 용의자의 이름과 이니셜을 맞춰 보세요. Y, M, D.",
    notebookEntry: "약속 쪽지: 민재(M)는 19:38 면담이 적혀 있다. 본인 진술(7:20 출발)과 어긋난다.",
    puzzle: {
      type: "match",
      prompt: "쪽지의 이니셜을 용의자와 연결하세요.",
      hint: "이니셜을 용의자 이름과 비교하세요.",
      slots: [
        { id: "Y", label: "19:31 Y · 파란 봉투" },
        { id: "M", label: "19:38 M · 마지막 이야기" },
        { id: "D", label: "19:45 D · 전달" },
      ],
      options: [
        { id: "seo-yu-na", label: "서유나" },
        { id: "kang-min-jae", label: "강민재" },
        { id: "lee-do-yun", label: "이도윤" },
      ],
      solution: {
        Y: "seo-yu-na",
        M: "kang-min-jae",
        D: "lee-do-yun",
      },
      success: "민재는 7시 20분에 떠났다고 했지만, 쪽지에는 19:38 면담이 있습니다.",
      wrong: "이니셜과 이름이 아직 맞지 않습니다. 세 장을 다시 보세요.",
    },
  },
  {
    id: "stop-2",
    order: 2,
    title: "임시 지점 2 · 천호 로데오거리 인근",
    publicName: "천호대로 157길 일대 공개 보행 공간",
    coordinates: { lat: 37.53985, lng: 127.12715 },
    fieldVerified: false,
    arrivalRadiusMeters: 60,
    directions:
      "로데오거리로 안내된 공개 인도를 따라가 넓은 보행 공간에서 멈추세요. 가게 안으로 들어가지 마세요.",
    fallbackDirections: "간판이 밀집한 거리의 인도에서 멈추고, 출입구를 막지 마세요.",
    safeStandingNote: "보행자 옆구리, 턱이 낮은 공개 공간에 서세요.",
    scene: "가상 작업실 유리에 남았다는 반영 기록을 확인합니다. 실제 가게와 무관합니다.",
    witnessCard: "민재는 이미 역에 있었다고 합니다. 유나는 노란 우산, 민재는 남색 우산입니다.",
    evidenceCard: "가상 증거 사진에서 작업실 쪽 반영에 남은 물건을 고르세요.",
    notebookEntry: "19:38 반영: 남색 우산. 민재의 역 알리바이와 충돌한다.",
    cameraClue: {
      enabled: true,
      framingInstruction:
        "현장 검증 전 임시 안내: 사람·출입구가 아닌, 공개된 가로등이나 안내판이 보이는 방향을 프레임에 두세요.",
      publicAnchor: "공개 가로등·안내판 (좌표·방향은 현장 검증 후 교체)",
      overlay: {
        timestamp: "19:38",
        motif: "navy-umbrella",
        placement: { top: "26%", left: "16%" },
      },
      fallbackTitle: "정적 단서 · 카메라 없음",
      fallbackClue: "가상 유리 반영. 시각 19:38. 남색 우산이 작업실 쪽에 비칩니다. 실제 장소의 사진이 아닙니다.",
    },
    puzzle: {
      type: "hotspot",
      prompt: "가상 증거 이미지에서 알리바이를 흔드는 물건을 고르세요.",
      hint: "이미 떠났다고 말한 사람의 물건은 무엇인가요?",
      choices: [
        { id: "yellow-umbrella", label: "노란 우산", wrong: "유나의 우산입니다. 민재의 알리바이와는 다릅니다." },
        { id: "navy-umbrella", label: "남색 우산", wrong: "" },
        { id: "red-cap", label: "빨간 모자", wrong: "도윤의 모자입니다. 도착은 더 늦습니다." },
      ],
      solution: "navy-umbrella",
      success: "19:38 반영의 남색 우산은, 민재가 그때 역에 있었다는 말과 맞지 않습니다.",
    },
  },
  {
    id: "stop-3",
    order: 3,
    title: "임시 지점 3 · 문구·완구거리 인근",
    publicName: "천호동 456-16 일대 공개 보행 공간",
    coordinates: { lat: 37.54105, lng: 127.12855 },
    fieldVerified: false,
    arrivalRadiusMeters: 60,
    directions: "문구·완구거리로 알려진 공개 가로 구간까지 걸어, 인도 위 빈 공간에 서세요.",
    fallbackDirections: "상점 앞을 가로막지 말고, 큰 가로가 보이는 인도에서 멈추세요.",
    safeStandingNote: "매장 출입문에서 한 걸음 떨어진 공개 보도에 서세요.",
    scene: "세 사람의 이동을 시간순으로 붙입니다. 실제 가게 영업과 무관합니다.",
    witnessCard: "유나 19:32 이탈, 민재 19:38 반영, 도윤 19:45 도착 기록이 있습니다.",
    evidenceCard: "가장 이른 시각부터 세 장을 배열하세요.",
    notebookEntry: "시간순: 유나 19:32 → 민재 19:38 → 도윤 19:45.",
    puzzle: {
      type: "order",
      prompt: "세 사건을 시간 순서대로 놓으세요.",
      hint: "인쇄된 시각이 가장 이른 것부터 시작하세요.",
      items: [
        { id: "do-yun-745", label: "이도윤, 19:45 도착 · 문은 잠겨 있음" },
        { id: "yu-na-732", label: "서유나, 봉투를 전하고 19:32에 떠남" },
        { id: "min-jae-738", label: "강민재, 19:38 반영에 남색 우산" },
      ],
      solution: ["yu-na-732", "min-jae-738", "do-yun-745"],
      success: "결정적 공백은 유나가 떠난 뒤, 도윤이 오기 전인 19:38입니다.",
      wrong: "아직 시각 순서가 아닙니다. 각 카드의 시각을 다시 보세요.",
    },
  },
  {
    id: "stop-4",
    order: 4,
    title: "임시 지점 4 · 냉면거리 인근",
    publicName: "구천면로 29길 일대 공개 보행 공간",
    coordinates: { lat: 37.5424, lng: 127.12955 },
    fieldVerified: false,
    arrivalRadiusMeters: 60,
    directions: "냉면거리로 알려진 공개 가로 구간까지 걸어, 식사할 곳이 보여도 게임에 필요한 구매는 없습니다.",
    fallbackDirections: "큰 가로와 역 방향이 보이는 인도에서 멈추세요. 골목 안쪽으로 들어가지 마세요.",
    safeStandingNote: "식사의 유무와 무관하게, 공개 보행 공간에서 마지막 질문을 푸세요.",
    scene: "파란 봉투 안의 가상 장부 조각이 빠진 행사 자금과 민재를 잇습니다.",
    witnessCard: "장부 메모: 행사 잔액 부족 · 처리 담당 강민재. 실제 거래가 아닙니다.",
    evidenceCard: "범인, 동기, 알리바이를 깨는 증거를 고르세요.",
    notebookEntry: "가상 장부: 빠진 자금의 처리 담당이 민재로 적혀 있다.",
    puzzle: {
      type: "accusation",
      prompt: "세 가지를 고르세요. 틀린 항목만 다시 고치면 됩니다.",
    },
  },
];

export const accusation = {
  title: "마지막 판단",
  submit: "판단 제출",
  retry: "수첩을 보고 다시 고르기",
  fields: [
    {
      id: "murderer",
      label: "누가 성준을 죽였습니까?",
      options: [
        { id: "kang-min-jae", label: "강민재" },
        { id: "seo-yu-na", label: "서유나" },
        { id: "lee-do-yun", label: "이도윤" },
      ],
      notebookHint: "약속 쪽지와 19:38 반영을 다시 보세요.",
    },
    {
      id: "motive",
      label: "이유는 무엇입니까?",
      options: [
        { id: "conceal-missing-funds", label: "빠진 행사 자금을 덮기 위해" },
        { id: "stolen-art", label: "그림 시안을 가로채기 위해" },
        { id: "delivery-grudge", label: "오래된 택배 다툼 때문에" },
      ],
      notebookHint: "파란 봉투의 가상 장부를 보세요.",
    },
    {
      id: "evidence",
      label: "어떤 증거가 알리바이를 깨나요?",
      options: [
        { id: "photo-738-and-appointment", label: "19:38 반영과 19:38 약속" },
        { id: "locked-door-only", label: "잠긴 문만으로 충분하다" },
        { id: "yellow-umbrella", label: "노란 우산이 범인을 가리킨다" },
      ],
      notebookHint: "민재의 역 진술과 19:38을 겹쳐 보세요.",
    },
  ],
  solution: {
    murderer: "kang-min-jae",
    motive: "conceal-missing-funds",
    evidence: "photo-738-and-appointment",
  },
  success: "세 답이 맞습니다. 사건은 시간 기록으로 닫힙니다.",
};

export const screens = [
  "cover",
  "mode",
  "safety",
  "briefing",
  "route-overview",
  "navigating-stop-1",
  "clue-stop-1",
  "puzzle-stop-1",
  "navigating-stop-2",
  "camera-stop-2",
  "clue-stop-2",
  "puzzle-stop-2",
  "navigating-stop-3",
  "clue-stop-3",
  "puzzle-stop-3",
  "navigating-stop-4",
  "clue-stop-4",
  "accusation",
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

export function duoRoles(stopOrder) {
  const witnessIsA = stopOrder % 2 === 1;
  return {
    witness: witnessIsA ? "A" : "B",
    evidence: witnessIsA ? "B" : "A",
  };
}
