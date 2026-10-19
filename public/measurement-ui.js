import {measurement} from './measurement-data.js';

export const measureArms=[['womens','여성용 상품 메일'],['mens','남성용 상품 메일']];
const MODEL_KO={two_model_logit:'두 모델 방식 (로지스틱 회귀)',two_model_hgb:'두 모델 방식 (부스팅 트리)',class_transform_hgb:'클래스 변환 방식 (부스팅 트리)',segment_rule:'고객군 규칙 (모델 없음)'};
const pp=x=>(x>=0?'+':'')+(x*100).toFixed(2)+'%p',pct=x=>(x*100).toFixed(2)+'%',usd=x=>(x<0?'-':'+')+'$'+Math.abs(x).toFixed(2),usd0=x=>(x<0?'-':'')+'$'+Math.abs(Math.round(x)).toLocaleString('en-US');
const ci=(d,f)=>`95% 구간 ${f(d.lo)} ~ ${f(d.hi)}`;

export function qiniPath(curve,w=520,h=200){
 const max=Math.max(...curve.flatMap(x=>[x.model,x.random]),1),min=Math.min(0,...curve.map(x=>x.model));
 const pt=(x,y)=>`${(x*w).toFixed(1)},${(h-(y-min)/(max-min)*h).toFixed(1)}`;
 return {model:curve.map(x=>pt(x.frac,x.model)).join(' '),random:curve.map(x=>pt(x.frac,x.random)).join(' ')};
}

// 비용 가정을 바꿔 분위별 증분 이익을 다시 계산한다. analysis/hillstrom.py의 budget()과 같은 식이다.
// 고객 1명당 증분 이익 = 마진율 x 증분 매출 - 쿠폰율 x 발송군 매출 - 발송 비용
export function costInputs(c){
 const x={margin:+c.margin,send_cost:+c.send_cost,coupon_rate:+c.coupon_rate,base_customers:Math.round(+c.base_customers)};
 if(!(x.margin>0&&x.margin<=1)||!(x.send_cost>=0)||!(x.coupon_rate>=0&&x.coupon_rate<1)||!(x.base_customers>=100&&x.base_customers<=10000000))return null;
 return x;
}
export function recompute(arm,c){
 const x=costInputs(c);if(!x)return null;
 const by_k=arm.budget.by_k.map(b=>{if(b.k_pct===0)return {k_pct:0,n_target:0,profit_total:0};
  const n=Math.round(x.base_customers*b.k_pct/100),fixed=x.coupon_rate*b.spend_t_per+x.send_cost,per=x.margin*b.inc_spend_per-fixed;
  return {k_pct:b.k_pct,n_target:n,profit_per:per,profit_total:per*n,profit_total_lo:(x.margin*b.inc_lo-fixed)*n,profit_total_hi:(x.margin*b.inc_hi-fixed)*n};});
 const best=by_k.reduce((m,b)=>b.profit_total>m.profit_total?b:m,by_k[0]);
 return {by_k,best_k_pct:best.k_pct,profit_best:best.profit_total,profit_all:by_k.at(-1).profit_total};
}
const sameCost=(a,b)=>['margin','send_cost','coupon_rate','base_customers'].every(k=>Math.abs(a[k]-b[k])<1e-12);

export function armSummary(arm,budget=arm.budget){
 const u=arm.uplift,best=budget.by_k.find(x=>x.k_pct===budget.best_k_pct),all=budget.by_k.at(-1);
 const rankingWorks=u.qini_visit_lo>0;
 return {rankingWorks,best,all,
  ranking:rankingWorks?'순위 모델이 무작위로 고르는 것보다 증분 방문을 더 많이 찾습니다.':'순위 모델이 무작위로 고르는 것과 구별되지 않습니다. 고객을 골라 보내도 나아지지 않습니다.',
  scope:budget.best_k_pct===100?'전원에게 보내는 것이 증분 이익이 가장 큽니다.':budget.best_k_pct===0?'보내지 않는 것이 낫습니다.':`예측 증분 상위 ${budget.best_k_pct}%에게만 보내는 것이 증분 이익이 가장 큽니다.`};
}

export function measurementView(h,armKey='womens',data=measurement,cost=data.assumptions){
 const {btn,esc}=h,arm=data.arms[armKey]||data.arms.womens,a=costInputs(cost)||data.assumptions,budget=recompute(arm,a)||arm.budget,changed=!sameCost(a,data.assumptions),s=armSummary(arm,budget),line=qiniPath(arm.uplift.curve),maxVisit=Math.max(...arm.past_purchase.map(x=>x.visit.hi),0.01);
 return `
<section class="card crm-hero"><div><div class="eyebrow">CRM LOOP / CASE A</div><h2>보낸 메시지가 실제로 무엇을 바꿨는지 잽니다.</h2><p>메일을 받은 고객과 받지 않은 고객을 무작위로 나눈 공개 실험 데이터 ${data.meta.rows.toLocaleString('ko-KR')}건으로, 메일이 없어도 일어났을 방문과 구매를 빼고 남은 증분만 봅니다. 아래 숫자는 모두 분석 스크립트의 결과 파일에서 읽어 옵니다.</p><div class="actions">${measureArms.map(([k,label])=>btn(label,'measure-arm',armKey===k?'selected':'',`data-id="${k}" aria-pressed="${armKey===k}"`)).join('')}</div></div><div class="crm-role"><span>사례 A</span><strong>상시 캠페인<br>증분 측정</strong><p>Holdout / ATE / Uplift / Qini / Budget</p></div></section>
<div class="event-kpis">${[['방문률 증분',arm.ate.visit,pp],['구매 전환율 증분',arm.ate.conversion,pp],['고객당 매출 증분',arm.ate.spend,usd]].map(([label,d,f])=>`<div><span>${label}</span><strong>${f(d.diff)}</strong><small class="muted">${ci(d,f)}</small></div>`).join('')}<div><span>무작위 배정</span><strong>${arm.ate.n_treated.toLocaleString('ko-KR')} / ${arm.ate.n_control.toLocaleString('ko-KR')}</strong><small class="muted">발송군 / 미발송군 고객 수</small></div></div>
<section class="card"><div class="card-head"><div><h2>지난 구매 품목별 방문률 증분</h2><p>같은 메일도 받는 사람에 따라 효과가 다릅니다. 막대는 증분, 옆 숫자는 95% 구간입니다.</p></div><span class="badge">공개 실험 데이터</span></div>${arm.past_purchase.map(x=>`<div class="measure-bar"><span>${esc(x.level)}</span><div><i style="width:${Math.max(0,x.visit.diff/maxVisit*100).toFixed(1)}%"></i></div><strong>${pp(x.visit.diff)}</strong><small>${(x.visit.lo*100).toFixed(2)} ~ ${(x.visit.hi*100).toFixed(2)}</small></div>`).join('')}</section>
<div class="grid"><section class="card"><div class="card-head"><div><h2>고객을 골라 보내면 나아지는가</h2><p>${esc(MODEL_KO[arm.uplift.chosen]||arm.uplift.chosen)} 모델로 증분이 클 고객부터 줄 세운 결과입니다. 검증용으로 떼어 둔 고객으로만 평가했습니다.</p></div><span class="badge ${s.rankingWorks?'':'warn'}">Qini ${arm.uplift.qini_visit.toFixed(5)}</span></div>
<svg class="qini" viewBox="-8 -8 536 236" role="img" aria-label="Qini 곡선: 모델 순서와 무작위 순서의 누적 증분 방문 비교"><polyline points="${line.random}" class="qini-random"/><polyline points="${line.model}" class="qini-model"/><text x="0" y="226">발송 0%</text><text x="470" y="226">100%</text></svg>
<p class="compact"><b class="legend-model">모델 순서</b> / <span class="legend-random">무작위 순서</span> / 세로축은 누적 증분 방문 수</p><p>${s.ranking} (Qini 95% 구간 ${arm.uplift.qini_visit_lo.toFixed(5)} ~ ${arm.uplift.qini_visit_hi.toFixed(5)})</p></section>
<section class="card"><div class="card-head"><div><h2>몇 %에게 보낼까</h2><p>고객 ${a.base_customers.toLocaleString('ko-KR')}명, 마진율 ${+(a.margin*100).toFixed(2)}%, 발송 비용 $${a.send_cost.toFixed(2)}${a.coupon_rate?`, 쿠폰 ${+(a.coupon_rate*100).toFixed(2)}%`:''} 가정의 총 증분 이익입니다.</p></div><span class="badge ${changed?'warn':''}">${changed?'바꾼 가정값':'기본 가정값'}</span></div>
<div class="cost-inputs" aria-label="비용 가정">${[['margin','마진율 (%)',+(a.margin*100).toFixed(2),'1','100','0.5'],['send_cost','1명당 발송 비용 ($)',a.send_cost,'0','5','0.01'],['coupon_rate','쿠폰율 (%)',+(a.coupon_rate*100).toFixed(2),'0','99','1'],['base_customers','대상 고객 수 (명)',a.base_customers,'100','10000000','100']].map(([k,label,v,min,max,step])=>`<label><span>${label}</span><input type="number" inputmode="decimal" data-cost="${k}" value="${v}" min="${min}" max="${max}" step="${step}"></label>`).join('')}${changed?btn('기본 가정으로','measure-cost-reset'):''}</div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>발송 범위</th><th>총 증분 이익</th><th>95% 구간</th></tr></thead><tbody>${budget.by_k.map(x=>`<tr class="${x.k_pct===budget.best_k_pct?'best-row':''}"><td>${x.k_pct===0?'보내지 않음':x.k_pct===100?'전원':'상위 '+x.k_pct+'%'}</td><td>${usd0(x.profit_total)}</td><td>${x.profit_total_lo===undefined?'—':usd0(x.profit_total_lo)+' ~ '+usd0(x.profit_total_hi)}</td></tr>`).join('')}</tbody></table></div><p>${s.scope}</p>${changed?'<p class="compact muted">바꾼 가정으로 화면에서 다시 계산한 값입니다. 증분 매출은 실험 결과 그대로이고, 구간은 증분 매출의 95% 구간만 반영합니다.</p>':''}<p class="compact muted">기본 가정에 쿠폰을 붙이면: ${arm.coupon_scenario.filter(x=>x.coupon_rate>0).map(x=>`${x.coupon_rate*100}% 쿠폰은 ${x.best_k_pct===0?'보내지 않는 것이 최적':'최적 범위 '+(x.best_k_pct===100?'전원':'상위 '+x.best_k_pct+'%')+', '+usd0(x.profit_best)}`).join(' / ')}</p></section></div>
<section class="card"><div class="card-head"><div><h2>다음 캠페인의 측정 계획</h2><p>이번 방문률 증분의 절반을 잡아내는 데 필요한 전체 고객 수입니다 (양측 5%, 검정력 80%).</p></div></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>미발송군 비율</th><th>목표 증분</th><th>전체 고객 수</th><th>미발송군 고객 수</th></tr></thead><tbody>${arm.sample_plan.filter(x=>x.outcome==='visit').map(x=>`<tr><td>${x.holdout*100}%</td><td>${pp(x.target_diff)}</td><td>${x.n_total.toLocaleString('ko-KR')}</td><td>${x.n_holdout.toLocaleString('ko-KR')}</td></tr>`).join('')}</tbody></table></div><p class="compact muted">매출 기준으로 재려면 방문 기준보다 열 배 넘는 고객이 필요해, 첫 지표는 방문률로 둡니다. 자세한 계산은 docs/CAMPAIGN-MEASUREMENT.md에 있습니다.</p></section>
<p class="compact muted">자료: ${esc(data.meta.dataset)} / 측정 기간 ${esc(data.meta.period)} / 통화 ${esc(data.meta.currency)}. ${esc(data.meta.note)}</p>`;}
