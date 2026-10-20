// README 대표 이미지(사례 A 결과)를 analysis/results/hillstrom.json에서 그립니다.
// 1) node scripts/write_case_a_chart.mjs 로 HTML을 만들고
// 2) 출력된 Edge 명령으로 assets/case-a-results.png를 찍습니다.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const d=JSON.parse(readFileSync(join(root,'analysis/results/hillstrom.json'),'utf8'));
const arms=[
  {key:'mens',name:'남성용 메일',color:'#2a78d6'},
  {key:'womens',name:'여성용 메일',color:'#eb6834'},
];
const W=1200,H=600;
const ink='#0b0b0b',ink2='#52514e',muted='#8a8984',grid='#e6e5e1';
const pct=v=>(v*100).toFixed(2);
const usd=v=>'$'+Math.round(v).toLocaleString('en-US');
const t=(x,y,s,o={})=>`<text x="${x}" y="${y}" font-size="${o.size||14}" fill="${o.fill||ink2}" font-weight="${o.weight||400}" text-anchor="${o.anchor||'start'}">${s}</text>`;

// 왼쪽: 지난 구매 품목별 메일 덕분에 늘어난 방문률
const segOrder=['남성용만','여성용만','남성용, 여성용 모두'];
const segLabel={'남성용만':'남성용 상품만 산 고객','여성용만':'여성용 상품만 산 고객','남성용, 여성용 모두':'둘 다 산 고객'};
const L={x:60,y:150,w:500,h:380};
const xMax=0.18,labelW=170;
const sx=v=>L.x+labelW+v/xMax*(L.w-labelW);
let left=t(L.x,L.y-34,'지난 구매 품목별, 메일 덕분에 늘어난 방문률',{size:18,fill:ink,weight:700});
left+=t(L.x,L.y-10,'메일을 보내지 않은 고객과 비교한 차이, 가는 선은 95% 구간',{size:13});
for(const v of [0,0.05,0.10,0.15]){
  left+=`<line x1="${sx(v)}" x2="${sx(v)}" y1="${L.y+8}" y2="${L.y+L.h-26}" stroke="${grid}"/>`;
  left+=t(sx(v),L.y+L.h-6,`+${v*100}%p`,{size:12,fill:muted,anchor:'middle'});
}
const band=(L.h-40)/3,barH=26;
segOrder.forEach((seg,i)=>{
  const gy=L.y+14+i*band;
  left+=t(L.x,gy+barH+8,segLabel[seg],{size:14,fill:ink});
  arms.forEach((a,j)=>{
    const s=d.arms[a.key].segments.past_purchase.find(r=>r.level===seg).visit;
    const y=gy+j*(barH+4);
    const x0=sx(0),x1=sx(s.diff);
    left+=`<path d="M${x0},${y} H${x1-4} Q${x1},${y} ${x1},${y+4} V${y+barH-4} Q${x1},${y+barH} ${x1-4},${y+barH} H${x0} Z" fill="${a.color}"/>`;
    left+=`<line x1="${sx(s.lo)}" x2="${sx(s.hi)}" y1="${y+barH/2}" y2="${y+barH/2}" stroke="${ink}" stroke-width="1.5"/>`;
    left+=t(sx(s.hi)+8,y+barH/2+5,`+${pct(s.diff)}%p`,{size:13,fill:ink,weight:seg==='남성용만'&&a.key==='womens'?700:400});
  });
});

// 오른쪽: 발송 범위별 이익
const R={x:650,y:150,w:500,h:380};
const yMax=2000;
const px=k=>R.x+50+k/100*(R.w-90);
const py=v=>R.y+R.h-30-v/yMax*(R.h-50);
let right=t(R.x,R.y-34,'점수 상위 몇 %에게 보낼 때 이익이 가장 큰가',{size:18,fill:ink,weight:700});
right+=t(R.x,R.y-10,'고객 1만 명 기준 늘어난 이익 (USD), 가정값으로 계산',{size:13});
for(const v of [0,500,1000,1500,2000]){
  right+=`<line x1="${px(0)}" x2="${px(100)}" y1="${py(v)}" y2="${py(v)}" stroke="${grid}"/>`;
  right+=t(px(0)-10,py(v)+4,usd(v),{size:12,fill:muted,anchor:'end'});
}
for(const k of [0,20,40,60,80,100]) right+=t(px(k),R.y+R.h-6,k===100?'전원':k===0?'보내지 않음':`상위 ${k}%`,{size:12,fill:muted,anchor:'middle'});
for(const a of arms){
  const b=d.arms[a.key].budget;
  const pts=b.by_k.map(r=>`${px(r.k_pct)},${py(r.profit_total)}`).join(' ');
  right+=`<polyline points="${pts}" fill="none" stroke="${a.color}" stroke-width="2.5" stroke-linejoin="round"/>`;
  for(const r of b.by_k){
    const best=r.k_pct===b.best_k_pct;
    right+=`<circle cx="${px(r.k_pct)}" cy="${py(r.profit_total)}" r="${best?7:4}" fill="${a.color}" stroke="#fff" stroke-width="2"/>`;
  }
  const best=b.by_k.find(r=>r.k_pct===b.best_k_pct);
  const label=a.key==='mens'?`전원 발송 ${usd(best.profit_total)}`:`상위 ${best.k_pct}% ${usd(best.profit_total)}`;
  right+=t(px(best.k_pct)+(a.key==='mens'?-12:0),py(best.profit_total)+(a.key==='mens'?-14:-16),label,{size:14,fill:ink,weight:700,anchor:a.key==='mens'?'end':'middle'});
}

const legend=arms.map((a,i)=>`<rect x="${60+i*150}" y="74" width="14" height="14" rx="3" fill="${a.color}"/>${t(82+i*150,86,a.name,{size:14,fill:ink})}`).join('');
const as=d.assumptions;
const foot=`공개 이메일 실험 ${d.meta.rows.toLocaleString('en-US')}명 (Hillstrom, 2008, 2주 관찰). 이익은 마진율 ${as.margin*100}%, 1통 발송 비용 $${as.send_cost}, 쿠폰 없음을 가정했습니다. 숫자 출처: analysis/results/hillstrom.json`;

const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',sans-serif">
<rect width="${W}" height="${H}" fill="#fcfcfb"/>
${t(60,48,'사례 A. 같은 메일도 받는 고객에 따라 효과가 달랐습니다',{size:24,fill:ink,weight:700})}
${legend}
${left}
${right}
${t(60,H-22,foot,{size:12,fill:muted})}
</svg>`;

const outDir=join(tmpdir(),'crm-loop-chart');
mkdirSync(outDir,{recursive:true});
const html=join(outDir,'case-a.html');
writeFileSync(html,`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#fcfcfb}</style>${svg}`);
const png=join(root,'assets','case-a-results.png');
console.log(`"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --window-size=${W},${H} --screenshot="${png}" "${html}"`);
