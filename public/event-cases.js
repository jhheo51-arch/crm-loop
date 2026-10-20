import {researchCases} from './crm-cases.js';

/* 이전 상세 배열은 공개 후기 기반 공통 자료로 교체했습니다.
   위험과 보완은 실패 사실이 아니라 다음 운영에서 검증할 가설입니다. */
export const legacyEventCases=[
  {
    "id": "gm",
    "brand": "젠틀몬스터",
    "name": "JENTLE SALON (2024)",
    "level": "기업 공식 발표 확인",
    "url": "https://prtimes.jp/main/html/rd/p/000000014.000137182.html",
    "fact": "IICOMBINED JAPAN은 13개 도시 팝업과 아이웨어, 참 체험, 유니콘 오브제를 활용한 공간을 발표했습니다.",
    "unknown": "VIP 명단, 실제 대기시간과 체험 이탈률은 해당 발표로 확인되지 않습니다.",
    "risk": "촬영과 제품 체험 수요가 겹칠 가능성",
    "action": "촬영, 피팅 안내 역할과 대기 동선을 리허설로 확인",
    "metric": "체험 시작자 대기시간, 현장 미종료 고객 수",
    "phase": "준비"
  },
  {
    "id": "tamburins",
    "brand": "탬버린즈",
    "name": "카디퓨저 성수 팝업 (2024)",
    "level": "공식 검색 본문 확인, 직접 열기 오류",
    "url": "https://www.tamburins.com/kr/exhibition/car-diffuser/",
    "fact": "공식 페이지 검색 본문에 2024.5.24~6.9 성수 팝업, DIY 공간, 사전 예약자 선착순 증정과 동반 1인, 재고 소진 조건이 안내됩니다.",
    "unknown": "실제 품절, 혼잡 발생 여부나 고객 불만은 확인되지 않습니다.",
    "risk": "동반 인원 또는 혜택 조건을 다르게 안내할 가능성",
    "action": "동반 포함 참석 정원과 증정품 재고, 대체 안내 기준 확인",
    "metric": "시간대 정원 초과, 혜택 관련 미처리 요청 수",
    "phase": "초청"
  },
  {
    "id": "nudake",
    "brand": "누데이크",
    "name": "HAT SHOP (2018)",
    "level": "공식 프로젝트 소개 확인",
    "url": "https://nudake.com/kr/project/hat-shop/",
    "fact": "2018년 팝업 전시에서 비밀 출입구 뒤 갤러리와 모자 형태의 케이크, 음료를 선보였다고 소개합니다.",
    "unknown": "당시 방문객의 길 찾기 어려움, 식품 안내 누락 여부는 확인되지 않습니다.",
    "risk": "숨겨진 입구의 연출과 명확한 방문 안내를 함께 충족할 필요",
    "action": "초청 안내에 도착 위치, 접수 담당을 명시하고 시식 안내 확인",
    "metric": "미방문 확인 건, 길 안내, 시식 관련 미처리 요청 수",
    "phase": "준비"
  },
  {
    "id": "atiissu",
    "brand": "어티슈",
    "name": "DESERT COWBOY (조사 후보)",
    "level": "공식 본문 확인 보류",
    "url": "https://www.atiissu.com/kr/ko/explore/desert-cowboy-collection",
    "fact": "외부 행사 소개에서 공식 컬렉션 주소를 찾았으나 이번 조회에서 공식 본문은 열리지 않았습니다. 행사 일정, 운영 방식은 확정하지 않습니다.",
    "unknown": "공식 행사 기간, 장소, 예약 조건 재확인 필요",
    "risk": "아직 사례 분석 근거가 충분하지 않음",
    "action": "공식 행사 공지에서 기간, 장소, 입장 조건을 확인",
    "metric": "공식 출처 확인 완료 여부",
    "phase": "기획"
  },
  {
    "id": "nuflaat",
    "brand": "누플랏",
    "name": "하우스 노웨어 서울 입점 (참고 자료)",
    "level": "언론 보도 확인, 팝업으로 분류하지 않음",
    "url": "https://m.dhnews.co.kr/news/view/1065599335129161",
    "fact": "2025.9.6 보도는 하우스 노웨어 서울 3층의 첫 오프라인 스토어 오픈을 소개합니다. 기간 한정 팝업 이력으로 취급하지 않습니다.",
    "unknown": "독립 팝업, 초청 행사 이력과 실제 운영 결과는 확인하지 못했습니다.",
    "risk": "론칭 행사 기획 시 전시, 제품 설명, 구매 안내 간 인계가 필요한지 검토",
    "action": "론칭 행사 적용 전 공식 근거와 제품 취급, 인계 절차 확인",
    "metric": "담당 미정 업무와 인계 미완료 수",
    "phase": "준비"
  }
];

export const eventCases=researchCases.map(c=>({
 id:c.id,brand:c.brand,name:c.event,level:c.scope+(c.id==='nuflaat'?', 팝업으로 분류하지 않음':''),url:c.sources[0].url,
 fact:c.observations.join(' '),
 unknown:c.scope.includes('미확보')?'독립 방문 후기가 없어 실제 고객 불편은 판단하지 않습니다.':'개인 후기는 제한된 표본이며 전체 고객의 평균 경험을 뜻하지 않습니다.',
 risk:c.interpretation,action:c.action,metric:c.metric,phase:c.phase
}));
