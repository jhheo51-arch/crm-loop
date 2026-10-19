import test from 'node:test';
import assert from 'node:assert/strict';
import {initial,validate,report} from '../public/core.js';
import {upgrade} from '../public/care.js';
import {crmStats,crmGaps,seedFlagship,validateCRM} from '../public/crm.js';
import {crmView,crmTabs} from '../public/crm-ui.js';
import {portfolioCases,researchCases} from '../public/crm-cases.js';
import {transitionGuest} from '../public/event.js';

const project=()=>upgrade(initial(false));
const helpers={field:()=>'',btn:t=>t,note:x=>x,esc:x=>String(x??'').replaceAll('<','&lt;').replaceAll('>','&gt;')};

test('이전 프로젝트에 CRM 필드와 고객 신호를 보존형으로 추가한다',()=>{const p=project();assert.equal(p.crm.version,1);assert.equal(p.crm.metrics.length,6);assert.equal(crmStats(p).consent,null);validateCRM(p);});

test('대표 프로젝트는 실제 성과로 오인하지 않는 가상 고객군을 만든다',()=>{const p=project();seedFlagship(p);assert.equal(p.brand,'향 브랜드 (가상)');assert.equal(p.event.kind,'가상 연습');assert.equal(p.event.guests.length,4);assert.ok(p.event.guests.every(g=>g.alias.startsWith('가상 고객')));assert.equal(p.event.guests.filter(g=>g.status==='확정').length,3);});

test('동의와 후속 성과는 방문 고객을 분모로 계산하고 미측정을 구분한다',()=>{const p=project();seedFlagship(p);const g=p.event.guests[0];transitionGuest(p,g.id,'대기');g.consent='동의';g.consentScope='카카오 / 리필 안내';g.follow='완료';g.followOwner='CRM 담당';g.followNote='사용 팁 전달 기록';g.nextAction='30일 재방문 확인';g.crmOutcome='예약';const s=crmStats(p);assert.equal(s.consent,100);assert.equal(s.follow,100);assert.equal(s.outcome,100);assert.equal(crmGaps(p).some(x=>x.text.includes(g.alias+' / 마케팅 동의')),false);});

test('공개 후기 카드에는 출처와 표본 한계, 근거 공백이 남는다',()=>{assert.equal(portfolioCases.length,5);assert.equal(researchCases.length,5);assert.ok(researchCases.every(c=>c.sources.length&&c.interpretation&&c.experiment&&c.metric));assert.ok(researchCases.find(c=>c.id==='atiissu').scope.includes('미확보'));assert.ok(researchCases.find(c=>c.id==='nuflaat').scope.includes('팝업 아님'));});

test('모든 CRM 화면은 사용자 문자열을 이스케이프하고 보고서에 포함한다',()=>{const p=project();p.crm.objective='<script>alert(1)</script>';for(const tab of crmTabs){const html=crmView(p,helpers,tab);assert.ok(html.includes('CRM'));assert.ok(!html.includes('<script>'));}const checked=validate(structuredClone(p),{draft:true});assert.ok(report(checked).includes('## CRM 전략'));});
