import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {measurement} from '../public/measurement-data.js';
import {measurementView,armSummary,qiniPath} from '../public/measurement-ui.js';
import {recommend,segmentFor,increment,sampleSize,seasons,crmSegments,exampleInputs} from '../public/seasonal.js';
import {seasonalView,emptySeasonal,exampleSeasonal,seasonalResults} from '../public/seasonal-ui.js';

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const h={btn:(t,a,c,e)=>`<button class="${c||''}" data-action="${a}" ${e||''}>${t}</button>`,esc,note:(x,t)=>`<div class="note ${t||''}">${x}</div>`};
const forbidden=['·','공고','채용','입사','면접','소노'];

test('사례 A 화면은 결과 파일의 숫자를 그대로 보여 준다',()=>{const w=measurement.arms.womens,html=measurementView(h,'womens');assert.ok(html.includes('+'+(w.ate.visit.diff*100).toFixed(2)+'%p'));assert.ok(html.includes('공개 실험 데이터'));assert.ok(html.includes(measurement.meta.note));const best=w.budget.by_k.find(x=>x.k_pct===w.budget.best_k_pct);assert.ok(html.includes('$'+Math.round(best.profit_total).toLocaleString('en-US')));assert.equal((html.match(/best-row/g)||[]).length,1);for(const x of forbidden)assert.ok(!html.includes(x),x);});

test('사례 A 해석 문장은 신뢰구간에 따라 바뀐다',()=>{assert.equal(armSummary(measurement.arms.womens).rankingWorks,true);assert.equal(armSummary(measurement.arms.mens).rankingWorks,false);assert.match(armSummary(measurement.arms.mens).scope,/전원/);assert.match(armSummary(measurement.arms.womens).scope,/상위 80%/);const html=measurementView(h,'mens');assert.match(html,/구별되지 않습니다/);assert.ok(measurementView(h,'없는값').includes('aria-pressed="false"'));});

test('Qini 곡선 좌표는 그림 안에 있다',()=>{const {model,random}=qiniPath(measurement.arms.womens.uplift.curve);for(const pts of [model,random])for(const p of pts.split(' ')){const [x,y]=p.split(',').map(Number);assert.ok(x>=0&&x<=520&&y>=0&&y<=200,p);}});

test('사례 C 추천은 세 가지를 모두 골라야 나오고 고객군 표와 맞는다',()=>{assert.equal(recommend({season:'봄',companion:'가족',purpose:'',activity:''}),null);const r=recommend({season:'봄',companion:'가족',purpose:'휴식',activity:'숲'});assert.equal(r.segment,'가족 체험형');assert.ok(r.items.includes('늦은 체크아웃'));assert.ok(r.items.includes('객실 1박'));assert.equal(recommend({season:'가을',companion:'커플',purpose:'활동',activity:'러닝'}).segment,'액티비티형');const solo=recommend({season:'가을',companion:'친구나 혼자',purpose:'휴식',activity:'단풍'});assert.equal(solo.fixed,false);assert.ok(solo.note);assert.throws(()=>recommend({season:'가을',companion:'가족',purpose:'휴식',activity:'바다'}));for(const s of Object.keys(seasons))for(const a of seasons[s].keywords)for(const c of ['가족','커플','친구나 혼자'])for(const p of ['휴식','활동','식음']){const x=recommend({season:s,companion:c,purpose:p,activity:a});assert.ok(crmSegments.some(g=>g.name===x.segment));assert.equal(new Set(x.items).size,x.items.length);}assert.equal(segmentFor({companion:'커플',purpose:'식음'}).name,'커플 휴식형');});

test('증분 예약률과 표본 수를 손 계산과 맞춘다',()=>{const d=increment({n:10000,booked:420},{n:10000,booked:300});assert.ok(Math.abs(d.diff-0.012)<1e-12);assert.ok(d.lo<0.012&&0.012<d.hi);assert.equal(increment({n:0,booked:0},{n:10,booked:1}),null);assert.equal(increment({n:10,booked:11},{n:10,booked:1}),null);const n=sampleSize(0.03,0.005);const expect=Math.ceil((1.959963984540054+0.8416212335729143)**2*(0.03*0.97+0.035*0.965)/0.005**2);assert.equal(n,expect);assert.equal(sampleSize(0,0.01),null);assert.equal(sampleSize(0.5,0),null);});

test('사례 C 화면은 일곱 구성과 가상 예시 표시를 갖춘다',()=>{const st=emptySeasonal();let html=seasonalView(st,h);for(const t of ['CASE C','문제','고객 여정','캠페인 화면','CRM 운영','측정 대시보드','한계와 다음 검증','특정 회사의 실제 캠페인'])assert.ok(html.includes(t),t);assert.ok(!html.includes('가상 예시 데이터</span>'));st.inputs=structuredClone(exampleInputs);st.example=true;st.choice={season:'봄',companion:'커플',purpose:'식음',activity:'바다'};html=seasonalView(st,h);assert.ok(html.includes('가상 예시 데이터'));assert.ok(html.includes('+1.20%p'));assert.ok(html.includes('추천 패키지'));const r=seasonalResults(st.inputs);assert.ok(r.n>0);for(const x of forbidden)assert.ok(!html.includes(x),x);});
test('사례 A 비용 가정을 바꾸면 분석 스크립트와 같은 식으로 다시 계산한다',async()=>{
 const {recompute,costInputs}=await import('../public/measurement-ui.js');
 for(const key of ['womens','mens']){const arm=measurement.arms[key],b=recompute(arm,measurement.assumptions);
  assert.equal(b.best_k_pct,arm.budget.best_k_pct);
  arm.budget.by_k.forEach((x,i)=>{assert.ok(Math.abs(b.by_k[i].profit_total-x.profit_total)<1,`${key} ${x.k_pct}`);if(x.profit_total_lo!==undefined)assert.ok(Math.abs(b.by_k[i].profit_total_lo-x.profit_total_lo)<1);});
  for(const sc of arm.coupon_scenario){const c=recompute(arm,{...measurement.assumptions,coupon_rate:sc.coupon_rate});assert.equal(c.best_k_pct,sc.best_k_pct);assert.ok(Math.abs(c.profit_best-sc.profit_best)<1);}}
 assert.equal(costInputs({margin:0,send_cost:0.05,coupon_rate:0,base_customers:10000}),null);
 assert.equal(costInputs({margin:0.3,send_cost:-1,coupon_rate:0,base_customers:10000}),null);
 assert.equal(costInputs({margin:0.3,send_cost:0.05,coupon_rate:1,base_customers:10000}),null);
 const html=measurementView(h,'womens',measurement,{...measurement.assumptions,send_cost:0.5});
 assert.match(html,/바꾼 가정값/);assert.match(html,/data-cost="send_cost"/);assert.ok(!measurementView(h,'womens').includes('바꾼 가정값'));
});

test('사례 C 측정 대시보드는 가상 예시 값을 채운 상태로 열린다',()=>{const st=exampleSeasonal();assert.equal(st.example,true);assert.deepEqual(st.inputs,exampleInputs);assert.notEqual(st.inputs,exampleInputs);const html=seasonalView(st,h);assert.ok(html.includes('가상 예시 데이터</span>'));assert.ok(html.includes('+1.20%p'));assert.ok(html.includes('처음 열면'));assert.ok(!html.includes('대상 수와 예약 수를 넣으면 계산합니다.'));const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');assert.match(app,/seasonal=exampleSeasonal\(\)/);});
