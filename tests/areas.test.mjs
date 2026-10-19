import test from 'node:test';
import assert from 'node:assert/strict';
import {places,districts,areas,stays,stayGroups,seoulAreas} from '../public/areas.js';
import {city} from '../server.mjs';
test('공식 121장소를 중복 없이 모두 포함한다',()=>{assert.equal(places.length,121);assert.equal(new Set(places.map(p=>p.code)).size,121);assert.equal(Object.keys(seoulAreas).length,121);for(const p of places){assert.ok(p.districts.length);assert.ok(p.districts.every(d=>districts.includes(d)));assert.ok(p.lat>37&&p.lat<38);assert.ok(p.lon>126&&p.lon<128);}});
test('구에서 세부 지역으로 탐색하고 서울 외 지역을 구분한다',()=>{assert.ok(areas['홍대 관광특구'].districts.includes('마포구'));assert.ok(areas['신촌, 이대역'].districts.includes('서대문구'));assert.deepEqual(areas['서울대공원'].districts,['서울 외, 과천시']);assert.equal(districts.length,26);});
test('서울 밖 숙박 휴양 지역 19곳은 권역으로 나누고 날씨만 조회한다',async()=>{assert.equal(stays.length,19);assert.equal(Object.keys(areas).length,140);for(const s of stays){assert.ok(s.stay&&s.districts.every(g=>stayGroups.includes(g)));assert.ok(s.lat>33&&s.lat<39&&s.lon>126&&s.lon<130);assert.ok(!s.name.includes('소노'));}assert.ok(stayGroups.every(g=>stays.some(s=>s.districts.includes(g))));assert.equal((await city('강원 홍천')).state,'unsupported');});
