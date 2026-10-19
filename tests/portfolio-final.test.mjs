import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {finalPlan,loop,customerValue,validateFinalPlan,finalPortfolioReport} from '../public/portfolio-final.js';
import {portfolioView} from '../public/portfolio-final-ui.js';

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const helpers={btn:(t,a,c,e)=>`<button data-action="${a}" ${e||''}>${t}</button>`,esc,note:(x,t)=>`<div class="${t||''}">${esc(x)}</div>`};

test('고객군 합계와 퍼널은 일관되고 가상 데이터임을 밝힌다',()=>{assert.equal(validateFinalPlan(),true);assert.equal(finalPlan.segments.reduce((n,x)=>n+x.invited,0),240);assert.ok(finalPlan.funnel.every((x,i,a)=>i===0||x.count<=a[i-1].count));assert.ok(finalPlan.status.includes('가상 데이터'));});

test('KPI 산식은 고정된 분모와 일치한다',()=>{const expected=[156/240,116/132,104/116,82/116,47/82,28/82].map(x=>+(x*100).toFixed(1));assert.deepEqual(finalPlan.kpis.map(x=>x.value),expected);assert.ok(finalPlan.kpis.every(x=>x.formula.includes('÷')));});

test('단계 사이 이탈을 삭제하지 않고 모두 담당 업무로 남긴다',()=>{assert.equal(finalPlan.leaks.length,7);assert.ok(finalPlan.leaks.every(x=>x.lost>0&&x.care&&x.owner));assert.equal(finalPlan.leaks.find(x=>x.between==='참석과 동의 사이').lost,34);});

test('화면이 프로젝트 기획안, 본인 판단, 내려받기로 이어진다',()=>{const html=portfolioView(helpers);assert.ok(html.includes('프로젝트 기획안'));assert.ok(html.includes('제가 한 판단'));assert.ok(html.includes('내려받기'));assert.ok(html.includes('.pdf'));assert.ok(html.includes('.xlsx'));assert.ok(html.includes('실제 브랜드의 CRM 정책, 고객 정보, 매출 또는 행사 성과가 아닙니다'));const report=finalPortfolioReport();assert.ok(report.includes('이 프로젝트를 만든 이유'));assert.ok(report.includes('가상 결과'));assert.ok(report.includes('실제 VIP 행사를 운영한 경험은 없습니다'));});

test('담당자 질문이 데이터와 다음 행동으로 이어진다',()=>{assert.equal(finalPlan.decisionMap.length,7);assert.ok(finalPlan.decisionMap.every(x=>x.question&&x.data&&x.action&&x.owner&&x.sla));const html=portfolioView(helpers);assert.ok(html.includes('담당자가 묻는 7가지 질문'));assert.ok(html.includes('consent_status'));assert.ok(html.includes('동의 고객만 CRM 등록'));});

test('프로젝트명 의미와 협업 기준을 명시하고 이전 공고 문구가 없다',()=>{assert.match(finalPlan.nameMeaning,/CRM/);assert.match(finalPlan.nameMeaning,/LOOP/);assert.match(finalPlan.nameNotice,/실제로 사용한 행사명은 아닙니다/);assert.equal(finalPlan.collaboration.length,3);assert.ok(finalPlan.collaboration.every(x=>x.team&&x.ask&&x.decide&&x.handoff));const html=portfolioView(helpers);assert.match(html,/팀마다 먼저 확인할 내용/);const all=html+finalPortfolioReport();for(const w of ['공고','채용','입사','면접','아이아이컴바인드','Marketing Specialist'])assert.ok(!all.includes(w),w);});

test('docs/PROJECT-PLAN.md는 생성 결과와 같다',()=>{const md=readFileSync(new URL('../docs/PROJECT-PLAN.md',import.meta.url),'utf8').replace(/\r\n/g,'\n');assert.equal(md,finalPortfolioReport());});

test('고객 가치 수치는 분석 결과 파일과 같다',()=>{const j=JSON.parse(readFileSync(new URL('../analysis/results/online_retail.json',import.meta.url),'utf8'));const seg=n=>j.rfm_validation.segments.find(x=>x.segment===n).repurchase;assert.equal(customerValue.atRiskRepurchase,+(seg('이탈 위험')*100).toFixed(1));assert.equal(customerValue.dormantRepurchase,+(seg('휴면')*100).toFixed(1));assert.equal(customerValue.customers,j.meta.customers);});

test('첫 부분은 캠페인 기획서 세 편을 앞에 두고 분석은 기획 근거로 둔다',()=>{assert.deepEqual(loop.cases.map(c=>c.key),['R','B','C','A','V']);assert.deepEqual(loop.cases.map(c=>c.group),['plan','plan','plan','basis','basis']);assert.ok(loop.cases.every(c=>c.decision));const html=portfolioView(helpers);assert.ok(html.indexOf('캠페인 기획서')<html.indexOf('기획 근거'));for(const w of ['업리프트','Qini','BG/NBD'])assert.ok(!html.slice(0,html.indexOf('portfolio-proposal')).includes(w),w);});

test('사례 B는 기획 항목을 앞에 두고 실행 항목을 부록으로 내린다',()=>{const order=['01 행사 목표','02 초청 대상과 기준','03 경험 설계','04 후속 메시지','05 성과 기준','<h2>실행 부록</h2>','담당자가 묻는 7가지 질문'];const html=portfolioView(helpers);const at=order.map(x=>html.indexOf(x));assert.ok(at.every(i=>i>=0),order.join());assert.deepEqual([...at].sort((a,b)=>a-b),at);const md=finalPortfolioReport();const mdOrder=['## 1. 행사 목표','## 2. 초청 대상과 기준','## 3. 경험 설계','## 4. 후속 메시지','## 5. 성과 기준','## 실행 부록','### 담당자가 묻는 7가지 질문'].map(x=>md.indexOf(x));assert.ok(mdOrder.every(i=>i>=0));assert.deepEqual([...mdOrder].sort((a,b)=>a-b),mdOrder);assert.ok(finalPlan.followups.some(x=>x.who==='동의하지 않은 고객'));});

test('포트폴리오 첫 부분에 다섯 요약과 연결 근거, 홀드아웃 실험이 있다',()=>{assert.equal(loop.cases.length,5);const html=portfolioView(helpers);assert.ok(html.indexOf('portfolio-loop')<html.indexOf('portfolio-proposal'));assert.equal(finalPlan.links.length,4);assert.match(html,/다른 사례와 이어지는 점/);assert.equal(finalPlan.experiments.length,4);assert.ok(finalPlan.experiments.some(x=>x.b.includes('미초청군')));assert.match(finalPortfolioReport(),/다음에 확인할 네 가지/);});

test('이전 시장 구분과 화살표, 실제 브랜드 행사 표기가 남지 않는다',()=>{const all=portfolioView(helpers)+finalPortfolioReport();for(const w of ['→','·','중국','HQ','Local','본사','현지','국가별','Global CRM','카디퓨저 VIP 프리뷰'])assert.ok(!all.includes(w),w);});
