import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
const ts=createRequire(import.meta.url)('typescript');
const module={exports:{}};
runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/church-calendar.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports});
const {welcomesCandles}=module.exports;
test('explicit practice choice overrides tradition defaults',()=>{
 assert.equal(welcomesCandles({tradition:'protestant'}),false);
 assert.equal(welcomesCandles({tradition:'catholic'}),true);
 assert.equal(welcomesCandles({tradition:'orthodox'}),true);
 assert.equal(welcomesCandles({tradition:'protestant',candlePractice:true}),true);
 assert.equal(welcomesCandles({tradition:'catholic',candlePractice:false}),false);
 assert.equal(welcomesCandles({tradition:'protestant',faithChoice:'exploring'}),true);
});
const geometry={exports:{}};
runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/gl-mesh.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:geometry,exports:geometry.exports});
const scene={exports:{}};
runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/church-scene.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:scene,exports:scene.exports,require:()=>geometry.exports});
function prayerCorner(protestant,candlesAllowed){
 const vertices=scene.exports.buildChurchMesh({adventWeek:0,litVotives:0,protestant,candlesAllowed});
 const selected=[];
 for(let i=0;i<vertices.length;i+=11)if(vertices[i]>.65&&vertices[i+2]>-4.6&&vertices[i+2]<-3.5)selected.push(...vertices.slice(i,i+11));
 return selected;
}
test('candle preference does not replace a tradition’s confession or prayer corner',()=>{
 for(const protestant of [true,false])assert.deepEqual(prayerCorner(protestant,true),prayerCorner(protestant,false));
 assert.notDeepEqual(prayerCorner(true,true),prayerCorner(false,true));
});
test('explicit Orthodox onboarding controls room selection without overriding skips',()=>{
 const {isOrthodox}=module.exports;
 assert.equal(isOrthodox({tradition:'orthodox'}),true);
 assert.equal(isOrthodox({tradition:'catholic',faithChoice:'orthodox'}),true);
 assert.equal(isOrthodox({tradition:'orthodox',faithChoice:'protestant'}),false);
 assert.equal(isOrthodox({tradition:'orthodox',faithChoice:'exploring'}),false);
});
test('three room variants produce distinct finite geometry',()=>{
 const options={adventWeek:0,litVotives:0};
 const rooms=[scene.exports.buildChurchMesh(options),scene.exports.buildChurchMesh({...options,protestant:true}),scene.exports.buildChurchMesh({...options,orthodox:true})];
 for(const room of rooms) assert.ok(room.length>0 && room.every(Number.isFinite));
 assert.equal(new Set(rooms.map(r=>r.length)).size,3);
});
