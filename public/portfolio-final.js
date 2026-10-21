import {measurement} from './measurement-data.js';

const mens=measurement.arms.mens,womens=measurement.arms.womens;
const pp=x=>(x>0?'+':'')+(x*100).toFixed(2)+'%p';

// 고객 가치 분석 수치는 analysis/results/online_retail.json의 rfm_validation에서 옮겼고, 테스트가 파일과 대조합니다.
export const customerValue={atRiskRepurchase:63.2,dormantRepurchase:29.8,customers:5812};

export const loop={
 title:'CRM LOOP',
 lead:'CRM 마케팅 기획 포트폴리오',
 oneLine:'누구에게, 무엇을, 언제 보낼지 정하고, 그 판단이 맞았는지 확인합니다. 캠페인 기획서 세 편과 기획에 쓴 근거 분석으로 구성했습니다.',
 principle:'열람은 반응으로 세지 않고, 비교군이 없으면 효과라고 부르지 않습니다. 세 기획서가 같은 KPI 정의서를 씁니다.',
 cases:[
  {key:'R',group:'plan',label:'기획서 1',stage:'다시 사게 하기',title:'이탈 위험 고객 재방문 캠페인',data:'실제 거래 기록에서 고른 666명',finding:'사다가 멈춘 고객 666명에게 쿠폰 없이 메일 세 단계를 보내고, 보내지 않는 고객을 30% 남기고 6회차를 합쳐 메일 덕분에 늘어난 재구매만 확인합니다.',decision:`다음 해에 다시 산 비율이 휴면 고객의 두 배가 넘어(${customerValue.atRiskRepurchase}%, ${customerValue.dormantRepurchase}%) 이 고객에게 먼저 보냅니다.`,kind:'기획서',doc:'docs/CAMPAIGN-BRIEF.md'},
  {key:'B',group:'plan',label:'기획서 2',stage:'관계 깊게 하기',title:'VIP 프리뷰에서 재방문까지',data:'가상 초청 240명',finding:'누구를 왜 초대할지, 현장에서 무엇을 경험하게 할지, 행사 뒤 어떤 메시지로 다시 오게 할지 정했습니다.',decision:'마케팅 동의는 행사 참여와 따로 묻고, 동의한 고객에게만 고른 향을 담은 후속 메시지를 보냅니다.',kind:'기획서, 가상 데이터',target:'portfolio-proposal'},
  {key:'C',group:'plan',label:'기획서 3',stage:'비수기에 오게 하기',title:'비수기 숙박 캠페인',data:'가상 예시',finding:'봄, 가을 주중 1박을 지점별 계절 체험과 멤버십 재방문 혜택으로 엮었습니다.',decision:'할인 대신 고객이 고른 동행, 목적, 활동에 맞춘 제안을 보내고, 할인 제안과 함께 비교합니다.',kind:'기획서, 가상 예시',route:'seasonal'},
  {key:'A',group:'basis',label:'사례 A',stage:'받을 고객 고르기',title:'이메일 실험으로 본 발송 대상',data:`공개 실험 데이터 ${measurement.meta.rows.toLocaleString('en-US')}명`,finding:`남성용 메일은 방문률을 ${pp(mens.ate.visit.diff)} 올렸고 효과가 고객 전체에 고르게 퍼져 있었습니다. 여성용 메일은 반응할 고객 상위 30%에게만 보내도 메일 덕분에 늘어난 방문의 ${Math.round(womens.uplift.share_of_incremental_visits_top30*100)}%를 얻었습니다.`,decision:'남성용 메일은 고객을 고르지 않고 전원에게 보내고, 여성용 메일은 받을 고객을 고릅니다.',kind:'공개 실제 데이터',route:'measure'},
  {key:'V',group:'basis',label:'고객 가치 분석',stage:'언제 연락할지 정하기',title:'거래 기록으로 본 이탈 시점',data:`실제 거래 기록 ${customerValue.customers.toLocaleString('en-US')}명`,finding:`이탈 위험 고객은 다음 해에 ${customerValue.atRiskRepurchase}%가 다시 샀고, 휴면 고객은 ${customerValue.dormantRepurchase}%였습니다.`,decision:'재방문 캠페인의 대상을 휴면 고객이 아니라 이탈 위험 고객으로 정했습니다.',kind:'공개 실제 데이터',doc:'docs/CUSTOMER-VALUE.md'}
 ]
};

export const finalPlan={
 title:'VIP 프리뷰에서 재방문까지',
 subtitle:'향 브랜드 신제품 프리뷰를 가정한 VIP 행사 기획안',
 status:'개인 포트폴리오, 공개 자료 조사와 가상 데이터 사용',
 nameMeaning:'CRM은 동의한 고객의 선택과 반응 기록을, LOOP는 그 기록이 초청, 참석, 상담, 재방문으로 다시 이어지는 순환을 뜻합니다. 연락은 마케팅 수신에 동의한 고객에게만 보낸다는 조건을 두었습니다.',
 nameNotice:'CRM LOOP는 제가 붙인 프로젝트 이름입니다. 공개 자료를 참고한 브랜드가 실제로 사용한 행사명은 아닙니다.',
 oneLine:'누구를 왜 초대하고, 현장에서 무엇을 경험하게 하고, 행사 뒤 어떤 메시지로 다시 오게 할지 정한 기획안입니다.',
 period:'가상 일정, T-8주부터 행사 후 30일까지',
 location:'서울 성수, 실제 공간 계약 전 가정',
 objective:'신제품 프리뷰에 초대한 고객이 행사 뒤 30일 안에 상담, 예약, 구매로 다시 찾아오게 합니다.',
 message:'차 안의 기억을 향으로 설계하고, 현장의 발견을 다음 경험으로 이어갑니다.',
 experience:[
  {moment:'도착과 대기',design:'시간대별로 입장을 나누고 예상 대기 시간을 미리 알립니다. 오래 기다린 고객은 담당자가 먼저 맞이합니다.',reason:'공개 방문 후기에서 긴 대기에 관한 문장을 확인했습니다.'},
  {moment:'향 비교',design:'차 안의 장면별로 향을 비교하게 하고, 고객이 고른 향을 기록합니다.',reason:'후속 메시지를 제품 기능이 아니라 고객이 고른 향으로 보내기 위해서입니다.'},
  {moment:'향 만들기 체험(DIY)',design:'마감되면 대체 샘플과 우선 재예약 중 고객이 고르게 합니다.',reason:'공개 후기에서 체험 마감과 품절 사례를 확인했습니다.'},
  {moment:'퇴장 전 동의',design:'행사 참여와 마케팅 수신 동의를 따로 묻습니다. 거절해도 체험과 기프트는 그대로 드립니다.',reason:'동의한 고객에게만 후속 메시지를 보내고, 거절이 행사 경험을 해치지 않게 합니다.'}
 ],
 followups:[
  {who:'구매한 고객',message:'고른 향의 사용 팁과 리필 시점 안내',when:'D+1',goal:'리필 구매'},
  {who:'상담을 요청한 고객',message:'매장 또는 화상 상담 예약 안내',when:'D+1~2',goal:'상담 완료'},
  {who:'체험이 끊긴 고객',message:'대체 샘플 수령 또는 재예약 안내',when:'D+2~3',goal:'체험 회복'},
  {who:'관심만 보인 고객',message:'고른 향과 사용 장면을 담은 구매 안내, 최대 2회',when:'D+1~7',goal:'구매 또는 예약'},
  {who:'동의하지 않은 고객',message:'후속 메시지를 보내지 않습니다',when:'없음',goal:'잘못된 발송 0건'}
 ],
 decisionMap:[
  {stage:'선정',question:'왜 이 고객을 초대해야 하는가?',data:'customer_id, segment_code, selection_reason, suppression_status',action:'초청 적격이면 개인화 초청, 제외 조건이면 발송 중지',owner:'CRM Manager',sla:'T-6주'},
  {stage:'RSVP',question:'방문 가능한 시간과 필요한 지원은 무엇인가?',data:'rsvp_status, slot_id, party_size, language, accessibility_request',action:'확정, 대기, 거절로 분기하고 시간 및 접근 안내',owner:'Guest Manager',sla:'응답 즉시'},
  {stage:'체크인',question:'실제로 도착했고 얼마나 기다렸는가?',data:'checkin_at, queue_enter_at, experience_start_at, no_show_reason',action:'혼잡 시 도착 분산, 장기 대기 고객은 담당자 호출',owner:'Front Desk',sla:'현장 5분'},
  {stage:'체험',question:'어떤 향을 선호했고 어디에서 경험이 끊겼는가?',data:'scent_preference, diy_status, issue_reason, consult_request',action:'선호 향별 안내, 향 만들기 체험(DIY)이 마감된 고객은 샘플 또는 재예약 선택',owner:'Experience Lead',sla:'퇴장 전'},
  {stage:'동의',question:'어떤 목적과 채널로 연락받기를 원하는가?',data:'consent_status, consent_purpose, channel, consent_at, policy_version',action:'동의 고객만 CRM 등록, 거절과 미확인은 후속 발송 제외',owner:'CRM & Privacy',sla:'퇴장 전'},
  {stage:'후속',question:'다음 결정을 위해 어떤 정보가 필요한가?',data:'message_variant, sent_at, click_at, reply_type, handoff_status',action:'사용 팁, 상담, 예약, 재입고 중 하나로 분기하고 담당자 인계',owner:'Lifecycle CRM',sla:'D+1~7일'},
  {stage:'관계',question:'30일 안에 어떤 관계 행동이 일어났는가?',data:'outcome_type, outcome_at, order_value, revisit_at, opt_out_at',action:'구매, 예약, 상담은 유지 프로그램, 무반응은 빈도 축소',owner:'Client Care',sla:'D+30'}
 ],
 segments:[
  {code:'VIP_REPEAT',name:'기존 우수, 재구매 고객',invited:70,reason:'기존 향 구매와 재구매 관계를 바탕으로 신제품 적합성을 확인',offer:'선호 향 기반 프리뷰와 리필 케어',next:'구매 여부에 따라 사용 팁, 리필 시점 안내'},
  {code:'HIGH_INTENT',name:'고관여 잠재 고객',invited:80,reason:'카디퓨저, 자동차 라이프스타일 콘텐츠에 반응한 고객 가정',offer:'향 비교와 차량 환경별 상담',next:'상담 요청, 예약, 미구매 이유별 후속'},
  {code:'CREATOR',name:'콘텐츠 크리에이터',invited:30,reason:'브랜드 적합성, 콘텐츠 품질, 공개 범위를 사전 검토한 대상',offer:'공개 전 세계관 프리뷰와 정확한 제품 자료',next:'엠바고, 표기 확인과 콘텐츠 반응 기록'},
  {code:'DORMANT_VIP',name:'휴면 VIP',invited:60,reason:'과거 구매 이후 일정 기간 관계 신호가 없다는 가정',offer:'재활성화를 위한 부담 없는 체험 예약',next:'반응이 없으면 반복 발송을 중지하고 선호 갱신 기회 제공'}
 ],
 funnel:[
  {stage:'초청',count:240,denominator:'선정 고객',rate:null,rule:'중복 제거, 초청 이유, 담당자 확인 후 발송'},
  {stage:'RSVP 응답',count:156,denominator:'초청 240명',rate:65.0,rule:'응답, 거절, 미응답을 분리'},
  {stage:'방문 확정',count:132,denominator:'응답 156명',rate:84.6,rule:'시간, 동반, 접근성 요청 확인'},
  {stage:'실제 참석',count:116,denominator:'확정 132명',rate:87.9,rule:'체크인 시각으로만 참석 처리'},
  {stage:'체험 완료',count:104,denominator:'참석 116명',rate:89.7,rule:'향 비교 또는 대체 경험 완료'},
  {stage:'마케팅 동의',count:82,denominator:'참석 116명',rate:70.7,rule:'행사 참여와 별도 선택'},
  {stage:'후속 반응',count:47,denominator:'동의 82명',rate:57.3,rule:'열람이 아닌 클릭, 회신, 상담 행동'},
  {stage:'유효 관계 행동',count:28,denominator:'동의 82명',rate:34.1,rule:'상담 12, 예약 9, 구매 7 가정'}
 ],
 leaks:[
  {between:'초청과 RSVP 사이',lost:84,care:'48시간 뒤 1회 리마인드. 이후 미응답 종료',owner:'CRM Manager'},
  {between:'응답과 확정 사이',lost:24,care:'거절과 시간 미정 구분, 대기 명단과 대체 시간 안내',owner:'Guest Manager'},
  {between:'확정과 참석 사이',lost:16,care:'노쇼를 실패로 단정하지 않고 운영 연락 범위에서 사유 선택 수집',owner:'Guest Manager'},
  {between:'참석과 체험 완료 사이',lost:12,care:'향 만들기 체험(DIY) 마감, 대기, 시간 부족 사유를 기록하고 대체 샘플 또는 재예약 제공',owner:'Experience Lead'},
  {between:'참석과 동의 사이',lost:34,care:'거절과 미확인을 분리하고 마케팅 후속에서 제외',owner:'CRM & Privacy'},
  {between:'동의와 후속 반응 사이',lost:35,care:'선호 채널로 최대 2회, 반응 없으면 휴면 처리',owner:'Lifecycle CRM'},
  {between:'후속 반응과 관계 행동 사이',lost:19,care:'구매 압박 없이 정보 탐색, 상담 보류, 재고 요청으로 분류',owner:'Client Care'}
 ],
 kpis:[
  {name:'초청 응답률',formula:'RSVP 응답 156 ÷ 초청 240',value:65.0,target:60,meaning:'타깃과 초청 가치의 적합성'},
  {name:'참석률',formula:'실제 참석 116 ÷ 방문 확정 132',value:87.9,target:85,meaning:'예약, 리마인드, 접근 안내의 실행력'},
  {name:'체험 완료율',formula:'체험 완료 104 ÷ 실제 참석 116',value:89.7,target:88,meaning:'대기, 수용량, 대체 경험의 품질'},
  {name:'마케팅 동의율',formula:'동의 82 ÷ 실제 참석 116',value:70.7,target:65,meaning:'혜택 설명과 선택권의 신뢰'},
  {name:'후속 반응률',formula:'반응 47 ÷ 동의 82',value:57.3,target:45,meaning:'개인화와 채널, 시점의 적합성'},
  {name:'관계 행동률',formula:'상담, 예약, 구매 28 ÷ 동의 82',value:34.1,target:30,meaning:'행사 이후 고객 관계의 사업 연결'}
 ],
 timeline:[
  {when:'T-8~6주',work:'목표, 고객군, KPI, 동의 기준 확정',output:'CRM 브리프, 고객 선정 규칙, 측정 정의'},
  {when:'T-5~3주',work:'초청 여정, 초청 문구, RSVP, 혜택 재고 설계',output:'초청물, 응답 현황표, 대기 명단'},
  {when:'T-2~1주',work:'고객 명단 점검, 직원 교육, 예외 상황 리허설',output:'큐시트, 담당자표, 서비스 복구 기준'},
  {when:'D-day',work:'체크인, 체험 신호, 동의, 상담 요청 실시간 인계',output:'현장 로그, 미처리 고객과 업무 목록'},
  {when:'D+1~7일',work:'선호, 체험, 구매 여부별 후속과 요청 마감',output:'후속 캠페인, 상담과 예약 인계'},
  {when:'D+30',work:'재방문, 구매, 수신 거절, 표본 한계 회고',output:'성과 보고, 다음 행사 실험안'}
 ],
 scopeModel:[
  {side:'공통 기준',items:'고객군 코드, 행동 이름, KPI 계산식, 최소 동의 원칙'},
  {side:'행사마다 조정',items:'초청 문구, 예약 채널, 발송 시각, 혜택 재고, 직원 응대'},
  {side:'함께 검토',items:'고객군 크기, 제외 고객, 서비스 복구, 결과 해석, 다음 실험'}
 ],
 collaboration:[
  {team:'리테일, 현장',ask:'시간대별 수용량, 직원 배치, 혜택, 제품 재고, 품절 시 대체 가능 범위',decide:'대기 목표와 VIP 에스코트 기준, 재고 소진 시 고객 선택지',handoff:'정원표, 인력표, 서비스 복구 기준'},
  {team:'콘텐츠',ask:'공개 전후 메시지 범위, 엠바고, 필수 제품 정보, 채널별 표현',decide:'공개 티저와 VIP 선공개 정보의 차이, 후속 메시지 변형',handoff:'콘텐츠 캘린더, 메시지 승인본, 반응 태그'},
  {team:'디자인, 공간',ask:'초청장, 현장 사인, 체험물, 촬영, 동의 화면의 제작 조건',decide:'고객 동선별 필요한 정보와 개인정보 노출 최소화',handoff:'제작물 목록, 설치 위치, 최종 승인 시점'}
 ],
 risks:[
  {trigger:'DIY 또는 예약 혜택 소진',response:'대체 샘플, 재예약 중 고객 선택',measure:'대체안 수락률, 7일 반응'},
  {trigger:'대기 목표 초과',response:'도착 분산, 예상 대기 고지, 담당자 호출',measure:'평균, 최대 대기, 조기 퇴장'},
  {trigger:'VIP 정보 노출 위험',response:'실명 대신 현장 식별명, 최소 권한과 촬영 동의 분리',measure:'접근 기록, 동의 누락 0건'},
  {trigger:'마케팅 동의 거절',response:'체험과 기프트는 유지하고 후속 발송 제외',measure:'잘못된 발송 0건'},
  {trigger:'초청 문구와 현장 안내 불일치',response:'핵심 문장 고정, 채널별 문안은 콘텐츠팀 승인',measure:'승인 이력, 수정 건수'}
 ],
 links:[
  {topic:'휴면 VIP의 기대치',source:'고객 가치 분석',body:`휴면 고객은 다음 해에 ${customerValue.dormantRepurchase}%만 다시 샀고, 이탈 위험 고객은 ${customerValue.atRiskRepurchase}%였습니다. 업종이 달라 숫자를 그대로 옮기지는 않습니다. 휴면 VIP 60명의 반응 기대를 다른 고객군과 따로 잡고, 반응이 없으면 반복 초청을 멈추는 근거로만 씁니다.`},
  {topic:'동의 기록',source:'Journey 설계도',body:'목적, 채널, 동의 시각, 정책 버전의 네 항목은 이탈 위험 고객 재방문 Journey의 진입 필터와 같습니다. 행사에서 받은 동의도 상시 캠페인과 같은 기준으로 확인합니다.'},
  {topic:'반응의 정의',source:'KPI 정의서',body:'후속 반응률은 KPI 정의서와 같이 클릭, 회신, 상담 요청만 세고 열람은 뺍니다. 그래서 행사와 상시 캠페인의 반응을 같은 기준으로 비교할 수 있습니다.'},
  {topic:'효과와 반응의 구분',source:'사례 A',body:'관계 행동률 34.1%는 동의한 고객 안의 반응이지 행사 덕분에 늘어난 효과가 아닙니다. 사례 A처럼 선정 고객의 일부를 무작위로 초청하지 않고 남겨, 초청 전체 기준으로 두 군을 비교해야 효과를 잴 수 있습니다. 인원과 필요한 행사 수는 5장의 비교군 설계에 있습니다.'}
 ],
 experiments:[
  {question:'현장 발견감을 해치지 않으면서 참석을 높일 수 있는가?',a:'제품 상세 선공개',b:'세계관 티저만 공개',metric:'참석률, 체험 참여율, 상담 요청률'},
  {question:'DIY 마감 고객에게 어떤 회복안이 관계를 더 잘 이어가는가?',a:'대체 샘플 즉시 제공',b:'우선 재예약',metric:'수락률, 7일 반응, 30일 재방문'},
  {question:'후속 메시지는 무엇을 기억시켜야 하는가?',a:'제품 기능 중심',b:'고객이 고른 향, 사용 장면 중심',metric:'클릭, 상담, 예약'},
  {question:'행사가 없었어도 다시 왔을 고객은 얼마인가?',a:'초청',b:'초청 대상 중 무작위로 남긴 미초청군',metric:'30일 증분 관계 행동률 (초청 전체 기준). 5장의 비교군 설계대로 여러 행사를 합쳐 판단'}
 ],
 sources:[
  '젠틀몬스터, 탬버린즈, 누데이크, 어티슈, 누플랏의 공식 채널을 먼저 확인하고, 기사와 공개 방문 자료를 따로 읽었습니다. 독립 방문 후기가 없는 어티슈와 팝업 사례가 아닌 누플랏은 그 한계를 그대로 적었습니다.',
  '모든 관련 글을 수집했다고 주장하지 않습니다. 기획안에 직접 필요한 자료를 골랐고, 실제 고객 수, 매출, 초청 기준, 내부 시스템은 확인하지 못했습니다.',
  '전체 링크와 자료별 사용 범위는 `RESEARCH-SOURCES.md`와 Excel의 `근거 및 출처` 시트에 정리했습니다.'
 ],
 effort:[
  '행사 운영에서 반복되는 일을 고객 선정, 현장 경험, 후속 CRM, 결과 확인으로 나눴습니다.',
  '다섯 브랜드의 공식 자료와 공개 방문 후기를 따로 읽고, 제가 직접 확인하지 못한 내용은 가정으로 표시했습니다.',
  '대기, 품절, 체험 마감 사례를 현장 기록 항목과 후속 업무에 반영했습니다.',
  '전환율이 좋아 보이게 분모를 바꾸지 않도록 초청부터 30일 후 행동까지 계산 기준을 먼저 정했습니다.',
  '장소와 날씨를 함께 볼 수 있도록 서울시 공공데이터와 Open-Meteo를 웹 화면에 연결했습니다.'
 ],
 pitch:'실제 VIP 행사를 운영한 경험은 없습니다. 그래서 브랜드 공식 자료를 읽고, 공개 후기에서 확인한 대기, 품절과 체험 마감 사례를 운영표의 확인 항목으로 옮겼습니다. 후기 한 건을 전체 고객의 문제로 확대하지 않았고, 고객 수와 전환율은 계산용 가상값으로 표시했습니다. 실제로 적용한다면 고객 기준과 규정을 먼저 확인하고, 작은 행사 한 건에서 선정, 체험, 동의와 후속 기록을 실제 데이터로 검증해야 합니다.'
};

export const disclaimer='모든 고객 수와 전환 결과는 계산 구조를 보여주기 위한 가상 데이터입니다. 실제 브랜드의 고객, 매출, 행사 성과가 아닙니다. 공개 방문 후기는 제한된 개인 표본이며 전체 고객 경험으로 일반화하지 않습니다.';

export function percent(current,base){return base?current/base*100:null;}
export function validateFinalPlan(plan=finalPlan){const invited=plan.segments.reduce((n,x)=>n+x.invited,0);if(invited!==plan.funnel[0].count)throw Error('세그먼트 초청 합계가 퍼널과 다릅니다.');for(let i=1;i<plan.funnel.length;i++)if(plan.funnel[i].count>plan.funnel[i-1].count)throw Error('퍼널 단계가 역전되었습니다.');if(!plan.status.includes('가상 데이터'))throw Error('가상 데이터 표시가 필요합니다.');return true;}

// 비교군 설계. 초청 수는 현장 수용량에 묶여 있어 그대로 두고, 선정 고객 안에서 미초청군을 무작위로 남깁니다.
// Z는 양측 5%, 검정력 80%의 정규분포 값(1.959964 + 0.841621)으로 analysis/brief_sample.py와 같습니다.
export const HOLDOUT_Z=1.959964+0.841621;
export function holdoutMde(p,nInvite,nHold){return HOLDOUT_Z*Math.sqrt(p*(1-p)*(1/nInvite+1/nHold));}
export function holdoutRounds(p,nInvite,nHold,target,max=30){for(let k=1;k<=max;k++)if(holdoutMde(p,nInvite*k,nHold*k)<=target)return k;return null;}
export function holdoutPlan(plan=finalPlan,share=0.3,target=0.05){
 const groups=plan.segments.filter(x=>x.code!=='CREATOR').map(x=>{const hold=Math.round(x.invited*share/(1-share));return {code:x.code,name:x.name,invited:x.invited,hold,selected:x.invited+hold};});
 const sum=k=>groups.reduce((n,x)=>n+x[k],0),invited=sum('invited'),hold=sum('hold');
 const action=plan.funnel.at(-1).count,base=action/plan.funnel[0].count;
 const mde1=holdoutMde(base,invited,hold);
 return {share,target,total:plan.funnel[0].count,groups,invited,hold,selected:invited+hold,excluded:plan.segments.filter(x=>x.code==='CREATOR').map(x=>({name:x.name,invited:x.invited})),action,base,mde1,rounds:holdoutRounds(base,invited,hold,target)};
}
export const holdout=holdoutPlan();
const pct1=x=>(x*100).toFixed(1);
export function holdoutNotes(h=holdout){const ex=h.excluded.map(x=>`${x.name} ${x.invited}명`).join(', ');return [
 {title:'초청 수는 그대로 두고 선정 범위를 넓힙니다.',body:`전체 초청 ${h.total}명은 현장 수용량으로 정한 수라 줄이지 않습니다. 이 중 비교 대상 ${h.groups.length}개 고객군의 초청은 ${h.invited}명이고, 나머지 ${ex}은 아래처럼 비교에서 뺍니다. 고객군마다 ${h.share*100}%를 무작위로 미초청군에 남기도록 비교 대상 고객군에서 ${h.selected}명을 고르고, 그중 ${h.hold}명은 초청하지 않습니다. 그래서 초청 ${h.invited}명과 미초청 ${h.hold}명을 비교합니다.`},
 {title:`${h.excluded.map(x=>x.name).join(', ')} ${h.excluded.reduce((n,x)=>n+x.invited,0)}명은 비교에서 뺍니다.`,body:'콘텐츠 확산이 목적인 고객군이라 재방문을 비교하지 않고 전원 초청합니다.'},
 {title:'분모는 동의 고객이 아니라 초청 전체입니다.',body:`관계 행동률 34.1%는 동의한 82명 안의 비율입니다. 미초청군에는 참석과 동의 단계가 없어 이 비율과 비교할 수 없습니다. 그래서 30일 안에 상담, 예약, 구매가 있었던 고객 수를 초청군 ${h.invited}명과 미초청군 ${h.hold}명 전체로 나눠 비교합니다. 초청했지만 오지 않은 고객도 초청군에 그대로 둡니다. 가상 퍼널 전체로 계산하면 ${h.action} ÷ ${h.total} = ${pct1(h.base)}%입니다.`},
 {title:'미초청군에는 연락하지 않습니다.',body:'미초청군의 30일 상담, 예약, 구매는 회원 ID로 CRM 기록에서 찾습니다. 행사 안내를 따로 보내면 비교군이 아니게 됩니다.'},
 {title:'한 행사로는 판단하지 않습니다.',body:`기준 비율을 ${pct1(h.base)}%로 두면 한 행사에서 잡을 수 있는 최소 차이는 ${pct1(h.mde1)}%p입니다 (양측 5%, 검정력 80%). 목표 차이 ${h.target*100}%p는 제가 정한 설계 값이며, 같은 설계로 ${h.rounds}회 행사를 합쳐야 잡힙니다. 그 전에는 수신 거절과 불만만 매 행사 확인하고, 확대 여부는 ${h.rounds}회를 합친 뒤에 정합니다. 앞당기는 경우는 아래 운영 규칙에서 ${Math.ceil(h.rounds/2)}회차에 미리 정한 경계를 넘을 때뿐입니다.`},
 {title:'기준 비율은 첫 행사에서 다시 잽니다.',body:`${pct1(h.base)}%는 가상 퍼널에서 나온 값입니다. 첫 행사의 미초청군 비율을 확인한 뒤 필요한 행사 수를 다시 계산합니다.`}
];}

// 판단까지 기다리는 동안의 운영 규칙. 중간 점검은 설계 가정, 배정, 보호 지표를 보고, 효과는 미리 정한 경계를 넘었는지만 봅니다.
// 기준선 숫자는 가정값이며, 근거가 있는 것만 출처를 답니다.
export const holdoutGuardrailSource={label:'Gmail 이메일 발신자 가이드라인',url:'https://support.google.com/a/answer/81126'};
export const holdoutEarlySource="O'Brien, P. C. and Fleming, T. R. (1979). A multiple testing procedure for clinical trials. Biometrics 35(3), 549-556.";

// 3회차 조기 종료 경계. 중간 점검 1번(정보 비율 t)과 최종 판정에 O'Brien-Fleming 경계(c/√t, c)를 두고,
// 두 번 중 한 번이라도 넘을 확률이 양측 5%가 되도록 c를 정합니다. t=0.5이면 2.797, 1.977입니다.
const erf=x=>{const t=1/(1+0.3275911*Math.abs(x)),y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);return x>=0?y:-y;};
export const normCdf=x=>0.5*(1+erf(x/Math.SQRT2));
const normPdf=x=>Math.exp(-x*x/2)/Math.sqrt(2*Math.PI);
const simpson=(f,a,b,n=2000)=>{const d=(b-a)/n;let s=f(a)+f(b);for(let i=1;i<n;i++)s+=f(a+i*d)*(i%2?4:2);return s*d/3;};
export function obfBounds(t,alpha=0.05){
 const r=Math.sqrt(t),s=Math.sqrt(1-r*r);
 const reject=c=>{const a=c/r;return 1-simpson(z=>normPdf(z)*(normCdf((c-r*z)/s)-normCdf((-c-r*z)/s)),-a,a);};
 let lo=1.5,hi=4;for(let i=0;i<60;i++){const m=(lo+hi)/2;if(reject(m)>alpha)lo=m;else hi=m;}
 return {interim:lo/r,final:lo};
}
// 효과 방향으로 경계를 넘을 확률. theta는 최종 회차 기준 기대 z값입니다.
export function obfPower(theta,t,b){const r=Math.sqrt(t),s=Math.sqrt(1-r*r),m1=theta*r;return 1-normCdf(b.interim-m1)+simpson(z=>normPdf(z-m1)*(1-normCdf((b.final-theta-r*(z-m1))/s)),m1-10,b.interim);}

export function holdoutWaitRules(h=holdout,mid=Math.ceil(h.rounds/2)){
 const se=k=>holdoutMde(h.base,h.invited*k,h.hold*k)/HOLDOUT_Z;
 const at=k=>({round:k,invited:h.invited*k,hold:h.hold*k,mde:se(k)*HOLDOUT_Z,left:h.rounds-k});
 const m=at(mid),optOut=3,low=0.08,high=0.15,roundsAt=b=>holdoutRounds(b,h.invited,h.hold,h.target);
 const groupHold=h.groups.map(x=>x.hold*mid);
 const b=obfBounds(mid/h.rounds),theta=h.target/se(h.rounds);
 const early={round:mid,interim:b.interim,final:b.final,diffMid:b.interim*se(mid),diffFinal:b.final*se(h.rounds),powerFixed:1-normCdf(1.959964-theta),powerSeq:obfPower(theta,mid/h.rounds,b)};
 const z2=x=>x.toFixed(2);
 return {mid:m,early,progress:Array.from({length:h.rounds},(_,i)=>at(i+1)),optOut,scenarios:[{base:low,rounds:roundsAt(low)},{base:high,rounds:roundsAt(high)}],
 look:[
  `미초청군의 실제 관계 행동률. 기준 비율 ${pct1(h.base)}%는 가상 퍼널 값이라 ${mid}회 누적 미초청 ${m.hold}명으로 다시 잽니다.`,
  `배정이 설계대로 되었는지. 회차마다 고객군별 미초청 인원이 ${h.groups.map(x=>x.hold).join(', ')}명인지와 미초청군에 행사 안내가 나간 건수를 봅니다.`,
  '아래 중단 조건의 보호 지표 누적. 수신 거부, 불만, 초청받지 못한 고객의 문의를 셉니다.',
  '30일 결과를 회원 ID로 찾지 못한 고객 수. 초청군과 미초청군 중 한쪽에서만 많이 빠지면 비교가 기웁니다.',
  `두 군 차이의 z값이 미리 정한 경계 ${z2(early.interim)}을 넘었는지. 분석 담당자 한 명만 계산하고, 넘었는지 여부만 전달합니다.`
 ],
 can:[
  `${mid}회 누적 z값이 ${z2(early.interim)}을 넘으면 확대를 앞당깁니다. 기준 비율 ${pct1(h.base)}% 가정에서는 초청군이 미초청군보다 약 ${pct1(early.diffMid)}%p 이상 높을 때입니다. 이 경계는 시작 전에 O'Brien-Fleming 방식으로 정한 값이고, 중간 결과를 본 뒤 고치지 않습니다.`,
  `기준 비율이 가정과 다르면 필요한 행사 수를 다시 계산합니다. 같은 인원으로 기준 비율이 ${pct1(low)}%면 ${roundsAt(low)}회, ${pct1(high)}%면 ${roundsAt(high)}회가 필요합니다. 두 비율은 계산을 보여 주려고 둔 가정값입니다.`,
  '보호 지표가 보류 기준을 넘었으면 다음 회차 발송을 보류하거나 비교를 멈춥니다.',
  '배정이나 명단 대조에 결함이 있으면 다음 회차 전에 고칩니다.'
 ],
 cannot:[
  `경계를 넘지 않은 차이로 효과가 있다, 없다고 정하는 판단. ${mid}회 누적으로 잡을 수 있는 최소 차이는 ${pct1(m.mde)}%p라 목표 ${h.target*100}%p보다 큽니다. 경계 아래의 차이로 결론을 내리면 우연한 차이를 효과로 읽을 위험이 커집니다.`,
  '효과가 없어 보인다는 이유로 일찍 끝내는 판단. 이 설계는 효과 쪽 경계만 두었고, 효과가 없다는 쪽으로 멈추는 기준은 두지 않았습니다.',
  '초청군 반응이 좋아 보인다는 이유로 미초청군을 없애거나 비율을 줄이는 판단. 중간 결과를 보고 설계를 바꾸면 합산 결과도 믿기 어려워집니다.',
  `고객군별 효과 비교. 고객군 하나의 미초청군은 ${mid}회를 합쳐도 ${Math.min(...groupHold)}명에서 ${Math.max(...groupHold)}명이라 고객군끼리 비교할 수 없습니다.`
 ],
 earlyNote:`중간에 한 번 보는 대가로 ${h.rounds}회차 판정 경계가 z 1.96에서 ${z2(early.final)}로 조금 엄격해집니다. 목표 ${h.target*100}%p를 ${h.rounds}회에 잡을 확률은 ${pct1(early.powerFixed)}%에서 ${pct1(early.powerSeq)}%로 거의 같아, 필요한 행사 수는 ${h.rounds}회 그대로입니다.`,
 guardrails:[
  {metric:'초청 관련 불만, 스팸 신고',who:'초청군',check:'1건',hold:'한 회차 2건',action:'확인: 연락을 원치 않았는지, 개인정보가 드러났는지, 문구 문제인지 원인을 기록합니다. 보류: 다음 회차 발송을 멈추고 원인을 고친 뒤 다시 보냅니다.',basis:`Gmail 발신자 가이드라인은 스팸 신고율을 0.1% 아래로 두고 0.3%에 이르지 않게 하라고 안내합니다. 초청 ${h.invited}명의 0.3%는 ${(h.invited*0.003).toFixed(2)}명이라 비율 대신 건수로 둡니다. 이메일 기준을 초청 채널에 옮긴 가정값입니다.`,source:true},
  {metric:'수신 거부',who:'초청군',check:'1명',hold:`발송 후 7일 안 ${optOut}명 (초청 ${h.invited}명의 ${pct1(optOut/h.invited)}%)`,action:'확인: 거부 사유와 받은 메시지를 기록하고, 같은 기간 미초청군에서 상시 캠페인으로 생긴 수신 거부와 함께 봅니다. 보류: 초청 문구와 선정 기준을 다시 본 뒤 다음 회차를 보냅니다.',basis:'근거로 삼을 공개 기준을 찾지 못해 정한 가정값입니다. 첫 행사의 실제 값을 보고 다시 정합니다.'},
  {metric:'초청받지 못한 고객의 문의, 불만',who:'미초청군',check:'1건',hold:'누적 3건',action:'확인: 개별로 응대하되 배정은 바꾸지 않습니다. 그 고객이 행사에 오면 기록하고 미초청군으로 분석합니다. 보류: 미초청 비율과 선정 안내 방식을 다시 검토할 때까지 다음 회차 선정을 멈춥니다.',basis:'가정값입니다. VIP가 초청에서 빠졌다고 느끼는 것이 비교군의 가장 큰 비용이라 따로 셉니다.'},
  {metric:'미초청군 연락 누출',who:'미초청군',check:'1건',hold:'1건 (절차를 고칠 때까지)',action:'확인: 누출된 고객도 미초청군에 그대로 두고 건수를 보고합니다. 보류: 발송 명단과 미초청 명단의 대조 절차를 고친 뒤 다음 회차를 보냅니다.',basis:'설계 조건입니다. 미초청군에 안내가 가면 비교군이 아니게 됩니다.'}
 ],
 stop:'확인 기준은 원인을 기록하고 계속 진행하는 선이고, 보류 기준은 다음 회차를 멈추는 선입니다. 보류가 두 회차 연속이면 비교를 멈추고, 그때까지 모은 회차는 결론 없이 표본과 보호 지표만 보고합니다.',
 example:`${h.rounds}회 중 ${mid}회 완료. 누적 초청 ${m.invited}명, 미초청 ${m.hold}명. 남은 ${m.left}회. 보호 지표는 보류 기준 안. 조기 종료 경계는 넘지 않음. 효과 판단은 ${h.rounds}회 뒤.`,
 reporting:[
  '매 회차 보고는 완료 회차, 누적 초청, 누적 미초청, 남은 회차, 보호 지표 상태의 다섯 가지로 합니다.',
  `두 군의 관계 행동률 차이는 ${h.rounds}회가 끝나기 전에는 보고서에 넣지 않습니다. ${mid}회차에는 경계를 넘었는지만 적고, 차이 값은 분석 담당자만 봅니다.`,
  `매출 질문에는 초청 수가 줄지 않았다는 점으로 답합니다. 전체 초청 ${h.total}명은 현장 수용량으로 정한 수이고, 그중 비교 대상 초청 ${h.invited}명도 그대로입니다. 미초청군 ${h.hold}명은 그 ${h.invited}명 위에 더 고른 고객입니다. 수용량 때문에 어차피 초청하지 못했을 고객이라 행사 매출 기회는 그대로입니다.`,
  '초청군의 참석, 동의, 구매는 운영 지표로 매 회차 그대로 보고합니다. 다만 이 숫자를 행사 덕분에 늘어난 매출이라고 부르지 않습니다.'
 ]};
}
export const holdoutWait=holdoutWaitRules();

const row=cells=>`| ${cells.join(' | ')} |`;
const tbl=(head,rows)=>[row(head),row(head.map(()=>'---')),...rows.map(row)].join('\n');
const linkDoc={'고객 가치 분석':'[고객 가치 분석](CUSTOMER-VALUE.md)','Journey 설계도':'[Journey 설계도](JOURNEY.md)','KPI 정의서':'[KPI 정의서](KPI.md)','사례 A':'[사례 A 캠페인 측정](CAMPAIGN-MEASUREMENT.md)'};

// docs/PROJECT-PLAN.md는 이 함수의 결과와 같아야 합니다(`npm run plan`으로 다시 씁니다).
export function finalPortfolioReport(){validateFinalPlan();const p=finalPlan;return `# 사례 B: ${p.title}

[프로젝트 소개로 돌아가기](../README.md)

## ${p.subtitle}

${p.status}

${p.nameMeaning}

${p.nameNotice}

${p.oneLine}

## 1. 행사 목표

- 목표: ${p.objective}
- 메시지: ${p.message}
- 기간: ${p.period}
- 장소: ${p.location}

## 2. 초청 대상과 기준

${tbl(['코드','고객군','가상 초청','선정 이유','제공 가치','다음 행동'],p.segments.map(x=>[x.code,x.name,x.invited+'명',x.reason,x.offer,x.next]))}

## 3. 경험 설계

${tbl(['순간','설계','이유'],p.experience.map(x=>[x.moment,x.design,x.reason]))}

향 만들기 체험(DIY)은 공개 자료에서 확인한 현장 체험 방식을 가상 행사에 옮긴 것입니다.

## 4. 후속 메시지

${tbl(['받는 고객','메시지','시점','바라는 행동'],p.followups.map(x=>[x.who,x.message,x.when,x.goal]))}

## 5. 성과 기준

${tbl(['지표','가상 결과','가상 목표','계산','보려는 것'],p.kpis.map(x=>[x.name,x.value+'%',x.target+'%',x.formula,x.meaning]))}

### 가상 결과 퍼널

${tbl(['단계','가상 인원','분모','기준'],p.funnel.map(x=>[x.stage,x.count+'명',x.denominator,x.rule]))}

### 비교군 설계

${tbl(['고객군','선정','초청','미초청'],[...holdout.groups.map(x=>[x.name,x.selected+'명',x.invited+'명',x.hold+'명']),['합계',holdout.selected+'명',holdout.invited+'명',holdout.hold+'명']])}

${holdoutNotes().map(x=>`- **${x.title}** ${x.body}`).join('\n')}

### 판단까지 기다리는 동안의 운영 규칙

목표 차이를 잡으려면 ${holdout.rounds}회 행사가 필요합니다. 그동안 무엇을 보고, 무엇을 멈추고, 어떻게 보고하는지 미리 정해 둡니다.

#### ${holdoutWait.mid.round}회차 중간 점검

볼 지표

${holdoutWait.look.map(x=>`- ${x}`).join('\n')}

내릴 수 있는 판단

${holdoutWait.can.map(x=>`- ${x}`).join('\n')}

조기 종료 경계

${tbl(['회차','z 경계',`경계를 넘는 차이 (기준 비율 ${pct1(holdout.base)}% 가정)`],[[holdoutWait.early.round+'회',holdoutWait.early.interim.toFixed(2),pct1(holdoutWait.early.diffMid)+'%p'],[holdout.rounds+'회',holdoutWait.early.final.toFixed(2),pct1(holdoutWait.early.diffFinal)+'%p']])}

${holdoutWait.earlyNote} 경계 계산 방식의 출처는 ${holdoutEarlySource}

내릴 수 없는 판단

${holdoutWait.cannot.map(x=>`- ${x}`).join('\n')}

#### 중단 조건

${tbl(['보호 지표','대상','확인 기준','보류 기준','할 일','기준선의 근거'],holdoutWait.guardrails.map(x=>[x.metric,x.who,x.check,x.hold,x.action,x.basis]))}

${holdoutWait.stop} 기준선은 모두 가정값이며 첫 행사의 실제 값을 본 뒤 다시 정합니다. 스팸 신고 기준의 출처는 [${holdoutGuardrailSource.label}](${holdoutGuardrailSource.url})입니다.

#### 기다리는 동안의 보고

${tbl(['회차','누적 초청','누적 미초청','그 시점에 잡을 수 있는 최소 차이','남은 회차'],holdoutWait.progress.map(x=>[x.round+'회',x.invited+'명',x.hold+'명',pct1(x.mde)+'%p',x.left+'회']))}

${holdoutWait.reporting.map(x=>`- ${x}`).join('\n')}

보고 예시: ${holdoutWait.example}

## 다음에 확인할 네 가지

${tbl(['질문','A','B','볼 지표'],p.experiments.map(x=>[x.question,x.a,x.b,x.metric]))}

## 다른 사례와 이어지는 점

${tbl(['주제','연결 문서','내용'],p.links.map(x=>[x.topic,linkDoc[x.source],x.body]))}

## 실행 부록

기획을 현장에서 실행할 때 쓰는 담당자 인계, 누락 업무, 협업, 일정 기준입니다.

### 담당자가 묻는 7가지 질문

${tbl(['단계','질문','남기는 데이터','다음 행동','담당','기한'],p.decisionMap.map(x=>[x.stage,x.question,x.data.split(', ').map(d=>'`'+d+'`').join(', '),x.action,x.owner,x.sla]))}

### 단계 사이 누락 관리

${tbl(['구간','누락','고객 케어와 다음 업무','담당'],p.leaks.map(x=>[x.between,x.lost+'명',x.care,x.owner]))}

### 팀마다 먼저 확인할 내용

${tbl(['팀','먼저 확인할 것','함께 결정할 것','인계할 결과'],p.collaboration.map(x=>[x.team,x.ask,x.decide,x.handoff]))}

### 일정과 산출물

${tbl(['시점','할 일','산출물'],p.timeline.map(x=>[x.when,x.work,x.output]))}

### 공통 기준과 행사마다 바꿀 항목

${tbl(['구분','항목'],p.scopeModel.map(x=>[x.side,x.items]))}

### 위험 대응

${tbl(['상황','대응','확인 지표'],p.risks.map(x=>[x.trigger,x.response,x.measure]))}

## 자료를 확인한 범위

${p.sources.map(x=>`- ${x}`).join('\n')}

## 제가 확인하고 정한 것

${p.effort.map(x=>`- ${x}`).join('\n')}

## 이 프로젝트를 만든 이유

${p.pitch}

## 읽기 전에

${disclaimer}
`;}
