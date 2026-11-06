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
