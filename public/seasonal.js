// 사례 C. 비수기 주중 체류 캠페인 (리셋 미드위크). 가상 숙박 브랜드를 두고 만든 설계 제안이며 실제 회사의 캠페인, 고객, 성과가 아닙니다.
export const seasons={
 봄:{keywords:['산책','바다','숲','브런치'],base:['객실 1박','사진 미션']},
 가을:{keywords:['러닝','단풍','웰니스','식음'],base:['객실 1박']}
};
export const companions=['가족','커플','친구나 혼자'];
export const purposes=['휴식','활동','식음'];
const activityItem={산책:'지역 산책 지도',바다:'바닷길 산책 지도',숲:'숲길 산책 지도',브런치:'브런치',러닝:'아침 러닝 코스',단풍:'아침 단풍 산책',웰니스:'스파나 사우나',식음:'지역 식음'};

export const crmSegments=[
 {name:'가족 체험형',signal:'키즈 시설이나 물놀이 시설을 이용한 적이 있음',message:'주중 가족 체험과 늦은 체크아웃',exclude:'학기 중 주중 일정이 어려운 고객은 주말 안내로 분리'},
 {name:'커플 휴식형',signal:'식음이나 스파 패키지를 고른 적이 있음',message:'브런치와 웰니스 중심 1박',exclude:'최근 30일 안에 같은 지점을 이용한 고객'},
 {name:'액티비티형',signal:'스키, 골프, 러닝 같은 활동 상품에 반응',message:'러닝이나 산책과 회복 프로그램',exclude:'활동 상품의 시즌이 겹쳐 이미 예약한 고객'},
 {name:'휴면 고객',signal:'정해진 기간 동안 예약과 반응이 없음',message:'이전에 방문한 지역과 다른 계절 경험을 가볍게 제안',exclude:'수신거부 고객, 접촉 상한에 도달한 고객'}
];

export const journey=[
 ['고르기','동행 형태, 여행 목적, 선호 활동 세 가지를 고릅니다.'],
 ['추천','계절과 조건에 맞는 지점, 객실, 체험 조합을 보여 줍니다.'],
 ['예약','객실만 고르거나 체험, 식음, 늦은 체크아웃을 더한 패키지를 고릅니다.'],
 ['체크인 전','일정 안내와 준비물을 보냅니다.'],
 ['체크아웃 뒤','후기나 다음 여행 희망 시기를 남기면 다음 비수기 예약에 쓸 맞춤 혜택을 제안합니다.']
];

export const groups=[
 {key:'custom',name:'맞춤 제안군',gets:'고객군별 계절 체험 제안',question:'맞춤 제안이 예약을 얼마나 늘리는가'},
 {key:'discount',name:'할인 제안군',gets:'같은 기간의 객실 할인 안내',question:'할인만 했을 때는 얼마나 늘리는가'},
 {key:'holdout',name:'미발송군 (홀드아웃)',gets:'캠페인 메시지를 받지 않음',question:'메시지가 없어도 예약했을 고객은 얼마인가'}
];

export const limits=[
 '봄과 가을 주중 수요가 실제로 비어 있는지는 내부 예약 데이터로 먼저 확인해야 합니다.',
 '지점별 시설과 프로그램의 운영 여부, 객실 재고, 가격과 예산은 운영 담당자와 확인해야 합니다.',
 '세 군 무작위 배정은 발송 시스템과 자사몰에 배정 기록을 남길 수 있어야 가능합니다.',
 '맞춤 제안이 할인보다 효과가 작을 수도 있습니다. 그 경우 결과를 그대로 적고, 재예약에서 차이가 나는지 따로 봅니다.'
];

export function emptyChoice(){return {season:'봄',companion:'',purpose:'',activity:''};}

export function segmentFor(c){
 if(c.companion==='가족')return {name:'가족 체험형',fixed:true};
 if(c.purpose==='활동')return {name:'액티비티형',fixed:true};
 if(c.companion==='커플')return {name:'커플 휴식형',fixed:true};
 return {name:'커플 휴식형',fixed:false,note:'친구나 혼자 떠나는 휴식, 식음 고객은 따로 정한 고객군이 없어 커플 휴식형 메시지를 시험 적용합니다. 반응이 다르면 고객군을 새로 나눕니다.'};
}

export function recommend(c){
 const s=seasons[c.season];
 if(!s)throw Error('계절을 확인해 주세요.');
 if(!c.companion||!c.purpose||!c.activity)return null;
 if(!companions.includes(c.companion)||!purposes.includes(c.purpose)||!s.keywords.includes(c.activity))throw Error('선택 항목을 확인해 주세요.');
 const seg=segmentFor(c),items=[...s.base];
 items.splice(1,0,activityItem[c.activity]);
 if(seg.name==='가족 체험형')items.push('늦은 체크아웃');
 if(c.purpose==='식음'&&c.activity!=='식음'&&c.activity!=='브런치')items.push(c.season==='봄'?'브런치':'지역 식음');
 if(c.purpose==='휴식'&&c.season==='봄'&&c.activity!=='브런치')items.push('브런치');
 if(c.purpose==='휴식'&&c.season==='가을'&&c.activity!=='웰니스')items.push('스파나 사우나');
 const segment=crmSegments.find(x=>x.name===seg.name);
 return {season:c.season,segment:seg.name,fixed:seg.fixed,note:seg.note||'',items:[...new Set(items)],message:segment.message,exclude:segment.exclude,
  before:`${c.season} 주중 1박 일정표, ${activityItem[c.activity]} 안내, 준비물, 체크인 시간`,
  after:'후기 또는 다음 여행 희망 시기를 남기면 다음 비수기 주중 예약에 쓸 맞춤 혜택 제안'};
}

const Z=1.959963984540054,ZB=0.8416212335729143;
// 증분 예약률: 발송군 예약률에서 미발송군 예약률을 뺀 값과 95% 신뢰구간 (두 비율 차이의 정규 근사)
export function increment(t,c){
 for(const x of [t,c])if(!(x.n>0)||!(x.booked>=0)||x.booked>x.n)return null;
 const pt=t.booked/t.n,pc=c.booked/c.n,se=Math.sqrt(pt*(1-pt)/t.n+pc*(1-pc)/c.n),d=pt-pc;
 return {pt,pc,diff:d,lo:d-Z*se,hi:d+Z*se};
}
// 군마다 필요한 고객 수: 현재 예약률 base에서 증분 lift를 양측 5%, 검정력 80%로 잡아내는 데 필요한 수
export function sampleSize(base,lift){
 if(!(base>0&&base<1)||!(lift>0)||base+lift>=1)return null;
 const p1=base+lift;
 return Math.ceil((Z+ZB)**2*(base*(1-base)+p1*(1-p1))/lift**2);
}
// 화면의 "가상 예시 값 넣기" 버튼이 넣는 값. 실제 캠페인 결과가 아닙니다.
export const exampleInputs={custom:{n:10000,booked:420},discount:{n:10000,booked:400},holdout:{n:10000,booked:300},base:3,lift:0.5};
