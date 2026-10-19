import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
try{process.loadEnvFile(path.join(root,'.env'));}catch(e){if(e.code!=='ENOENT')throw e;}
import {areas} from './public/areas.js';
export {areas};
const cache=new Map(),pending=new Map();
async function cached(key,fn){const old=cache.get(key);if(old&&Date.now()-old.at<300000)return old.data;if(pending.has(key))return pending.get(key);const p=fn().then(data=>{cache.set(key,{data,at:Date.now()});return data;}).finally(()=>pending.delete(key));pending.set(key,p);return p;}
export function field(xml,key){const m=xml.match(new RegExp(`<${key}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${key}>`));return m?m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&').trim():null;}
function num(x){return x===null||x===''||!Number.isFinite(Number(x))?null:Number(x);}
async function fetchTimed(url){const r=await fetch(url,{signal:AbortSignal.timeout(12000),redirect:'error'});if(!r.ok)throw Error(r.status===429?'호출 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.':'제공처 응답 오류입니다. 잠시 후 다시 시도해 주세요.');return r;}
export async function city(area){
 if(areas[area]?.stay)return {state:'unsupported',message:'서울시 실시간 도시데이터는 서울 주요 장소만 제공합니다. 숙박 휴양 지역은 날씨 예보만 조회합니다.'};
 if(!process.env.SEOUL_API_KEY)return {state:'needs-key',message:'서울시 인증키 설정이 필요합니다. 키는 서버의 .env 파일에만 저장합니다.',source:'https://data.seoul.go.kr/dataList/OA-21285/A/1/datasetView.do'};
 return cached('city:'+area,async()=>{const url=`http://openapi.seoul.go.kr:8088/${encodeURIComponent(process.env.SEOUL_API_KEY)}/xml/citydata/1/5/${encodeURIComponent(area)}`;const xml=await(await fetchTimed(url)).text();
 const code=field(xml,'RESULT.CODE')||field(xml,'CODE');if(code&&code!=='INFO-000')return{state:'error',message:code.includes('010')?'인증키를 확인해 주세요.':'서울시 응답 오류 또는 지원 범위를 확인해 주세요.',code};
 const returnedArea=field(xml,'AREA_NM');if(returnedArea&&returnedArea!==area)return {state:'error',message:'요청 지역과 응답 지역이 일치하지 않습니다.'};const congestion=field(xml,'AREA_CONGEST_LVL'),measuredAt=field(xml,'PPLTN_TIME');if(!congestion&&!measuredAt)return{state:'empty',message:'해당 지역에서 표시할 인구 현황을 받지 못했습니다.'};
 return{state:'ok',area,congestion,min:num(field(xml,'AREA_PPLTN_MIN')),max:num(field(xml,'AREA_PPLTN_MAX')),measuredAt,message:field(xml,'AREA_CONGEST_MSG'),roadSpeed:num(field(xml,'ROAD_TRAFFIC_SPD')),roadTime:field(xml,'ROAD_TRAFFIC_TIME'),retrievedAt:new Date().toISOString(),source:'https://data.seoul.go.kr/dataVisual/seoul/guide.do'};
 });
}
export async function weather(area){return cached('weather:'+area,async()=>{const {lat,lon}=areas[area];const url=new URL('https://api.open-meteo.com/v1/forecast');url.search=new URLSearchParams({latitude:lat,longitude:lon,hourly:'temperature_2m,precipitation_probability,wind_speed_10m',timezone:'Asia/Seoul',forecast_days:'7',wind_speed_unit:'ms'});const d=await(await fetchTimed(url)).json();if(!Array.isArray(d.hourly?.time))throw Error('예보 응답 형식이 예상과 다릅니다.');return{state:'ok',area,lat,lon,retrievedAt:new Date().toISOString(),source:'https://open-meteo.com/',note:'지역 대표 좌표의 모델 예보 / 관측값 아님 / 발표시각 미제공',hours:d.hourly.time.map((time,i)=>({time,temp:d.hourly.temperature_2m[i],rain:d.hourly.precipitation_probability[i],wind:d.hourly.wind_speed_10m[i]}))};});}
const publicFiles={'/measurement-data.js':'measurement-data.js','/measurement-ui.js':'measurement-ui.js','/seasonal.js':'seasonal.js','/seasonal-ui.js':'seasonal-ui.js','/portfolio-final.js':'portfolio-final.js','/portfolio-final-ui.js':'portfolio-final-ui.js','/crm.js':'crm.js','/crm-ui.js':'crm-ui.js','/crm-cases.js':'crm-cases.js','/event.js':'event.js','/event-ui.js':'event-ui.js','/event-cases.js':'event-cases.js','/preflight.js':'preflight.js','/preflight-ui.js':'preflight-ui.js','/areas.js':'areas.js','/journey.js':'journey.js','/journey-ui.js':'journey-ui.js','/membership.js':'membership.js','/membership-ui.js':'membership-ui.js','/manual.js':'manual.js','/care.js':'care.js','/care-ui.js':'care-ui.js','/':'index.html','/index.html':'index.html','/app.js':'app.js','/core.js':'core.js','/style.css':'style.css','/downloads/CRM-LOOP-Case-B-Plan.pdf':'downloads/CRM-LOOP-Case-B-Plan.pdf','/downloads/CRM-LOOP-Case-B-Operations.xlsx':'downloads/CRM-LOOP-Case-B-Operations.xlsx'};
export const server=http.createServer(async(req,res)=>{
 const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"};
 const send=(code,data,type='application/json; charset=utf-8',extra={})=>{res.writeHead(code,{...headers,'Content-Type':type,...extra});res.end(type.startsWith('application/json')?JSON.stringify(data):data);};
 try{if(req.method!=='GET')return send(405,{error:'지원하지 않는 요청입니다.'});const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/status')return send(200,{seoulConfigured:!!process.env.SEOUL_API_KEY,areas:Object.keys(areas),weather:'Open-Meteo',storage:'browser'});
 if(['/api/weather','/api/city'].includes(url.pathname)){const area=url.searchParams.get('area');if(!Object.hasOwn(areas,area))return send(400,{state:'error',message:'지원 지역을 선택해 주세요.'});try{return send(200,await(url.pathname==='/api/weather'?weather(area):city(area)));}catch(e){return send(502,{state:'error',message:e.name==='TimeoutError'?'조회 시간이 초과되었습니다. 다시 시도해 주세요.':'외부 데이터 조회에 실패했습니다. 연결과 제공처 상태를 확인해 주세요.'});}}
 if(!Object.hasOwn(publicFiles,url.pathname))return send(404,{error:'페이지가 없습니다.'});const file=publicFiles[url.pathname],ext=path.extname(file),isDownload=['.pdf','.xlsx'].includes(ext);send(200,await readFile(path.join(root,'public',file)),{'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.pdf':'application/pdf','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}[ext],isDownload?{'Content-Disposition':`attachment; filename="${path.basename(file)}"`}:{});
 }catch{send(500,{error:'처리하지 못했습니다. 다시 시도해 주세요.'});}
});
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))server.listen(Number(process.env.PORT)||4318,'127.0.0.1',()=>console.log('CRM LOOP: http://127.0.0.1:'+(Number(process.env.PORT)||4318)));

