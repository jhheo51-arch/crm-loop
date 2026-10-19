export const finalPlan={
 title:'VIP 프리뷰에서 재방문까지',
 subtitle:'향 브랜드 신제품 프리뷰를 가정한 고객 생애주기 운영안',
 status:'개인 포트폴리오 / 공개 자료 조사 및 가상 데이터 사용',
 nameMeaning:'CRM은 동의한 고객의 선택과 반응 기록을, LOOP는 그 기록이 초청, 참석, 상담, 재방문으로 다시 이어지는 순환을 뜻합니다. 연락은 마케팅 수신에 동의한 고객에게만 보낸다는 조건을 두었습니다.',
 nameNotice:'CRM LOOP는 제가 붙인 프로젝트 이름입니다. 공개 자료를 참고한 브랜드가 실제로 사용한 행사명은 아닙니다.',
 oneLine:'행사장에서 확인한 고객의 선택을 동의 기록으로 남기고, 상담과 재방문 안내로 이어 가는 흐름을 설계했습니다.',
 period:'가상 일정 / T-8주부터 행사 후 30일까지',
 location:'서울 성수 / 실제 공간 계약 전 가정',
 objective:'VIP 프리뷰에서 확인한 향 선호와 상담 요청을 놓치지 않고, 동의한 고객에게 필요한 후속 안내를 보내는 흐름을 정리했습니다.',
 message:'차 안의 기억을 향으로 설계하고, 현장의 발견을 다음 경험으로 이어갑니다.',
 decisionMap:[
  {stage:'선정',question:'왜 이 고객을 초대해야 하는가?',data:'customer_id / market / segment_code / selection_reason / suppression_status',action:'초청 적격이면 개인화 초청, 제외 조건이면 발송 중지',owner:'HQ CRM + Local CRM',sla:'T-6주'},
  {stage:'RSVP',question:'방문 가능한 시간과 필요한 지원은 무엇인가?',data:'rsvp_status / slot_id / party_size / language / accessibility_request',action:'확정, 대기, 거절로 분기하고 시간 및 접근 안내',owner:'Guest Manager',sla:'응답 즉시'},
  {stage:'체크인',question:'실제로 도착했고 얼마나 기다렸는가?',data:'checkin_at / queue_enter_at / experience_start_at / no_show_reason',action:'혼잡 시 도착 분산, 장기 대기 고객은 담당자 호출',owner:'Front Desk',sla:'현장 5분'},
  {stage:'체험',question:'어떤 향을 선호했고 어디에서 경험이 끊겼는가?',data:'scent_preference / diy_status / issue_reason / consult_request',action:'선호 향별 안내, 마감 고객은 샘플 또는 재예약 선택',owner:'Experience Lead',sla:'퇴장 전'},
  {stage:'동의',question:'어떤 목적과 채널로 연락받기를 원하는가?',data:'consent_status / consent_purpose / channel / consent_at / policy_version',action:'동의 고객만 CRM 등록, 거절/미확인은 후속 발송 제외',owner:'CRM & Privacy',sla:'퇴장 전'},
  {stage:'후속',question:'다음 결정을 위해 어떤 정보가 필요한가?',data:'message_variant / sent_at / click_at / reply_type / handoff_status',action:'사용 팁, 상담, 예약, 재입고 중 하나로 분기하고 담당자 인계',owner:'Lifecycle CRM',sla:'D+1~7일'},
  {stage:'관계',question:'30일 안에 어떤 관계 행동이 일어났는가?',data:'outcome_type / outcome_at / order_value / revisit_at / opt_out_at',action:'구매, 예약, 상담은 유지 프로그램, 무반응은 빈도 축소',owner:'Client Care',sla:'D+30'}
 ],
 segments:[
  {code:'VIP_REPEAT',name:'기존 우수, 재구매 고객',invited:70,reason:'기존 향 구매와 재구매 관계를 바탕으로 신제품 적합성을 확인',offer:'선호 향 기반 프리뷰와 리필 케어',next:'구매 여부에 따라 사용 팁, 리필 시점 안내'},
  {code:'HIGH_INTENT',name:'고관여 잠재 고객',invited:80,reason:'카디퓨저, 자동차 라이프스타일 콘텐츠에 반응한 고객 가정',offer:'향 비교와 차량 환경별 상담',next:'상담 요청, 예약, 미구매 이유별 후속'},
  {code:'CREATOR',name:'콘텐츠 크리에이터',invited:30,reason:'브랜드 적합성, 콘텐츠 품질, 공개 범위를 사전 검토한 대상',offer:'공개 전 세계관 프리뷰와 정확한 제품 자료',next:'엠바고, 표기 확인과 콘텐츠 반응 기록'},
  {code:'DORMANT_VIP',name:'휴면 VIP',invited:60,reason:'과거 구매 이후 일정 기간 관계 신호가 없다는 가정',offer:'재활성화를 위한 부담 없는 체험 예약',next:'반응이 없으면 반복 발송을 중지하고 선호 갱신 기회 제공'}
 ],
 funnel:[
  {stage:'초청',count:240,denominator:'선정 고객',rate:null,rule:'중복 제거, 초청 이유, 담당자 확인 후 발송'},
  {stage:'RSVP 응답',count:156,denominator:'초청 240명',rate:65.0,rule:'응답/거절/미응답을 분리'},
  {stage:'방문 확정',count:132,denominator:'응답 156명',rate:84.6,rule:'시간, 동반, 접근성 요청 확인'},
  {stage:'실제 참석',count:116,denominator:'확정 132명',rate:87.9,rule:'체크인 시각으로만 참석 처리'},
  {stage:'체험 완료',count:104,denominator:'참석 116명',rate:89.7,rule:'향 비교 또는 대체 경험 완료'},
  {stage:'마케팅 동의',count:82,denominator:'참석 116명',rate:70.7,rule:'행사 참여와 별도 선택'},
  {stage:'후속 반응',count:47,denominator:'동의 82명',rate:57.3,rule:'열람이 아닌 클릭, 회신, 상담 행동'},
  {stage:'유효 관계 행동',count:28,denominator:'동의 82명',rate:34.1,rule:'상담 12, 예약 9, 구매 7 가정'}
 ],
 leaks:[
  {between:'초청 → RSVP',lost:84,care:'48시간 뒤 1회 리마인드. 이후 미응답 종료',owner:'Local CRM'},
  {between:'응답 → 확정',lost:24,care:'거절과 시간 미정 구분, 대기 명단과 대체 시간 안내',owner:'Guest Manager'},
  {between:'확정 → 참석',lost:16,care:'노쇼를 실패로 단정하지 않고 운영 연락 범위에서 사유 선택 수집',owner:'Guest Manager'},
  {between:'참석 → 체험 완료',lost:12,care:'DIY 마감, 대기, 시간 부족 사유를 기록하고 대체 샘플 또는 재예약 제공',owner:'Experience Lead'},
  {between:'참석 → 동의',lost:34,care:'거절/미확인을 분리하고 마케팅 후속에서 제외',owner:'CRM & Privacy'},
  {between:'동의 → 후속 반응',lost:35,care:'선호 채널로 최대 2회, 반응 없으면 휴면 처리',owner:'Lifecycle CRM'},
  {between:'후속 반응 → 관계 행동',lost:19,care:'구매 압박 없이 정보 탐색, 상담 보류, 재고 요청으로 분류',owner:'Client Care'}
 ],
 kpis:[
  {name:'초청 응답률',formula:'RSVP 응답 156 ÷ 초청 240',value:65.0,target:60,meaning:'타깃과 초청 가치의 적합성'},
  {name:'참석률',formula:'실제 참석 116 ÷ 방문 확정 132',value:87.9,target:85,meaning:'예약, 리마인드, 접근 안내의 실행력'},
  {name:'체험 완료율',formula:'체험 완료 104 ÷ 실제 참석 116',value:89.7,target:88,meaning:'대기, 수용량, 대체 경험의 품질'},
  {name:'마케팅 동의율',formula:'동의 82 ÷ 실제 참석 116',value:70.7,target:65,meaning:'혜택 설명과 선택권의 신뢰'},
  {name:'후속 반응률',formula:'반응 47 ÷ 동의 82',value:57.3,target:45,meaning:'개인화와 채널, 시점의 적합성'},
  {name:'관계 행동률',formula:'상담/예약/구매 28 ÷ 동의 82',value:34.1,target:30,meaning:'행사 이후 고객 관계의 사업 연결'}
 ],
 timeline:[
  {when:'T-8~6주',work:'목표, 세그먼트, 시장, KPI, 동의 기준 확정',output:'CRM 브리프 / 고객 선정 규칙 / 측정 정의'},
  {when:'T-5~3주',work:'초청 여정, 현지 언어, RSVP, 혜택 재고 설계',output:'초청물 / 응답 대시보드 / 대기 명단'},
  {when:'T-2~1주',work:'고객 명단 점검, 직원 교육, 예외 상황 리허설',output:'큐시트 / 담당자표 / 서비스 복구 기준'},
  {when:'D-day',work:'체크인, 체험 신호, 동의, 상담 요청 실시간 인계',output:'현장 로그 / 미처리 고객/업무 목록'},
  {when:'D+1~7일',work:'선호, 체험, 구매 여부별 후속과 요청 마감',output:'후속 캠페인 / 상담/예약 인계'},
  {when:'D+30',work:'재방문, 구매, 수신 거절, 표본 한계 회고',output:'성과 보고 / 다음 시장 테스트안'}
 ],
 globalModel:[
  {side:'HQ 공통',items:'브랜드 세계관 / 고객군 코드 / 이벤트/행동 이름 / KPI 산식 / 최소 동의 원칙'},
  {side:'Local 조정',items:'언어 / 예약 채널 / 발송 시각 / 현지 규정 문구 / 혜택 재고 / 직원 응대'},
  {side:'공통 검토',items:'세그먼트 크기 / 제외 고객 / 서비스 복구 / 결과 해석 / 다음 실험'}
 ],
 collaboration:[
  {team:'리테일/현장',ask:'시간대별 수용량, 직원 배치, 혜택, 제품 재고, 품절 시 대체 가능 범위',decide:'대기 목표와 VIP 에스코트 기준, 재고 소진 시 고객 선택지',handoff:'정원표 / 인력표 / 서비스 복구 기준'},
  {team:'콘텐츠',ask:'공개 전후 메시지 범위, 엠바고, 필수 제품 정보, 시장별 표현',decide:'공개 티저와 VIP 선공개 정보의 차이, 후속 메시지 변형',handoff:'콘텐츠 캘린더 / 메시지 승인본 / 반응 태그'},
  {team:'디자인/공간',ask:'초청장, 현장 사인, 체험물, 촬영, 동의 화면의 제작 조건',decide:'고객 동선별 필요한 정보와 개인정보 노출 최소화',handoff:'제작물 목록 / 설치 위치 / 최종 승인 시점'}
 ],
 risks:[
  {trigger:'DIY 또는 예약 혜택 소진',response:'대체 샘플, 재예약 중 고객 선택',measure:'대체안 수락률, 7일 반응'},
  {trigger:'대기 목표 초과',response:'도착 분산, 예상 대기 고지, 담당자 호출',measure:'평균/최대 대기, 조기 퇴장'},
  {trigger:'VIP 정보 노출 위험',response:'실명 대신 현장 식별명, 최소 권한과 촬영 동의 분리',measure:'접근 기록, 동의 누락 0건'},
  {trigger:'마케팅 동의 거절',response:'체험과 기프트는 유지하고 후속 발송 제외',measure:'잘못된 발송 0건'},
  {trigger:'국가별 메시지 불일치',response:'HQ 핵심 문장 고정, 현지 문안, 규정은 Local 승인',measure:'승인 이력, 수정 건수'}
 ],
 experiments:[
  {question:'현장 발견감을 해치지 않으면서 참석을 높일 수 있는가?',a:'제품 상세 선공개',b:'세계관 티저만 공개',metric:'참석률, 체험 참여율, 상담 요청률'},
  {question:'DIY 마감 고객에게 어떤 회복안이 관계를 더 잘 이어가는가?',a:'대체 샘플 즉시 제공',b:'우선 재예약',metric:'수락률, 7일 반응, 30일 재방문'},
  {question:'후속 메시지는 무엇을 기억시켜야 하는가?',a:'제품 기능 중심',b:'고객이 고른 향, 사용 장면 중심',metric:'클릭, 상담, 예약'}
 ],
 effort:[
  '행사 운영에서 반복되는 일을 고객 선정, 현장 경험, 후속 CRM, 결과 확인으로 나눴습니다.',
  '다섯 브랜드의 공식 자료와 공개 방문 후기를 따로 읽고, 제가 직접 확인하지 못한 내용은 가정으로 표시했습니다.',
  '대기, 품절, 체험 마감 사례를 현장 기록 항목과 후속 업무에 반영했습니다.',
  '전환율이 좋아 보이게 분모를 바꾸지 않도록 초청부터 30일 후 행동까지 계산 기준을 먼저 정했습니다.',
  '장소와 날씨를 함께 볼 수 있도록 서울시 공공데이터와 Open-Meteo를 웹 화면에 연결했습니다.'
 ],
 pitch:'실제 VIP 행사를 운영한 경험은 없습니다. 그래서 브랜드 공식 자료를 읽고, 공개 후기에서 확인한 대기, 품절과 체험 마감 사례를 운영표의 확인 항목으로 옮겼습니다. 이 기준이 맞는지는 실제 고객 기준과 시장별 규정을 확인한 뒤, 작은 행사 한 건에서 선정, 체험, 동의와 후속 기록을 실제 데이터로 확인해야 알 수 있습니다.'
};

export function percent(current,base){return base?current/base*100:null;}
export function validateFinalPlan(plan=finalPlan){const invited=plan.segments.reduce((n,x)=>n+x.invited,0);if(invited!==plan.funnel[0].count)throw Error('세그먼트 초청 합계가 퍼널과 다릅니다.');for(let i=1;i<plan.funnel.length;i++)if(plan.funnel[i].count>plan.funnel[i-1].count)throw Error('퍼널 단계가 역전되었습니다.');if(!plan.status.includes('가상 데이터'))throw Error('가상 데이터 표시가 필요합니다.');return true;}

export function finalPortfolioReport(){validateFinalPlan();const p=finalPlan;return `# ${p.title}\n\n## ${p.subtitle}\n\n${p.status}\n\n${p.nameMeaning}\n\n${p.nameNotice}\n\n${p.oneLine}\n\n- 기간: ${p.period}\n- 장소: ${p.location}\n- 목표: ${p.objective}\n- 메시지: ${p.message}\n\n## 고객군\n\n${p.segments.map(x=>`### ${x.code} / ${x.name}\n- 가상 초청: ${x.invited}명\n- 선정 이유: ${x.reason}\n- 제공 가치: ${x.offer}\n- 다음 행동: ${x.next}`).join('\n\n')}\n\n## 팀마다 먼저 확인할 내용\n\n${p.collaboration.map(x=>`- ${x.team}: 먼저 확인 ${x.ask} / 함께 결정 ${x.decide} / 인계 ${x.handoff}`).join('\n')}\n\n## 가상 결과 퍼널\n\n${p.funnel.map(x=>`- ${x.stage}: ${x.count}명 / 분모 ${x.denominator} / ${x.rule}`).join('\n')}\n\n## 단계 사이 누락 관리\n\n${p.leaks.map(x=>`- ${x.between}: ${x.lost}명 / ${x.care} / 담당 ${x.owner}`).join('\n')}\n\n## KPI\n\n${p.kpis.map(x=>`- ${x.name}: ${x.value}% (가상 목표 ${x.target}%) / ${x.formula} / ${x.meaning}`).join('\n')}\n\n## 일정과 산출물\n\n${p.timeline.map(x=>`- ${x.when}: ${x.work} / ${x.output}`).join('\n')}\n\n## 본사와 현지팀의 역할\n\n${p.globalModel.map(x=>`- ${x.side}: ${x.items}`).join('\n')}\n\n## 위험 대응\n\n${p.risks.map(x=>`- ${x.trigger}: ${x.response} / ${x.measure}`).join('\n')}\n\n## 다음에 확인할 세 가지\n\n${p.experiments.map(x=>`- ${x.question} A=${x.a}, B=${x.b} / ${x.metric}`).join('\n')}\n\n## 제가 확인하고 정한 것\n\n${p.effort.map(x=>`- ${x}`).join('\n')}\n\n## 이 프로젝트를 만든 이유\n\n${p.pitch}\n\n## 읽기 전에\n\n모든 고객 수와 전환 결과는 계산 구조를 보여주기 위한 가상 데이터입니다. 실제 브랜드의 고객, 매출, 행사 성과가 아닙니다. 공개 방문 후기는 제한된 개인 표본이며 전체 고객 경험으로 일반화하지 않습니다.\n`;}


