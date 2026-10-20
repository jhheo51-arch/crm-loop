import {validateEvent,eventReport} from './event.js';
import {validateCRM,crmReport} from './crm.js';
import {validatePreflight,preflightReport} from './preflight.js';
import {validateJourney,journeyReport} from './journey.js';
import {validateMembership,membershipReport} from './membership.js';
import {validateManual,manualReport} from './manual.js';
import {costLine,upgrade,validateCare,careReport,eventDays} from './care.js';
export const MODEL='queue-1.0';
export const criteria=['브랜드, 체험 적합성','목표 고객 접점','접근성과 주변 환경','현장 운영 적합성','비용과 일정'];
export const conditions=['일정, 사용 허가','예산, 비용','설비, 반입','접근, 대기 동선','공식 수용 한도'];
export function venue(name='',address='',area='성수카페거리') {return {id:crypto.randomUUID(),name,address,area,type:'외부 공간',facts:'',source:'',checked:'',period:'',conditions:conditions.map(()=> '미확인'),scores:criteria.map(()=>null),evidence:criteria.map(()=>''),capacity:null,cost:null};}
export function initial(example=true){
 const v=venue('검토 공간 A'),w=venue('검토 공간 B');v.facts=w.facts='가상 입력 양식입니다. 실제 주소와 조건을 직접 확인해 주세요.';
 return {schema:1,id:crypto.randomUUID(),example,name:example?'새 분야별 팝업 기획':'새 팝업 프로젝트',brand:'',sector:'',theme:'',purpose:example?'브랜드 경험과 제품 체험':'',audience:'',message:'',date:'',endDate:'',installDate:'',strikeDate:'',budget:example?30000000:null,weights:[25,20,15,20,20],weightReason:'초기 PRD 기준',weightLocked:false,venues:example?[v,w]:[],recommended:'',backup:'',decision:'',experience:{before:'',during:'',after:'',vip:'',invitation:'',rain:'',heat:'',wind:''},schedule:[],ops:{hours:4,start:11,duration:15,capacity:20,staff:4,perStaff:5,queueCap:30,mode:'혼합',vipSlots:4,reservedPerSlot:5,abandon:0,arrivals:example?'10, 15, 20, 25, 30, 40, 40, 30, 25, 20, 20, 15, 15, 10, 10, 5':'0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0',factor:1,weather:'기준',weatherReason:'',scenarioName:'기준안'},costs:['대관','설치','철거','인력','장비','콘텐츠','운송','기타'].map(name=>({name,unit:null,qty:1,basis:'행사 전체, 건 단위',kind:'가정',tax:'미확인',source:''})),reserve:10,snapshots:[],updatedAt:null};
}
function int(n,min,max,label){if(!Number.isInteger(n)||n<min||n>max)throw Error(`${label}: ${min}~${max} 정수를 입력해 주세요.`);return n;}
export function simulate(o){
 const minutes=int(+o.hours,1,12,'운영시간')*60,duration=int(+o.duration,1,180,'체험시간'),staff=int(+o.staff,0,100,'직원 수');
 const cap=Math.min(int(+o.capacity,0,500,'체험 정원'),staff*int(+o.perStaff,0,100,'직원당 정원'));
 const queueCap=int(+o.queueCap,0,5000,'대기 정원');int(+o.start,0,23,'시작 시각');if(+o.start + +o.hours>24)throw Error('운영은 같은 날 24시 이내로 설정해 주세요.');
 const abandon=int(+o.abandon,0,720,'최대 대기시간'),vipSlots=int(+o.vipSlots,0,minutes/15,'VIP 구간'),reserved=int(+o.reservedPerSlot,0,1000,'슬롯 예약 정원');
 if(!['혼합','자유','예약'].includes(o.mode))throw Error('입장 방식을 확인해 주세요.');
 const raw=String(o.arrivals).split(',').map(x=>x.trim());if(raw.length!==minutes/15||raw.some(x=>!/^\d+$/.test(x)))throw Error(`15분별 도착 인원 ${minutes/15}개를 쉼표로 구분해 주세요.`);
 if(!Number.isFinite(+o.factor)||+o.factor<0||+o.factor>3)throw Error('방문량 배수는 0~3이어야 합니다.');
 const counts=raw.map(x=>Math.round(int(+x,0,1000,'구간 도착 인원')*+o.factor));if(counts.reduce((a,b)=>a+b,0)>20000)throw Error('모의계산은 하루 20,000명 이내로 설정해 주세요.');
 let waiting=[],active=[],completed=0,entered=0,arrived=0,left=0,maxQueue=0,maxActive=0,maxStay=0,exceeded=0;const waits=[],timeline=[];let slotAdmissions=0;
 for(let t=0;t<minutes;t++){
  completed+=active.filter(x=>x<=t).length;active=active.filter(x=>x>t);const slot=Math.floor(t/15),local=t%15;if(local===0)slotAdmissions=0;
  const count=Math.floor(counts[slot]/15)+(local<counts[slot]%15?1:0);
  for(let j=0;j<count;j++){const index=Math.floor(counts[slot]/15)*local+Math.min(local,counts[slot]%15)+j;waiting.push({at:t,reserved:index<reserved,slot});}arrived+=count;
  if(abandon){const keep=waiting.filter(x=>t-x.at<abandon);left+=waiting.length-keep.length;waiting=keep;}
  const onlyReserved=o.mode==='예약'||(o.mode==='혼합'&&slot<vipSlots);
  let eligible=waiting.filter(x=>!onlyReserved||(x.reserved&&x.slot===slot));
  if(o.mode==='혼합')eligible.sort((a,b)=>Number(b.reserved&&b.slot===slot)-Number(a.reserved&&a.slot===slot)||a.at-b.at);
  const room=Math.max(0,Math.min(cap-active.length,onlyReserved?reserved-slotAdmissions:Infinity));const entering=eligible.slice(0,room),selected=new Set(entering);
  for(const person of entering){waits.push(t-person.at);active.push(t+duration);}waiting=waiting.filter(x=>!selected.has(x));entered+=entering.length;slotAdmissions+=entering.length;
  maxQueue=Math.max(maxQueue,waiting.length);maxActive=Math.max(maxActive,active.length);maxStay=Math.max(maxStay,waiting.length+active.length);if(waiting.length>queueCap)exceeded++;
  if(t%15===14)timeline.push({time:`${String(+o.start+Math.floor((t+1)/60)).padStart(2,'0')}:${String((t+1)%60).padStart(2,'0')}`,waiting:waiting.length,active:active.length,completed,arrived});
 }
 completed+=active.filter(x=>x<=minutes).length;active=active.filter(x=>x>minutes);
 if(timeline.length){timeline.at(-1).completed=completed;timeline.at(-1).active=active.length;}
 return {model:MODEL,arrived,entered,completed,left,unentered:waiting.length,unfinished:active.length,maxQueue,maxActive,maxStay,exceeded,avgWait:waits.length?waits.reduce((a,b)=>a+b,0)/waits.length:null,maxWait:waits.length?Math.max(...waits):null,remainingWait:waiting.length?Math.max(...waiting.map(x=>minutes-x.at)):0,timeline,balanced:arrived===entered+left+waiting.length&&entered===completed+active.length};
}
export function score(v,weights){if(weights.length!==5||weights.some(x=>!Number.isFinite(x)||x<0)||Math.abs(weights.reduce((a,b)=>a+b,0)-100)>.001)throw Error('가중치 합계를 100%로 맞춰 주세요.');let lo=0,hi=0;for(let i=0;i<5;i++){const s=v.scores[i];if(s===null){hi+=weights[i];}else{if(!Number.isFinite(s)||s<0||s>5)throw Error('평가는 0~5점입니다.');lo+=s/5*weights[i];hi+=s/5*weights[i];}}return{lo,hi,status:v.conditions.includes('미충족')?'제외':v.conditions.includes('미확인')||v.scores.some(x=>x===null)||v.evidence.some(x=>!x.trim())?'조건부':'조건 확인'};}
export function budget(p,completed=0){let subtotal=0,missing=0,taxUnknown=0;for(const raw of p.costs){const c=costLine(p,raw);if(c.qty===null||c.unit===null||c.unit===''){missing++;continue;}if(!Number.isFinite(+c.unit)||+c.unit<0||!Number.isFinite(+c.qty)||+c.qty<0)throw Error('비용과 수량은 0 이상의 숫자입니다.');subtotal+=+c.unit*+c.qty;if(c.tax!=='포함')taxUnknown++;}if(!Number.isFinite(+p.reserve)||+p.reserve<0||+p.reserve>100)throw Error('예비비율은 0~100%입니다.');const reserve=subtotal*+p.reserve/100,total=subtotal+reserve;return{subtotal,reserve,total,missing,taxUnknown,provisional:missing>0||taxUnknown>0,completionDays:eventDays(p),perCompleted:completed>0&&missing<p.costs.length&&eventDays(p)!==null?total/(completed*eventDays(p)):null};}
export function validate(p,{draft=false}={}){
 if(!p||p.schema!==1||typeof p.id!=='string'||!/^[a-f0-9-]{36}$/.test(p.id)||typeof p.name!=='string'||p.name.length>300||!Array.isArray(p.venues)||p.venues.length>20||!Array.isArray(p.snapshots)||p.snapshots.length>30)throw Error('지원하는 프로젝트 백업 형식이 아닙니다.');
 for(const k of ['brand','theme','purpose','audience','message','date','endDate','installDate','strikeDate','decision','recommended','backup','weightReason'])if(typeof p[k]!=='string')throw Error('필수 프로젝트 항목이 없습니다.');
 if(p.budget!==null&&(!Number.isFinite(p.budget)||p.budget<0))throw Error('예산이 올바르지 않습니다.');
 if(!Array.isArray(p.weights)||p.weights.length!==5||p.weights.some(x=>!Number.isFinite(x)))throw Error('가중치 형식 오류');
 for(const v of p.venues){if(!v||typeof v.id!=='string'||!/^[a-f0-9-]{36}$/.test(v.id)||!Array.isArray(v.conditions)||v.conditions.length!==5||v.conditions.some(x=>!['충족','미충족','미확인'].includes(x))||!Array.isArray(v.scores)||v.scores.length!==5||v.scores.some(x=>x!==null&&(!Number.isFinite(x)||x<0||x>5))||!Array.isArray(v.evidence)||v.evidence.length!==5||v.evidence.some(x=>typeof x!=='string'))throw Error('공간 정보가 올바르지 않습니다.');for(const k of ['name','address','area','type','facts','source','checked','period'])if(typeof v[k]!=='string')throw Error('공간 필드 오류');if(!draft)score(v,p.weights);}
 if(new Set(p.venues.map(v=>v.id)).size!==p.venues.length)throw Error('공간 번호 중복');
 if(!p.experience||Object.values(p.experience).some(x=>typeof x!=='string')||!Array.isArray(p.schedule)||p.schedule.length>100||!Array.isArray(p.costs)||p.costs.length>40)throw Error('운영 정보 형식 오류');
 for(const k of ['before','during','after','vip','invitation','rain','heat','wind'])if(typeof p.experience[k]!=='string')throw Error('경험 정보 누락');
 for(const c of p.costs)if(!c||['name','basis','kind','tax','source'].some(k=>typeof c[k]!=='string'))throw Error('비용 정보 오류');
 for(const r of p.schedule)if(!r||['name','start','end','role'].some(k=>typeof r[k]!=='string'))throw Error('일정 정보 오류');
 for(const s of p.snapshots)if(!s||typeof s.name!=='string'||typeof s.at!=='string'||typeof s.report!=='string'||!s.result||!Number.isFinite(s.result.completed)||!Number.isFinite(s.result.maxQueue)||!Number.isFinite(s.total))throw Error('비교 버전 오류');
 if(!p.ops||typeof p.ops.arrivals!=='string'||['scenarioName','weather','weatherReason','mode'].some(k=>typeof p.ops[k]!=='string')||['hours','start','duration','capacity','staff','perStaff','queueCap','vipSlots','reservedPerSlot','abandon','factor'].some(k=>!Number.isFinite(p.ops[k])))throw Error('계산 입력 오류');if(!draft){simulate(p.ops);budget(p);}validateCare(p);validateManual(p);validateMembership(p);validateJourney(p);validatePreflight(p);validateEvent(p);validateCRM(p);return upgrade(p);
}
function baseReport(p){const r=simulate(p.ops),b=budget(p,r.completed),v=p.venues.find(x=>x.id===p.recommended),backup=p.venues.find(x=>x.id===p.backup);return `# ${p.name}\n\n분야별 팝업 개인 기획(공식 행사 아님). 실제 행사 운영 및 고객 성과 미검증\n\n## 개요\n- 분야: ${p.sector||'미선택'}\n- 주제: ${p.theme||'미정'}\n- 목적: ${p.purpose||'미정'}\n- 고객 가설: ${p.audience||'미정'}\n- 메시지: ${p.message||'미정'}\n- 행사일: ${p.date||'미정'} ~ ${p.endDate||'미정'}\n- 설치일: ${p.installDate||'미정'}\n- 철거일: ${p.strikeDate||'미정'}\n- 예산: ${p.budget??'미정'}원\n\n## 장소 비교\n가중치: ${p.weights.join(', ')}. ${p.weightReason}\n${p.venues.map(x=>{const s=score(x,p.weights);return `### ${x.name}\n${x.address}\n유형: ${x.type}\n상태: ${s.status}, 점수 범위 ${s.lo.toFixed(1)}~${s.hi.toFixed(1)}\n필수 조건\n${conditions.map((c,i)=>'- '+c+': '+x.conditions[i]).join('\n')}\n평가 근거\n${criteria.map((c,i)=>'- '+c+': '+(x.scores[i]??'미확인')+' (근거: '+(x.evidence[i]||'미입력')+')').join('\n')}\n출처: ${x.source||'미등록'}, 확인일: ${x.checked||'미확인'}, 대상기간: ${x.period||'미확인'}\n${x.facts}\n`;}).join('\n')}\n추천: ${v?.name||'미선정'} (${v?score(v,p.weights).status:'미정'})\n예비: ${backup?.name||'미선정'}\n선택 이유, 확인 과제: ${p.decision||'미작성'}\n\n## 경험과 초청\n${Object.entries(p.experience).map(([k,val])=>({before:'방문 전',during:'현장',after:'방문 후',vip:'VIP 기준, 슬롯',invitation:'초청문',rain:'우천',heat:'더위, 추위',wind:'강풍'}[k])+': '+(val||'미작성')).join('\n\n')}\n\n## 운영 일정\n${p.schedule.map(x=>`${x.start}~${x.end} ${x.name} (${x.role})`).join('\n')||'미작성'}\n\n## 운영 모의검증\n모델 ${MODEL}, 대표 체험 1개 기준. 모든 인원은 가정\n입력: ${JSON.stringify(p.ops)}\n도착 ${r.arrived}, 입장 ${r.entered}, 완료 ${r.completed}, 이탈 ${r.left}, 미입장 ${r.unentered}, 미완료 ${r.unfinished}\n입장자 평균 대기 ${r.avgWait?.toFixed(1)??'계산 불가'}분, 최대 대기 ${r.maxWait??'계산 불가'}분, 최대 대기 인원 ${r.maxQueue}명\n남은 대기자의 최대 경과시간 ${r.remainingWait}분, 최대 모델상 체류 ${r.maxStay}명\n대기 정원 초과 ${r.exceeded}분, 인원 검산 ${r.balanced?'통과':'실패'}\n\n## 예산\n${p.costs.map(raw=>{const c=costLine(p,raw);return `${c.name}: ${c.unit??'미입력'} × ${c.qty} (${c.basis}), ${c.kind}, 세금과 수수료 ${c.tax}, ${c.source||'출처 미등록'}`;}).join('\n')}\n예비비 ${p.reserve}%: ${b.reserve}원\n${b.missing===p.costs.length?'비용 미입력':(b.provisional?'잠정 합계':'합계')+' '+b.total+'원'}. 대표일을 행사일수(${b.completionDays??'미정'})만큼 반복한 가정의 완료 1건당 ${b.perCompleted===null?'계산 불가':b.perCompleted+'원'}\n\n## 한계\n공간의 현재 사용 가능 여부는 별도 확인 필요. 지역 현황은 특정 공간의 방문 수요가 아님. 날씨는 조회 시점 예보 범위에만 유효. 외부 실시간 원자료는 이 문서에 저장하지 않음. 가상 결과는 실제 구매, 브랜드 선호, 매출 성과가 아님. 직원, 동반인과 복잡한 이동은 체류 계산에서 제외.\n`;}

export function report(p){return baseReport(p)+crmReport(p)+careReport(p)+manualReport(p)+membershipReport(p)+journeyReport(p)+preflightReport(p,simulate)+eventReport(p);}
