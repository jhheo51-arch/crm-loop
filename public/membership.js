export const memberStages=['방문 비회원','혜택 안내','가입 시작','가입 완료','후속 행동'];
export function upgradeMembership(p){p.membership??={version:1,program:'',scope:'미확인',benefit:'',benefitEvidence:'',checkedAt:'',segment:'',locationReason:'',spaceNeeds:'',timing:'',script:'',decline:'',existingCare:'',help:'',owner:'',followup:'',followupWindow:'',consent:'',hypothesis:'',change:'',metric:'',guardrail:'',result:'',batches:[]};return p;}
export function newBatch(p){const v=p.venues.find(x=>x.id===p.recommended);return {id:crypto.randomUUID(),name:'새 회원 전환 기록',kind:'가상 연습',venueId:v?.id||'',venueName:v?.name||'',cohort:'',period:'',source:'',completionProof:'미확인',followupDefinition:'',followupWindow:'',total:null,existing:null,unknown:null,counts:[null,null,null,null,null],complaints:null,staffNote:'',limit:''};}
const validCount=n=>n===null||(Number.isInteger(n)&&n>=0&&n<=1000000);
export function memberSummary(b){
 if(!b||!Array.isArray(b.counts)||b.counts.length!==5||b.counts.some(x=>!validCount(x))||['total','existing','unknown','complaints'].some(k=>!validCount(b[k])))return {error:'인원은 0 이상 1,000,000 이하의 정수 또는 미측정 빈칸이어야 합니다.'};
 if(!b.cohort.trim()||!b.period.trim()||!b.source.trim())return {error:'대상 집단, 집계 기간, 출처, 중복 제거 방법을 적어 주세요.'};
 let prev=null;for(const n of b.counts){if(n===null)continue;if(prev!==null&&n>prev)return{error:'같은 집단을 따라간 기록이어야 합니다. 뒤 단계 인원이 앞 단계보다 많습니다.'};prev=n;}
 const parts=[b.counts[0],b.existing,b.unknown],classified=parts.every(x=>x!==null)&&b.total!==null;
 if(b.total!==null&&parts.filter(x=>x!==null).reduce((s,x)=>s+x,0)>b.total)return{error:'방문 비회원, 기존 회원, 회원 여부 미확인의 합이 전체 방문자보다 많습니다.'};
 if(classified&&parts.reduce((s,x)=>s+x,0)!==b.total)return{error:'전체 방문자 수와 비회원, 기존 회원, 미확인 인원의 합을 맞춰 주세요.'};
 if(b.complaints!==null&&b.counts[1]!==null&&b.complaints>b.counts[1])return{error:'안내 불편을 표시한 인원은 혜택을 안내받은 인원을 넘을 수 없습니다.'};
 const proof=b.kind==='가상 연습'||b.completionProof==='가입 완료 집계 확인',warnings=[];
 if(!classified)warnings.push('회원 여부 분류가 일부 미측정입니다. 전체 방문자 기준 회원 전환율은 계산하지 않습니다.');
 if(!proof)warnings.push('실제 가입 완료 근거 미확인. 링크 클릭이나 QR 열기는 가입 완료가 아닙니다. 완료 이후 비율을 보류합니다.');
 const followupReady=!!b.followupDefinition.trim()&&!!b.followupWindow.trim();
 if(!followupReady&&b.counts[4]!==null)warnings.push('후속 행동의 정의와 관찰 기간이 없어 후속 비율을 보류합니다.');
 const ratio=(n,d)=>n!==null&&d!==null&&d>0?n/d*100:null;
 const rows=b.counts.map((count,i)=>({name:memberStages[i],count,rate:i===0?null:(i>=3&&!proof)||(i===4&&!followupReady)?null:ratio(count,b.counts[i-1]),drop:i>0&&count!==null&&b.counts[i-1]!==null?b.counts[i-1]-count:null}));
 const eligibleDrops=rows.slice(1,proof?4:3).filter(x=>x.drop!==null&&x.drop>0);const max=eligibleDrops.length?Math.max(...eligibleDrops.map(x=>x.drop)):null;
 return {rows,classified,warnings,proof,conversion:proof?ratio(b.counts[3],b.counts[0]):null,completion:proof?ratio(b.counts[3],b.counts[2]):null,followup:proof&&followupReady?ratio(b.counts[4],b.counts[3]):null,complaintRate:ratio(b.complaints,b.counts[1]),largest:eligibleDrops.filter(x=>x.drop===max),note:b.kind==='가상 연습'?'가상 연습이며 실제 가입 성과가 아닙니다.':'사용자 입력 집계입니다. 이 서비스가 브랜드 회원 시스템에서 직접 검증한 값이 아닙니다.'};
}
export function memberReadiness(p){const m=p.membership,v=p.venues.find(x=>x.id===p.recommended);return [
 {name:'장소와 목표 고객 연결',ok:!!v&&!!m.segment.trim()&&!!m.locationReason.trim()},
 {name:'혜택, 운영 범위 근거',ok:!!m.program.trim()&&m.scope!=='미확인'&&!!m.benefit.trim()&&!!m.benefitEvidence.trim()&&!!m.checkedAt},
 {name:'현장 응대와 선택권',ok:!!m.timing.trim()&&!!m.script.trim()&&!!m.decline.trim()&&!!m.owner.trim()},
 {name:'후속 관계와 확인 기간',ok:!!m.followup.trim()&&!!m.followupWindow.trim()&&!!m.consent.trim()}
 ];}
export function validateMembership(p){if(!p.membership)return;const m=p.membership;const text=(o,keys)=>{for(const k of keys)if(typeof o[k]!=='string'||o[k].length>20000)throw Error('회원 전환 텍스트 형식 오류');};
 if(m.version!==1||!Array.isArray(m.batches)||m.batches.length>50)throw Error('회원 전환 기록 형식 오류');text(m,['program','scope','benefit','benefitEvidence','checkedAt','segment','locationReason','spaceNeeds','timing','script','decline','existingCare','help','owner','followup','followupWindow','consent','hypothesis','change','metric','guardrail','result']);if(!['미확인','온라인 회원','오프라인 회원','온, 오프라인 연계 확인','기획 가정'].includes(m.scope))throw Error('회원제 운영 범위 오류');
 const ids=new Set();for(const b of m.batches){if(!b||!/^[a-f0-9-]{36}$/.test(b.id)||ids.has(b.id))throw Error('회원 집계 식별자 오류');ids.add(b.id);text(b,['name','kind','venueId','venueName','cohort','period','source','completionProof','followupDefinition','followupWindow','staffNote','limit']);if(!['가상 연습','실제 집계'].includes(b.kind)||!['미확인','가입 완료 집계 확인'].includes(b.completionProof))throw Error('회원 집계 상태 오류');if(b.venueId&&!p.venues.some(v=>v.id===b.venueId))throw Error('기록에 연결된 공간이 없습니다.');if(!Array.isArray(b.counts)||b.counts.length!==5||b.counts.some(x=>!validCount(x))||['total','existing','unknown','complaints'].some(k=>!validCount(b[k])))throw Error('회원 집계 숫자 형식 오류');}
}
const pct=n=>n===null?'계산 보류':n.toFixed(1)+'%';
export function membershipReport(p){if(!p.membership)return '';const m=p.membership,v=p.venues.find(x=>x.id===p.recommended);return `\n## 방문 고객 → 브랜드 회원 → 후속 관계\n기획 단계 / 실제 가입 처리나 발송 기능 없음\n분야: ${p.sector||'미선택'} / 현재 추천 공간: ${v?.name||'미선정'}\n${[['프로그램',m.program],['운영 범위',m.scope],['가입 고객의 가치',m.benefit],['혜택 근거',m.benefitEvidence],['확인일',m.checkedAt],['대상 비회원',m.segment],['장소 선택과의 연결',m.locationReason],['필요한 응대 공간',m.spaceNeeds],['안내 시점',m.timing],['안내 문구',m.script],['거절 시 케어',m.decline],['기존 회원 케어',m.existingCare],['가입 중 지원',m.help],['담당 역할',m.owner],['후속 행동',m.followup],['후속 확인 기간',m.followupWindow],['연락 수신 선택',m.consent],['개선 가설',m.hypothesis],['바꿀 절차',m.change],['검증 지표, 기간',m.metric],['함께 지킬 조건',m.guardrail],['실제 결과, 한계',m.result]].map(([a,b])=>a+': '+(b||'미작성')).join('\n')}\n${m.batches.map(b=>{const a=memberSummary(b);return `\n### ${b.name} / ${b.kind}\n공간: ${b.venueName||'미선정'} / 대상: ${b.cohort||'미정'} / 기간: ${b.period||'미정'}\n집계 근거: ${b.source||'미확인'} / 완료 증빙: ${b.completionProof}\n전체 방문: ${b.total??'미측정'} / 기존 회원: ${b.existing??'미측정'} / 회원 여부 미확인: ${b.unknown??'미측정'}\n${memberStages.map((s,i)=>s+': '+(b.counts[i]??'미측정')).join(' → ')}\n${a.error||`대상 비회원 대비 가입률: ${pct(a.conversion)} / 시작 대비 완료율: ${pct(a.completion)} / 완료 대비 후속 행동률: ${pct(a.followup)}\n안내 불편 인원: ${b.complaints??'미측정'} / 안내 인원 대비: ${pct(a.complaintRate)}\n${a.note}\n${a.warnings.join('\n')}`}\n후속 정의, 기간: ${b.followupDefinition||'미정'} / ${b.followupWindow||'미정'}\n직원 운영 메모: ${b.staffNote||'미작성'}\n집계 한계: ${b.limit||'미작성'}\n`;}).join('')||'집계 기록 없음\n'}\n서로 다른 기간, 장소, 집단의 비율 차이를 개선 효과로 단정하지 않습니다. 기존 회원과 회원 여부 미확인은 신규 가입 분모에서 분리합니다.\n`;}
