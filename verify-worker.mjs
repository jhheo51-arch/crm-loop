import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import worker from './dist/server/index.js';
for(const path of ['/','/app.js','/preflight.js','/preflight-ui.js']){const r=await worker.fetch(new Request('https://test.local'+path),{});assert.equal(r.status,200);}
assert.equal((await worker.fetch(new Request('https://test.local/.env'),{})).status,404);
assert.equal((await worker.fetch(new Request('https://test.local/api/city?area=no'),{})).status,400);
const state=await (await worker.fetch(new Request('https://test.local/api/status'),{})).json();assert.equal(state.areas.length,140);assert.equal(state.seoulConfigured,false);
console.log('Worker routing, 140 areas, secret-file protection and missing-key status passed.');
