import {newBatch} from './membership.js';
export const eventNames={visit:'장소 방문',experience:'체험 완료',offer:'회원 혜택 안내',enroll:'체험용 회원 생성',decline:'가입 없이 종료',followup:'후속 이용 완료'};
export function upgradeJourney(p){p.journey??={version:1,title:'',brief:'',doneRule:'',nextAction:'',nextHelp:'',days:7,cases:[]};return p;}
export function journeyReady(p){const j=p.journey,v=p.venues.find(v=>v.id===p.recommended);return [
 {name:'장소 선정',ok:!!v&&!v.conditions.includes('미충족'),action:'venues',detail:v?.name||'추천 장소를 정해 주세요.'},
 {name:'체험 설계',ok:!!p.sector&&!!j.title.trim()&&!!j.brief.trim()&&!!j.doneRule.trim(),action:'setup',detail:j.title||'체험 내용과 완료 기준을 정해 주세요.'},
 {name:'회원 전환',ok:!!p.membership.program.trim()&&!!p.membership.benefit.trim(),action:'membership',detail:p.membership.program||'회원 프로그램과 고객 혜택을 정해 주세요.'},
 {name:'후속 이용',ok:!!j.nextAction.trim()&&!!j.nextHelp.trim()&&Number.isInteger(j.days)&&j.days>=1&&j.days<=365,action:'setup',detail:j.nextAction||'가입 후 고객이 얻을 다음 가치를 정해 주세요.'}
 ];}
const event=(c,t)=>c.events.find(e=>e.type===t);
export function createCase(p,now=new Date().toISOString()){
 if(!journeyReady(p).every(x=>x.ok))throw Error('네 단계의 준비 항목을 먼저 채워 주세요.');
 if(p.journey.cases.length>=100)throw Error('모의 운영 방문은 100건까지입니다.');
 const v=p.venues.find(v=>v.id===p.recommended),j=p.journey;
 return{id:crypto.randomUUID(),venueId:v.id,venueName:v.name,sector:p.sector,program:p.membership.program,benefit:p.membership.benefit,setup:{title:j.title,brief:j.brief,doneRule:j.doneRule,nextAction:j.nextAction,nextHelp:j.nextHelp,days:j.days},choice:'받지 않음',events:[{type:'visit',at:now,recordedAt:now}]};
}
export function advanceCase(c,type,now=new Date().toISOString()){
 if(!Object.hasOwn(eventNames,type)||type==='visit')throw Error('지원하지 않는 모의 운영 단계입니다.');
 if(event(c,type))throw Error('이미 기록한 단계입니다. 중복 집계하지 않았습니다.');
 if(event(c,'decline'))throw Error('가입 없이 종료한 모의 운영입니다. 새 방문으로 다시 시작할 수 있습니다.');
 const requirement={experience:'visit',offer:'experience',enroll:'offer',decline:'offer',followup:'enroll'}[type];
 if(!event(c,requirement))throw Error('앞 단계를 먼저 진행해 주세요.');
 if(type==='decline'&&event(c,'enroll'))throw Error('이미 가입한 모의 운영입니다.');
 let at=new Date(Math.max(Date.parse(now),Date.parse(c.events.at(-1).at))).toISOString();
 if(type==='followup')at=new Date(Math.max(Date.parse(at),Date.parse(event(c,'enroll').at)+c.setup.days*86400000)).toISOString();
 c.events.push({type,at,recordedAt:now});return c;
}
export function caseState(c){const enrolled=event(c,'enroll');return{step:c.events.at(-1).type,visited:true,experienced:!!event(c,'experience'),offered:!!event(c,'offer'),enrolled:!!enrolled,declined:!!event(c,'decline'),used:!!event(c,'followup'),memberCode:enrolled?'CASE-'+c.id.slice(0,8).toUpperCase():null,due:enrolled?new Date(Date.parse(enrolled.at)+c.setup.days*86400000).toISOString():null};}
export function cohortKey(c){return JSON.stringify([c.venueId,c.sector,c.program,c.benefit,c.setup]);}
export function casesToBatch(p,caseId){const selected=p.journey.cases.find(c=>c.id===caseId);if(!selected)throw Error('모의 운영 방문을 찾지 못했습니다.');const key=cohortKey(selected),cases=p.journey.cases.filter(c=>cohortKey(c)===key),states=cases.map(caseState),b=newBatch(p);Object.assign(b,{name:'여정 모의 운영 집계: '+selected.venueName,venueId:selected.venueId,venueName:selected.venueName,kind:'가상 연습',cohort:'같은 장소, 분야, 체험, 혜택, 후속 조건의 모의 운영 방문 '+cases.length+'건(방문 단위이며 실제 고유 고객 아님)',period:'모의 운영 시작 '+cases.map(c=>c.events[0].at).sort()[0]+', 집계 '+new Date().toISOString(),source:'로컬 모의 운영 이벤트로 계산. 방문 ID: '+cases.map(c=>c.id).join(', '),total:cases.length,existing:0,unknown:0,counts:[cases.length,states.filter(s=>s.offered).length,states.filter(s=>s.enrolled).length,states.filter(s=>s.enrolled).length,states.filter(s=>s.used).length],completionProof:'미확인',followupDefinition:selected.setup.nextAction,followupWindow:'D+'+selected.setup.days+' 기준(시간 경과를 가정하며 실제 관찰 기간이 아님)',complaints:null,staffNote:'가입 시작과 완료는 모의 운영 버튼에서 동시에 처리. 실제 가입 화면의 중간 이탈은 측정하지 않음.',limit:'실제 성과 아님. 반복 모의 운영을 고유 고객으로 해석하지 않음. 집계는 당시 스냅샷이며 이전 집계와 합산하지 않음.'});return b;}
export function validateJourney(p){if(!p.journey)return;const j=p.journey,str=(o,keys)=>{for(const k of keys)if(typeof o[k]!=='string'||o[k].length>20000)throw Error('여정 텍스트 형식 오류');};str(j,['title','brief','doneRule','nextAction','nextHelp']);if(j.version!==1||(j.days!==null&&(!Number.isInteger(j.days)||j.days<1||j.days>365))||!Array.isArray(j.cases)||j.cases.length>100)throw Error('여정 설정 형식 오류');const ids=new Set();for(const c of j.cases){if(!c||!/^[a-f0-9-]{36}$/.test(c.id)||ids.has(c.id))throw Error('여정 방문 식별자 오류');ids.add(c.id);str(c,['venueId','venueName','sector','program','benefit','choice']);if(!p.venues.some(v=>v.id===c.venueId)||!['받지 않음','받기 희망'].includes(c.choice))throw Error('여정 연결 정보 오류');if(!c.setup)throw Error('체험 설정 누락');str(c.setup,['title','brief','doneRule','nextAction','nextHelp']);if(!Number.isInteger(c.setup.days)||c.setup.days<1||c.setup.days>365||!Array.isArray(c.events)||!c.events.length||c.events.length>5)throw Error('여정 이벤트 형식 오류');if(c.events[0]?.type!=='visit')throw Error('방문 시작 누락');const replay={...c,events:[]};for(const e of c.events){if(!e||!Number.isFinite(Date.parse(e.at))||!Number.isFinite(Date.parse(e.recordedAt)))throw Error('여정 시각 형식 오류');if(!replay.events.length)replay.events.push({...e});else{if(Date.parse(e.at)<Date.parse(replay.events.at(-1).at))throw Error('여정 시각 순서 오류');if(e.type==='followup'&&Date.parse(e.at)<Date.parse(event(replay,'enroll')?.at)+c.setup.days*86400000)throw Error('후속 이용 시각 오류');advanceCase(replay,e.type,e.at);}}}}
export function journeyReport(p){if(!p.journey)return '';const j=p.journey;return `\n## 장소, 체험, 회원 전환, 후속 이용 모의 운영\n실제 회원 생성, 고객 행동, 메시지 발송 아님\n체험: ${j.title||'미작성'}\n설명: ${j.brief||'미작성'}\n완료 기준: ${j.doneRule||'미작성'}\n후속 이용: ${j.nextAction||'미작성'} (D+${j.days??'미정'})\n제공할 안내: ${j.nextHelp||'미작성'}\n${j.cases.map(c=>{const s=caseState(c);return `\n### 모의 운영 ${c.id.slice(0,8)} (${c.venueName})\n시작 당시 체험: ${c.setup.title}\n회원 프로그램: ${c.program}\n제안 혜택: ${c.benefit}\n후속 이용: ${c.setup.nextAction} (D+${c.setup.days})\n체험용 회원 코드: ${s.memberCode||'가입하지 않음'}\n소식 수신 선택: ${c.choice} (가상 입력값, 실제 발송 없음)\n${c.events.map(e=>eventNames[e.type]+': 가상 처리 시각 '+e.at+', 기록 시각 '+e.recordedAt).join('\n')}\n`;}).join('')||'아직 모의 운영 기록 없음\n'}`;}
