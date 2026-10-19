import {eventStats,newGuest,transitionGuest,slots} from './event.js';

export const crmTabs=['CRM 전략','고객 신호','후속, 성과','대표 프로젝트','업종 변형','방문 후기 리서치'];
export const crmChannels=['미정','이메일','문자','카카오','전화','기타'];
export const consentStates=['미확인','동의','거절','해당 없음'];
export const crmOutcomes=['미측정','관심 확인','상담 요청','예약','구매','재방문','거절'];
export const metricNames=['초청 응답률','참석률','체험 완료율','마케팅 동의율','후속 완료율','관계 성과율'];

const metricDefaults=()=>metricNames.map(name=>({name,target:null,source:'',note:''}));
const guestDefaults={market:'KR',locale:'ko-KR',segment:'',channel:'미정',consent:'미확인',consentScope:'',preference:'',signal:'',crmOutcome:'미측정',crmValue:null,nextAction:''};

export function upgradeCRM(p){
 p.crm??={version:1,objective:'',primarySegment:'',lifecycle:'관심 → 초청 → 참석 → 체험 → 동의 → 후속 → 재방문',markets:'대한민국',valueExchange:'',channelPlan:'',hqRule:'',localRule:'',privacy:'',metrics:metricDefaults(),researchNote:''};
 for(const [key,value] of Object.entries({objective:'',primarySegment:'',lifecycle:'관심 → 초청 → 참석 → 체험 → 동의 → 후속 → 재방문',markets:'대한민국',valueExchange:'',channelPlan:'',hqRule:'',localRule:'',privacy:'',researchNote:''}))p.crm[key]??=value;
 if(!Array.isArray(p.crm.metrics))p.crm.metrics=metricDefaults();
 for(const name of metricNames)if(!p.crm.metrics.some(x=>x.name===name))p.crm.metrics.push({name,target:null,source:'',note:''});
 p.crm.metrics=p.crm.metrics.filter(x=>metricNames.includes(x.name)).map(x=>({name:x.name,target:x.target??null,source:x.source??'',note:x.note??''}));
 if(p.event?.guests)for(const g of p.event.guests)for(const [key,value] of Object.entries(guestDefaults))g[key]??=value;
 return p;
}

const arrived=g=>g.history.some(h=>h.to==='대기');
export function crmStats(p){
 upgradeCRM(p);const base=eventStats(p),guests=p.event.guests,visitors=guests.filter(arrived),opted=visitors.filter(g=>g.consent==='동의');
 const followed=opted.filter(g=>g.follow==='완료'&&g.followOwner.trim()&&g.followNote.trim()&&g.nextAction.trim());
 const positive=visitors.filter(g=>['상담 요청','예약','구매','재방문'].includes(g.crmOutcome));
 const sent=guests.filter(g=>g.history.some(h=>h.to==='초청')),profiled=sent.filter(g=>g.market.trim()&&g.locale.trim()&&g.segment.trim()&&g.channel!=='미정');
 const pct=(a,b)=>b?a/b*100:null;
 return {response:base.response,attendance:base.attendance,completion:base.completion,consent:pct(opted.length,visitors.length),follow:pct(followed.length,opted.length),outcome:pct(positive.length,visitors.length),profile:pct(profiled.length,sent.length),visitors:visitors.length,opted:opted.length,followed:followed.length,positive:positive.length,value:visitors.filter(g=>g.crmOutcome==='구매'&&Number.isFinite(g.crmValue)).reduce((n,g)=>n+g.crmValue,0)};
}

export function crmGaps(p){
 upgradeCRM(p);const result=[],add=(text,tab)=>result.push({text,tab}),c=p.crm;
 if(!c.objective.trim()||!c.primarySegment.trim()||!c.valueExchange.trim())add('CRM 목표, 핵심 고객군, 정보 제공의 대가가 되는 고객 혜택을 정의하세요.','CRM 전략');
 if(!c.hqRule.trim()||!c.localRule.trim())add('모든 행사에 공통인 기준과 행사마다 바꿀 범위를 나누세요.','CRM 전략');
 if(!c.privacy.trim())add('동의 목적, 채널, 보관, 철회 처리 기준을 적으세요.','CRM 전략');
 for(const g of p.event.guests){const label=g.alias||'이름 미입력 고객';if(g.history.some(h=>h.to==='초청')&&(!g.market.trim()||!g.locale.trim()||!g.segment.trim()||g.channel==='미정'))add(label+' / 시장, 언어, 고객군, 선호 채널이 미완성입니다.','고객 신호');if(arrived(g)&&g.consent==='미확인')add(label+' / 마케팅 동의 여부가 확인되지 않았습니다.','고객 신호');if(g.consent==='동의'&&!g.consentScope.trim())add(label+' / 동의한 채널과 목적의 범위가 비어 있습니다.','고객 신호');if(g.consent==='동의'&&g.follow==='완료'&&!g.nextAction.trim())add(label+' / 완료한 후속의 다음 관계 행동이 비어 있습니다.','후속, 성과');}
 return result;
}

export function seedFlagship(p){
 upgradeCRM(p);p.example=true;p.name='향 브랜드 신제품 프리뷰 (가상 데이터 기반 모의 운영)';p.brand='향 브랜드 (가상)';p.sector='뷰티, 향수';p.theme='차량용 향 신제품 경험과 DIY 대체 경험';p.purpose='초청 고객의 향 선호와 체험 신호를 동의 기반 후속 관계로 연결';p.audience='향 제품 재구매 고객, 자동차 라이프스타일 관심 고객, 크리에이터를 가정한 모의 세그먼트';p.message='차 안의 기억을 향으로 설계하는 프라이빗 경험';
 Object.assign(p.event,{type:'프라이빗 프리뷰',kind:'가상 연습',owner:'CRM 총괄',invitation:'가상 초청 문안 / 행사 목적, 예약 시간, 동반 조건, 혜택 수량, 마케팅 동의를 각각 확인합니다.'});
 Object.assign(p.crm,{objective:'VIP 프리뷰의 체험 신호를 동의 기반 상담, 구매, 재방문으로 연결',primarySegment:'향 제품 재구매 고객, 자동차 라이프스타일 관심 고객, 크리에이터',markets:'대한민국',valueExchange:'선호 향별 사용 팁, DIY 마감 시 대체 체험, 동의 고객의 재예약, 리필 안내',channelPlan:'초청 채널과 후속 채널을 분리 기록하고, 고객이 고른 채널로만 안내',hqRule:'브랜드 세계관, 핵심 메시지, 공통 고객 신호와 지표 정의',localRule:'예약 채널, 동의 문구, 혜택 재고와 발송 시간 조정',privacy:'행사 참석과 마케팅 동의를 분리하고 목적, 채널, 보관 기간, 철회 방법을 실제 운영 전에 법무 검토'});
 p.event.guests=[];const available=slots(p);for(let i=0;i<4;i++){const g=newGuest();Object.assign(g,{alias:'가상 고객 '+String.fromCharCode(65+i),reason:['향 제품 재구매 고객 가정','자동차 라이프스타일 관심 고객 가정','뷰티 콘텐츠 크리에이터 가정','휴면 VIP 재활성화 가정'][i],owner:'CRM 담당',party:1,slot:available[i]||'',market:'KR',locale:'ko-KR',segment:['재구매','라이프스타일','크리에이터','재활성화'][i],channel:['카카오','문자','이메일','전화'][i],preference:'확인 전 / 모의 입력',signal:'행사에서 확인할 항목',nextAction:'동의와 체험 결과에 따라 결정'});p.event.guests.push(g);transitionGuest(p,g.id,'초청');if(i<3)transitionGuest(p,g.id,'확정');}
 return p;
}

export function validateCRM(p){if(!p.crm)return;upgradeCRM(p);const c=p.crm,txt=(o,keys)=>{for(const k of keys)if(typeof o[k]!=='string'||o[k].length>20000)throw Error('CRM 기록 텍스트 오류');};if(c.version!==1)throw Error('지원하지 않는 CRM 버전입니다.');txt(c,['objective','primarySegment','lifecycle','markets','valueExchange','channelPlan','hqRule','localRule','privacy','researchNote']);if(!Array.isArray(c.metrics)||c.metrics.length!==metricNames.length)throw Error('CRM 지표 형식 오류');for(const m of c.metrics){txt(m,['name','source','note']);if(!metricNames.includes(m.name)||m.target!==null&&(!Number.isFinite(m.target)||m.target<0||m.target>100))throw Error('CRM 지표 값 오류');}for(const g of p.event.guests){txt(g,['market','locale','segment','channel','consent','consentScope','preference','signal','crmOutcome','nextAction']);if(!crmChannels.includes(g.channel)||!consentStates.includes(g.consent)||!crmOutcomes.includes(g.crmOutcome)||g.crmValue!==null&&(!Number.isFinite(g.crmValue)||g.crmValue<0))throw Error('고객 CRM 기록 오류');}}

export function crmReport(p){if(!p.crm)return '';const c=p.crm,s=crmStats(p),pct=v=>v===null?'미측정':v.toFixed(1)+'%';return `\n## CRM 전략\n목표: ${c.objective||'미작성'}\n핵심 고객군: ${c.primarySegment||'미작성'}\n운영 지역: ${c.markets||'미작성'}\n고객 혜택: ${c.valueExchange||'미작성'}\n채널: ${c.channelPlan||'미작성'}\n공통 기준: ${c.hqRule||'미작성'}\n행사별 조정: ${c.localRule||'미작성'}\n동의, 개인정보: ${c.privacy||'미작성'}\n\n### CRM 지표\n초청 응답률 ${pct(s.response)} / 참석률 ${pct(s.attendance)} / 체험 완료율 ${pct(s.completion)} / 동의율 ${pct(s.consent)} / 후속 완료율 ${pct(s.follow)} / 관계 성과율 ${pct(s.outcome)}\n${c.metrics.map(m=>`${m.name}: 목표 ${m.target===null?'미정':m.target+'%'} / 근거 ${m.source||'미작성'} / 메모 ${m.note||'미작성'}`).join('\n')}\n\n### 고객별 신호와 후속\n${p.event.guests.map(g=>`${g.alias||'식별명 미입력'} | ${g.market}/${g.locale} | ${g.segment||'고객군 미정'} | ${g.channel} | 동의 ${g.consent} ${g.consentScope} | 선호 ${g.preference} | 신호 ${g.signal} | 성과 ${g.crmOutcome} | 다음 행동 ${g.nextAction}`).join('\n')||'고객 없음'}\n\n실제 고객 성과가 아닌 사용자가 입력한 기록입니다. 공개 방문 후기는 개인 표본이며 전체 고객 경험으로 일반화하지 않습니다.\n`;}
