export const cases=[
 {id:'custom',name:'직접 조사한 사례',fact:'공식 출처에서 확인한 사실을 아래에 입력하세요.',url:''},
 {id:'margiela',name:'메종 마르지엘라 협업 팝업',fact:'사용자 제공 리서치: 하우스 도산, 2023.2.28~5.14. 아래 공식 페이지에서 재확인할 사례입니다. 초청 인원, 직원 수, 대기시간은 공개 이력에서 확인되지 않았습니다.',url:'https://www.gentlemonster.com/legacy/story/ko/maison-margiela-popup-2023.html'},
 {id:'salon',name:'젠틀살롱 팝업',fact:'사용자 제공 리서치: 하우스 도산, 2024.5.1~7.13. 아래 공식 페이지에서 재확인할 사례입니다. 이 서비스의 예약, 인력 조건은 해당 행사의 실제 운영값이 아닙니다.',url:'https://www.gentlemonster.com/legacy/story/ko/jentle-salon-popup.html'}
];
export const checks=['공간 사용 승인, 수용 한도','초청 대상, 참석 확인 절차','접수, 대기, 체험 동선','역할 분담, 직원 교육','제품, 장비, 안내물 준비','우천, 결원 대응과 연락 체계','리허설, 입장 중단 기준','종료, 후속 안내, 정산'];
export function upgradePreflight(p){p.preflight??={version:1,caseId:'custom',facts:'',unknowns:'초청 인원, 실제 직원 수, 예산, 대기시간 미확인',assumptions:'',stress:'직원 결원',missing:1,rainQueue:10,relief:1,shortDuration:10,hourly:null,targetWait:10,reason:'',chosen:'',signature:'',checklist:checks.map(name=>({name,status:'미확인',owner:'',evidence:''})),runs:[]};return p;}
export function readiness(p){const rows=p.preflight.checklist;const done=rows.filter(x=>x.status==='완료'&&x.owner.trim()&&x.evidence.trim()).length;return {done,total:rows.length,rate:rows.length?done/rows.length*100:null,missing:rows.filter(x=>x.status!=='완료'||!x.owner.trim()||!x.evidence.trim())};}
export function signature(p){const f=p.preflight;return JSON.stringify([p.ops,f.stress,f.missing,f.rainQueue,f.relief,f.shortDuration,f.hourly,f.targetWait]);}
function number(n,min,max,label){if(!Number.isInteger(n)||n<min||n>max)throw Error(label+' 입력 범위를 확인해 주세요.');return n;}
export function comparePlans(p,simulate){const f=p.preflight,base=structuredClone(p.ops);simulate(base);number(f.missing,0,100,'결원 인원');number(f.rainQueue,0,5000,'우천 대기 정원');number(f.relief,0,100,'보강 인원');number(f.shortDuration,1,180,'조정 체험시간');number(f.targetWait,0,720,'평균 대기 목표');if(f.hourly!==null&&(!Number.isFinite(f.hourly)||f.hourly<0))throw Error('시간당 인력 단가를 확인해 주세요.');
 const stressed=structuredClone(base),counts=String(base.arrivals).split(',').map(Number);
 if(f.stress==='직원 결원')stressed.staff=Math.max(0,base.staff-f.missing);
 else if(f.stress==='우천 대기 축소')stressed.queueCap=f.rainQueue;
 else if(f.stress==='도착 집중'){const next=counts.map(()=>0);counts.forEach((n,i)=>next[Math.floor(i/2)*2]+=n);stressed.arrivals=next.join(', ');}
 else throw Error('돌발 상황을 선택해 주세요.');
 const spread=structuredClone(stressed),total=counts.reduce((a,b)=>a+b,0);spread.arrivals=counts.map((_,i)=>Math.floor(total/counts.length)+(i<total%counts.length?1:0)).join(', ');
 const defs=[['base','기준안',base,'현재 운영 입력'],['stress','돌발 상황',stressed,f.stress],['staff','인력 보강',{...stressed,staff:Math.min(100,stressed.staff+f.relief)},'돌발 상황에 지원 인력 추가'],['spread','도착 분산',spread,'동일 원시 도착 총원을 15분 구간에 균등 배분, 고객의 시간 변경 수락 가정'],['short','체험시간 조정',{...stressed,duration:f.shortDuration},'제품 설명, 체험 품질 유지 가능 여부 별도 확인']];
 return defs.map(([key,name,ops,condition])=>{const r=simulate(ops);return {key,name,ops,condition,r,completion:r.arrived?r.completed/r.arrived*100:null,abandonment:r.arrived?r.left/r.arrived*100:null,laborDelta:f.hourly===null?null:(ops.staff-base.staff)*base.hours*f.hourly,staffHours:ops.staff*ops.hours,meets:r.avgWait===null?null:r.avgWait<=f.targetWait};});
}
export function validatePreflight(p){if(!p.preflight)return;const f=p.preflight;const text=(o,keys)=>{for(const k of keys)if(typeof o[k]!=='string'||o[k].length>20000)throw Error('운영 점검 텍스트 형식 오류');};text(f,['caseId','facts','unknowns','assumptions','stress','reason','chosen','signature']);if(f.version!==1||!cases.some(c=>c.id===f.caseId)||!['직원 결원','우천 대기 축소','도착 집중'].includes(f.stress)||!['','base','stress','staff','spread','short'].includes(f.chosen))throw Error('운영 점검 형식 오류');for(const k of ['missing','rainQueue','relief','shortDuration','targetWait','hourly'])if(f[k]!==null&&(!Number.isFinite(f[k])||f[k]<0||f[k]>10000000))throw Error('운영 점검 수치 오류');if(!Array.isArray(f.checklist)||f.checklist.length!==8||!Array.isArray(f.runs)||f.runs.length>50)throw Error('운영표 형식 오류');for(const c of f.checklist){text(c,['name','status','owner','evidence']);if(!['미확인','진행 중','완료'].includes(c.status))throw Error('준비 상태 오류');}for(const r of f.runs){text(r,['time','task','owner','trigger','response']);for(const k of ['sourceSignature','sourcePlan'])if(r[k]!==undefined&&(typeof r[k]!=='string'||r[k].length>20000))throw Error('운영표 출처 형식 오류');}}
const pct=n=>n===null?'계산 불가':n.toFixed(1)+'%';
export function planRunRows(p,simulate){
 const f=p.preflight;
 if(!f.chosen||f.signature!==signature(p))throw Error('현재 조건으로 대응안을 먼저 선택해 주세요.');
 const plan=comparePlans(p,simulate).find(x=>x.key===f.chosen),o=plan.ops;
 const sourceSignature=signature(p),sourcePlan=plan.key;
 if(f.runs.some(r=>r.sourceSignature===sourceSignature&&r.sourcePlan===sourcePlan))throw Error('같은 조건의 운영표 초안이 이미 있습니다. 기존 작업을 확인해 주세요.');
 const rows=[
  {time:'개장 60분 전',task:`${plan.name}: 인력과 체험 준비`,owner:'현장 총괄',trigger:`체험 담당 ${o.staff}명 배치, 운영 ${o.hours}시간`,response:`체험 ${o.duration}분, 동시 정원 ${o.capacity}명, 직원당 ${o.perStaff}명 안내 조건을 리허설로 확인. 불충족 시 입장 전 재계획`},
  {time:'개장 30분 전',task:`${plan.name}: 도착 계획 확인`,owner:'접수 담당',trigger:`${o.start}시 시작, ${o.mode} 입장, 15분별 원시 도착 계획: ${o.arrivals}`,response:`방문량 배수 ${o.factor} 적용 가정. ${plan.key==='spread'?'시간 변경 수락 여부를 확인하고 미수락 시 분산 가정 재검토. ':''}예약 구간당 ${o.reservedPerSlot}명, VIP 우선 ${o.vipSlots}개 구간 확인`},
  {time:'행사 중',task:`${plan.name}: 대기와 공백 대응`,owner:'대기 안내 담당',trigger:`대기 ${o.queueCap}명 초과 또는 체험 담당 ${o.staff}명 배치 불가`,response:`현장 총괄에게 입장 조정, 지원 요청. 평균 대기 목표 ${f.targetWait}분은 모의계산 목표이며 현장 중단 기준은 별도 승인`},
  {time:'종료 후',task:`${plan.name}: 계획과 실제 결과 비교`,owner:'현장 총괄',trigger:'마지막 고객 안내 및 체험 종료',response:'실제 도착, 완료, 이탈, 미입장, 대기시간을 별도 집계하고 가정과 차이 기록. 동의한 고객의 후속 안내 담당자에게 인계'}
 ];
 if(f.runs.length+rows.length>50)throw Error('운영표는 50개 작업까지입니다.');
 return rows.map(r=>({...r,sourceSignature,sourcePlan}));
}
export function runNeedsReview(p,r){return !!r.sourceSignature&&(r.sourceSignature!==signature(p)||r.sourcePlan!==p.preflight.chosen);}
export function groupRuns(p){const groups=new Map();for(const r of p.preflight.runs){const owner=r.owner.trim()||'담당 미정';if(!groups.has(owner))groups.set(owner,[]);groups.get(owner).push(r);}return [...groups].sort(([a],[b])=>a.localeCompare(b,'ko'));}
export function preflightReport(p,simulate){if(!p.preflight)return '';const f=p.preflight,c=cases.find(c=>c.id===f.caseId),ready=readiness(p);let results;try{results=comparePlans(p,simulate).map(x=>`${x.name}: 완료 ${pct(x.completion)}, 입장자 평균 대기 ${x.r.avgWait?.toFixed(1)??'계산 불가'}분, 최대 대기 ${x.r.maxQueue}명, 이탈 ${x.r.left}명, 종료 미입장 ${x.r.unentered}명, 진행 중 ${x.r.unfinished}명, 대기 정원 초과 ${x.r.exceeded}분, 기준 대비 대표일 인력비 ${x.laborDelta??'단가 미입력'}원\n조건: ${x.condition}\n입력: ${JSON.stringify(x.ops)}`).join('\n');}catch(e){results='계산 보류: '+e.message;}return `\n## 초청형 팝업 운영 사전 점검\n실제 행사 운영 기록이 아닌 사전 모의검토\n참고 사례: ${c.name}\n${c.fact}\n출처: ${c.url||'사용자 확인 필요'}\n추가 확인 사실, 출처: ${f.facts||'미입력'}\n모르는 정보: ${f.unknowns}\n검토 가정: ${f.assumptions||'미입력'}\n${results}\n선택안: ${f.chosen||'미선택'} / ${f.signature===signature(p)?'현재 조건 기준':'미선택 또는 조건 변경 후 재선택 필요'}\n선택 이유: ${f.reason||'미입력'}\n준비 완료: ${ready.done}/${ready.total} / 담당자, 근거가 입력된 완료 항목\n${f.checklist.map(c=>`${c.name}: ${c.status} / 담당 ${c.owner||'미정'} / 근거 ${c.evidence||'없음'}`).join('\n')}\n### 담당자별 운영표\n${[...f.runs].sort((a,b)=>a.owner.localeCompare(b.owner,'ko')||a.time.localeCompare(b.time)).map(r=>`${runNeedsReview(p,r)?'[조건 변경 / 재검토 필요] ':''}${r.owner||'담당 미정'} | ${r.time||'시각 미정'} | ${r.task||'작업 미정'} | 실행 조건: ${r.trigger||'미정'} | 대응, 인계: ${r.response||'미정'}`).join('\n')||'미작성'}\n한계: 완료율=종료까지 완료/가정 도착. 평균 대기는 입장자만 포함. 이탈은 설정한 대기 한도 초과에 따른 모형값. 우천 대기 축소는 초과 여부만 바꾸며 실내 이동을 자동 계산하지 않음. 예약 우선권은 기존 단순 모형이며 실제 VIP 명단, 지각, 동반인을 추적하지 않음. 인력비 차이는 대표 하루의 체험 인력만 포함하며 총예산 차이가 아님. 준비율은 사용자 입력 근거이며 실제 승인, 안전을 보증하지 않음.\n`;}
