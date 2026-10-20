import {upgradeEvent} from './event.js';
import {upgradePreflight} from './preflight.js';
import {upgradeJourney} from './journey.js';
import {upgradeMembership} from './membership.js';
import {upgradeManual} from './manual.js';
import {upgradeCRM} from './crm.js';
export const stages=['방문 안내 확인','입장','직원 응대','제품 체험','후속 정보 확인'];
export const kinds=['가상 연습','본인 방문','집단 관찰'];
export function newVisit(){return {id:crypto.randomUUID(),store:'',date:'',kind:'본인 방문',purpose:'',context:'',steps:stages.map(()=>({fact:'',interpretation:'',need:'',wait:null,status:'미관찰'})),summary:''};}
export function newFlow(){return{id:crypto.randomUUID(),name:'새 흐름 기록',kind:'가상 연습',cohort:'',period:'',source:'',counts:stages.map(()=>null)};}
export function newZone(){return{id:crypto.randomUUID(),name:'',purpose:'',duration:5,capacity:5,staff:1,perStaff:5,role:'',support:'',handoff:''};}
export function upgrade(p){
 upgradeEvent(p);upgradeCRM(p);upgradePreflight(p);upgradeManual(p);upgradeMembership(p);upgradeJourney(p);
 if(p.care){for(const c of p.costs)c.link??='수동';for(const v of p.venues)v.costBasis??='미확인';return p;}
 p.care={version:1,standards:stages.map((name,i)=>({name,need:'',action:'',role:['초청, 콘텐츠 담당','접수, 대기 안내','제품 응대 담당','체험 진행 담당','후속 안내 담당'][i],support:'',escalation:'',measure:'',evidence:'',target:null})),visits:[],flows:[],decisions:[],zones:[],rules:{rain:60,hot:30,cold:5,wind:10,reason:'초기 운영 가정이며 사용자가 행사에 맞춰 수정'},manager:{briefing:'',training:'',breaks:'',handoff:'',review:''}};
 for(const c of p.costs)c.link??='수동';for(const v of p.venues)v.costBasis??='미확인';return p;
}
function days(a,b){if(!/^\d{4}-\d{2}-\d{2}$/.test(a)||!/^\d{4}-\d{2}-\d{2}$/.test(b))return null;if(!Number.isFinite(Date.parse(a))||!Number.isFinite(Date.parse(b))||new Date(a).toISOString().slice(0,10)!==a||new Date(b).toISOString().slice(0,10)!==b)return null;const n=(Date.parse(b)-Date.parse(a))/86400000+1;return Number.isInteger(n)&&n>0&&n<=366?n:null;}
export function eventDays(p){return p.care?days(p.date,p.endDate):1;}
export function costLine(p,c){const link=c.link||'수동';if(link==='수동')return {...c};
 if(link==='체험 인력, 시간'){const d=days(p.date,p.endDate);return {...c,qty:d===null?null:p.ops.staff*p.ops.hours*d,basis:'체험 담당 인원 × 운영시간 × 행사일수, 시간당 단가',missingReason:d===null?'행사 시작일, 종료일 확인 필요':''};}
 if(link==='선정 공간 대관'){const v=p.venues.find(x=>x.id===p.recommended);if(!v||v.cost===null||v.cost===''||!['일','행사 전체'].includes(v.costBasis))return {...c,unit:null,qty:null,basis:'선정 공간의 비용, 적용 단위 확인 필요'};const d=v.costBasis==='일'?days(p.installDate||p.date,p.strikeDate||p.endDate):1;return {...c,unit:v.cost,qty:d,basis:v.costBasis==='일'?'일 단가 × 설치~철거 포함 일수':'확인된 행사 전체 비용 × 1',source:v.source||c.source};}
 throw Error('지원하지 않는 비용 연결입니다.');}
export function flowSummary(flow){
 const c=flow.counts;if(!Array.isArray(c)||c.length!==5||c.some(x=>x!==null&&(!Number.isInteger(x)||x<0||x>1000000)))return{error:'각 단계 인원은 0 이상의 정수로 입력해 주세요.'};
 if(!flow.cohort.trim()||!flow.period.trim())return{error:'같은 대상 집단의 정의와 관찰 기간을 먼저 적어 주세요.'};
 if(flow.kind==='본인 방문'&&c.some(x=>x!==null&&x>1))return{error:'본인 방문 기록은 각 단계 0명 또는 1명입니다. 반복 방문을 여러 고객으로 세지 않습니다.'};
 let previous=null;for(const n of c){if(n===null)continue;if(previous!==null&&n>previous)return{error:'뒤 단계 인원이 앞 단계보다 많습니다. 같은 집단을 순서대로 관찰한 값인지 확인해 주세요.'};previous=n;}
 const rows=c.map((n,i)=>({name:stages[i],count:n,drop:i&&n!==null&&c[i-1]!==null?c[i-1]-n:null,rate:i&&n!==null&&c[i-1]>0?n/c[i-1]*100:null}));
 const comparable=rows.slice(1).filter(r=>r.drop!==null);const largest=comparable.length?comparable.reduce((a,b)=>a.drop>=b.drop?a:b):null;
 return{rows,largest:largest?.drop>0?largest:null,qualitative:flow.kind==='본인 방문',incomplete:c.some(x=>x===null),note:flow.kind==='집단 관찰'?'같은 집단의 연속 관찰이라는 사용자 입력 기준입니다. 감소의 원인은 별도 관찰이 필요합니다.':flow.kind==='본인 방문'?'본인의 경험 1건입니다. 고객 전체의 전환율로 일반화하지 않습니다.':'가상 연습 수치입니다. 실제 고객 반응이나 성과가 아닙니다.'};
}
export function zoneSummary(zones){if(!zones.length)return{error:'구역을 추가하면 전체 체험 시간과 처리 한도를 검토할 수 있습니다.'};
 for(const z of zones)if(!z.name.trim()||!Number.isInteger(z.duration)||z.duration<1||z.duration>180||!Number.isInteger(z.capacity)||z.capacity<0||z.capacity>500||!Number.isInteger(z.staff)||z.staff<0||z.staff>100||!Number.isInteger(z.perStaff)||z.perStaff<0||z.perStaff>100)return{error:'구역 이름과 체험 시간, 정원, 인력을 확인해 주세요.'};
 const rows=zones.map(z=>({...z,effective:Math.min(z.capacity,z.staff*z.perStaff),hourly:Math.min(z.capacity,z.staff*z.perStaff)*60/z.duration}));const bottleneck=rows.reduce((a,b)=>a.hourly<=b.hourly?a:b);return{rows,duration:rows.reduce((a,z)=>a+z.duration,0),staff:rows.reduce((a,z)=>a+z.staff,0),bottleneck,hourly:bottleneck.hourly};
}
export function weatherAssessment(w,p){
 if(!w||w.state!=='ok')return {state:'unknown',message:'날씨를 조회하면 운영 기준과 비교합니다.'};
 if(!p.date)return {state:'unknown',message:'행사 시작일을 입력해 주세요.'};
 if(!Number.isFinite(Date.parse(w.retrievedAt))||Date.now()-Date.parse(w.retrievedAt)>3600000)return{state:'unknown',message:'조회한 지 1시간 이상 지난 예보입니다. 다시 조회해 주세요.'};
 const rules=p.care.rules;if(['rain','hot','cold','wind'].some(k=>!Number.isFinite(rules[k]))||rules.rain<0||rules.rain>100||rules.cold>=rules.hot||rules.wind<0)return{state:'unknown',message:'날씨 기준을 확인해 주세요. 강수 0~100%, 저온 < 고온, 풍속 0 이상이어야 합니다.'};
 const rows=w.hours.filter(h=>h.time.startsWith(p.date)&&+h.time.slice(11,13)>=p.ops.start&&+h.time.slice(11,13)<p.ops.start+p.ops.hours);if(!rows.length)return{state:'unknown',message:'행사 시간대 예보가 없습니다. 가상 날씨 조건으로만 대응안을 검토할 수 있습니다.'};
 const hits=[];if(rows.some(h=>h.rain!==null&&h.rain>=rules.rain))hits.push({type:'우천',action:p.experience.rain||'우천 대기, 우산 보관, 입장 간격 대응안을 작성해 주세요.'});if(rows.some(h=>h.temp!==null&&(h.temp>=rules.hot||h.temp<=rules.cold)))hits.push({type:'더위, 추위',action:p.experience.heat||'대기 축소와 휴식, 온열 대응안을 작성해 주세요.'});if(rows.some(h=>h.wind!==null&&h.wind>=rules.wind))hits.push({type:'강풍',action:p.experience.wind||'야외 연출, 설치물을 현장 담당자와 재검토해 주세요.'});
 return{state:'ok',hits,incomplete:rows.length!==p.ops.hours||rows.some(h=>h.temp===null||h.wind===null||h.rain===null),message:'사용자 운영 기준에 따른 준비 안내입니다. 개최 안전이나 실제 수요를 판정하지 않습니다.'};
}
export function validateCare(p){if(!p.care)return;const c=p.care;if(c.version!==1)throw Error('지원하지 않는 고객 케어 버전입니다.');
 const strings=(o,keys)=>{if(!o||keys.some(k=>typeof o[k]!=='string'||o[k].length>20000))throw Error('고객 케어 텍스트 형식을 확인해 주세요.');};
 const array=(v,max)=>{if(!Array.isArray(v)||v.length>max)throw Error('고객 케어 목록 형식 오류');};const id=o=>{if(!/^[a-f0-9-]{36}$/.test(o.id))throw Error('기록 번호 오류');};
 array(c.standards,5);if(c.standards.length!==5)throw Error('케어 단계가 부족합니다.');for(const s of c.standards){strings(s,['name','need','action','role','support','escalation','measure','evidence']);if(s.target!==null&&(!Number.isFinite(s.target)||s.target<0))throw Error('응대 목표 시간 오류');}
 array(c.visits,100);for(const v of c.visits){id(v);strings(v,['store','date','kind','purpose','context','summary']);if(!kinds.includes(v.kind))throw Error('조사 유형 오류');array(v.steps,5);if(v.steps.length!==5)throw Error('관찰 단계 부족');for(const s of v.steps){strings(s,['fact','interpretation','need','status']);if(s.wait!==null&&(!Number.isFinite(s.wait)||s.wait<0))throw Error('대기시간 형식 오류');}}
 array(c.flows,100);for(const f of c.flows){id(f);strings(f,['name','kind','cohort','period','source']);if(!kinds.includes(f.kind))throw Error('흐름 유형 오류');array(f.counts,5);if(f.counts.length!==5||f.counts.some(n=>n!==null&&(!Number.isFinite(n)||n<0)))throw Error('흐름 인원 형식 오류');}
 array(c.decisions,100);for(const d of c.decisions){id(d);strings(d,['stage','evidenceId','fact','hypothesis','action','owner','metric','guardrail','result','status']);if(d.evidenceId&&!c.visits.some(v=>v.id===d.evidenceId)&&!c.flows.some(f=>f.id===d.evidenceId))throw Error('개선안이 참조하는 관찰이 없습니다.');}
 array(c.zones,30);for(const z of c.zones){id(z);strings(z,['name','purpose','role','support','handoff']);for(const k of ['duration','capacity','staff','perStaff'])if(!Number.isFinite(z[k])||z[k]<0)throw Error('구역 수치 오류');}
 strings(c.manager,['briefing','training','breaks','handoff','review']);strings(c.rules,['reason']);for(const k of ['rain','hot','cold','wind'])if(c.rules[k]!==null&&!Number.isFinite(c.rules[k]))throw Error('날씨 기준 형식 오류');
 for(const cost of p.costs)if(cost.link&&!['수동','체험 인력, 시간','선정 공간 대관'].includes(cost.link))throw Error('비용 연결 형식 오류');
}
export function careReport(p){if(!p.care)return '';const c=p.care;return `\n## 고객 케어 기준\n${c.standards.map(s=>`### ${s.name}\n고객 필요: ${s.need||'미작성'}\n직원 행동: ${s.action||'미작성'}\n담당: ${s.role}\n뒤에서 필요한 지원: ${s.support||'미작성'}\n응대 목표: ${s.target==null?'미정':s.target+'분'}, 확인 방법: ${s.measure||'미작성'}\n예외 인계: ${s.escalation||'미작성'}\n근거: ${s.evidence||'미작성'}`).join('\n')}\n\n## 직접 방문 관찰\n${c.visits.map(v=>`### ${v.store||'매장 미입력'} (${v.date||'날짜 미입력'}, ${v.kind})\n질문: ${v.purpose}\n상황: ${v.context}\n${v.steps.map((s,i)=>`${stages[i]} (${s.status})\n관찰 사실: ${s.fact||'미관찰'}, 대기 ${s.wait==null?'미측정':s.wait+'분'}\n내 해석: ${s.interpretation||'미작성'}\n필요한 케어: ${s.need||'미작성'}`).join('\n')}\n다음 확인: ${v.summary}`).join('\n')||'실제 방문 기록 없음'}\n\n## 단계별 방문 흐름\n${c.flows.map(f=>{const a=flowSummary(f);return `### ${f.name} (${f.kind})\n대상: ${f.cohort||'미정'}, 기간: ${f.period||'미정'}, 근거: ${f.source||'미확인'}\n${stages.map((s,i)=>s+': '+(f.counts[i]??'미측정')).join(', ')}\n${a.error||a.note}`;}).join('\n')||'수치 기록 없음'}\n\n## 관찰에 연결한 개선안\n${c.decisions.map(d=>`### ${d.stage} (${d.status})\n근거 ID: ${d.evidenceId||'미연결'}\n확인 사실: ${d.fact}\n원인 가설: ${d.hypothesis}\n바꿀 응대: ${d.action}\n담당: ${d.owner}\n검증 지표: ${d.metric}\n함께 지킬 조건: ${d.guardrail}\n검증 결과: ${d.result||'미검증'}`).join('\n')||'개선안 없음'}\n\n## 구역과 직원 운영\n${c.zones.map(z=>`${z.name}: ${z.duration}분, 정원 ${z.capacity}명, 직원 ${z.staff}명, 직원당 ${z.perStaff}명\n목적: ${z.purpose||'미작성'}, 담당: ${z.role||'미정'}, 지원: ${z.support||'미작성'}, 다음 인계: ${z.handoff||'미작성'}`).join('\n')||'구역 미작성'}\n${Object.entries(c.manager).map(([k,v])=>({briefing:'시작 전 브리핑',training:'교육, 제품 안내',breaks:'휴식, 교대',handoff:'책임자 인계',review:'운영 후 회고'}[k])+': '+(v||'미작성')).join('\n')}\n\n## 날씨 대응 기준\n강수확률 ${c.rules.rain}% 이상, 기온 ${c.rules.hot}℃ 이상 또는 ${c.rules.cold}℃ 이하, 풍속 ${c.rules.wind}m/s 이상\n설정 이유: ${c.rules.reason}\n사용자 설정 운영 가정이며 공식 안전 기준이 아님. 개인 방문 관찰을 전체 고객 성과로 일반화하지 않음.\n`;}
