import {seasons,companions,purposes,crmSegments,journey,groups,limits,recommend,increment,sampleSize,emptyChoice} from './seasonal.js';

export function emptySeasonal(){return {choice:emptyChoice(),inputs:{custom:{n:'',booked:''},discount:{n:'',booked:''},holdout:{n:'',booked:''},base:'',lift:''},example:false};}

const pp=x=>(x>=0?'+':'')+(x*100).toFixed(2)+'%p',rate=x=>(x*100).toFixed(2)+'%';
const num=x=>x===''||x===null||x===undefined?NaN:Number(x);

export function seasonalResults(inputs){
 const g=k=>({n:num(inputs[k].n),booked:num(inputs[k].booked)}),c=g('holdout');
 return {custom:increment(g('custom'),c),discount:increment(g('discount'),c),n:sampleSize(num(inputs.base)/100,num(inputs.lift)/100)};
}

export function seasonalView(state,h){
 const {btn,esc,note}=h,c=state.choice,s=seasons[c.season];
 let rec=null,err='';try{rec=recommend(c);}catch(e){err=e.message;}
 const chips=(key,list)=>`<div class="choice-chips" role="group">${list.map(x=>btn(esc(x),'season-pick',c[key]===x?'selected':'',`data-key="${key}" data-id="${esc(x)}" aria-pressed="${c[key]===x}"`)).join('')}</div>`;
 const r=seasonalResults(state.inputs),tag=state.example?'<span class="badge warn">가상 예시 데이터</span>':'<span class="badge">직접 입력</span>';
 const input=(path,label,val,hint='')=>`<label class="field"><span>${label}</span><input type="number" min="0" step="any" data-seasonal="${path}" value="${esc(val)}">${hint?`<small>${hint}</small>`:''}</label>`;
 const inc=x=>x?`<strong>${pp(x.diff)}</strong><small class="muted">예약률 ${rate(x.pt)} / 95% 구간 ${(x.lo*100).toFixed(2)} ~ ${(x.hi*100).toFixed(2)}</small>`:'<strong>—</strong><small class="muted">대상 수와 예약 수를 넣으면 계산합니다.</small>';
 return `
<section class="card crm-hero"><div><div class="eyebrow">CRM LOOP / CASE C</div><h2>봄과 가을 주중 1박을 자사몰 예약과 멤버십 재방문으로 잇습니다.</h2><p>호텔과 리조트를 여러 지역에서 운영하는 가상의 숙박 브랜드를 두고 만든 캠페인 <b>리셋 미드위크</b> 설계 제안입니다. 특정 회사의 실제 캠페인, 고객 데이터, 성과를 담지 않았습니다.</p></div><div class="crm-role"><span>사례 C</span><strong>비수기 체류<br>캠페인 기획</strong><p>설계 제안 / 가상 예시 / 측정 설계 포함</p></div></section>
<div class="grid"><section class="card"><div class="eyebrow">문제</div><h2>봄과 가을 주중은 떠날 이유가 약합니다.</h2><p>겨울 스키, 여름 물놀이처럼 이유가 분명한 시즌과 주말에는 수요가 몰립니다. 이 사례는 아래 두 가지를 <b>검증 가설</b>로 둡니다.</p><ol class="action-list"><li><b>고르기 어렵다.</b> 떠나고 싶어도 동행, 취향, 목적에 맞는 지점과 체험을 한 번에 고르기 어렵다.</li><li><b>할인만으로는 남는 것이 없다.</b> 할인으로 당긴 예약은 다음 할인을 기다리게 만들고 다시 올 이유가 쌓이지 않는다.</li></ol></section>
<section class="card"><div class="eyebrow">고객 여정</div><h2>1번과 5번이 핵심입니다.</h2><div class="crm-lifecycle">${journey.map(([t],i)=>`<span><b>${String(i+1).padStart(2,'0')}</b>${t}</span>`).join('')}</div><ul class="action-list">${journey.map(([t,d])=>`<li><span class="dot"></span><span><b>${t}</b> ${d}</span></li>`).join('')}</ul><p class="compact muted">1번의 세 가지 선택은 개인정보 없이도 추천과 메시지를 나눌 근거가 되고, 5번의 희망 시기는 고객이 다음 발송 시점을 직접 정해 주는 정보입니다.</p></section></div>
<section class="card"><div class="card-head"><div><h2>캠페인 화면: 세 가지를 고르면 추천합니다</h2><p>자사몰 캠페인 페이지의 흐름을 그대로 눌러 볼 수 있습니다.</p></div><div class="actions">${Object.keys(seasons).map(x=>btn(x,'season-pick',c.season===x?'selected':'',`data-key="season" data-id="${x}" aria-pressed="${c.season===x}"`)).join('')}</div></div>
<div class="season-steps"><div><span class="eyebrow">01 동행</span>${chips('companion',companions)}</div><div><span class="eyebrow">02 여행 목적</span>${chips('purpose',purposes)}</div><div><span class="eyebrow">03 ${c.season} 선호 활동</span>${chips('activity',s.keywords)}</div></div>
${err?note(esc(err),'error'):rec?`<div class="case-grid"><div><span>추천 패키지 (${esc(rec.season)} 주중 1박)</span><strong>${rec.items.map(esc).join(', ')}</strong></div><div><span>적용 고객군과 메시지</span><strong>${esc(rec.segment)} / ${esc(rec.message)}</strong></div><div><span>체크인 전 안내</span><strong>${esc(rec.before)}</strong></div><div><span>체크아웃 뒤</span><strong>${esc(rec.after)}</strong></div></div>${rec.fixed?'':note(esc(rec.note),'warn')}<p class="compact muted">실제로 적용할 때는 지점별 운영 시설과 프로그램을 공개 안내와 운영 담당자에게 확인한 뒤에만 넣습니다.</p>${btn('다시 고르기','season-reset')}`:'<div class="empty">세 가지를 모두 고르면 추천 패키지와 예약 후 안내가 나옵니다.</div>'}</section>
<section class="card"><div class="card-head"><div><h2>CRM 운영: 왜 보내는지와 누구를 빼는지</h2><p>개인정보 없이 가상 고객군과 가상 행동 태그로만 나눕니다. 실제 기준 기간과 횟수는 내부 데이터로 정할 값이라 비워 둡니다.</p></div><span class="badge">가상 고객군</span></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>고객군</th><th>진입 신호 (가상)</th><th>제안 메시지</th><th>제외 조건</th></tr></thead><tbody>${crmSegments.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.signal)}</td><td>${esc(x.message)}</td><td>${esc(x.exclude)}</td></tr>`).join('')}</tbody></table></div><p class="compact muted">수신거부 고객과 접촉 상한에 도달한 고객은 어느 고객군에서도 뺍니다. 실제 운영에서는 동의, 보관 기간, 접근 권한을 따로 검토합니다.</p></section>
<section class="card"><div class="card-head"><div><h2>측정 대시보드: 세 군으로 나눠 할인과 비교합니다</h2><p>"할인보다 맞춤 제안이 낫다"는 주장은 비교군 없이 확인할 수 없어, 시작할 때부터 무작위로 세 군에 배정합니다.</p></div>${tag}</div>
<div class="data-table-wrap"><table class="data-table"><thead><tr><th>군</th><th>받는 것</th><th>답하는 질문</th></tr></thead><tbody>${groups.map(x=>`<tr><td><b>${x.name}</b></td><td>${x.gets}</td><td>${x.question}</td></tr>`).join('')}</tbody></table></div>
<div class="form-grid spacer">${groups.map(x=>input(x.key+'.n',x.name+' 대상 수',state.inputs[x.key].n)+input(x.key+'.booked',x.name+' 예약 수',state.inputs[x.key].booked)).join('')}</div>
<div class="event-kpis"><div><span>맞춤 제안 증분 예약률</span>${inc(r.custom)}</div><div><span>할인 제안 증분 예약률</span>${inc(r.discount)}</div><div><span>맞춤 - 할인</span>${r.custom&&r.discount?`<strong>${pp(r.custom.diff-r.discount.diff)}</strong><small class="muted">구간이 겹치면 둘을 구별했다고 말하지 않습니다.</small>`:'<strong>—</strong>'}</div><div><span>군마다 필요한 고객 수</span><strong>${r.n?r.n.toLocaleString('ko-KR')+'명':'—'}</strong><small class="muted">현재 예약률과 기대 증분을 넣으면 계산합니다.</small></div></div>
<div class="form-grid">${input('base','현재 예약률 (%)',state.inputs.base,'내부 데이터로 넣을 값입니다.')}${input('lift','기대 증분 (%p)',state.inputs.lift,'양측 5%, 검정력 80% 기준')}</div>
<div class="actions">${btn('가상 예시 값 넣기','season-example')}${btn('값 지우기','season-clear')}</div>
<p class="compact muted">증분 예약률은 각 발송군 예약률에서 미발송군 예약률을 뺀 값입니다. 사례 A와 같은 방법으로 95% 구간을 함께 봅니다. 보호 지표로 수신거부율과 할인 기간에만 예약하는 고객 비율을 같이 봅니다. 가상 예시 값은 화면 동작을 보여 주기 위한 것이며 실제 결과가 아닙니다.</p></section>
<section class="card"><div class="eyebrow">한계와 다음 검증</div><h2>내부 데이터와 운영 담당자 확인이 먼저입니다.</h2><ul class="action-list">${limits.map(x=>`<li><span class="dot"></span><span>${x}</span></li>`).join('')}</ul></section>`;}
