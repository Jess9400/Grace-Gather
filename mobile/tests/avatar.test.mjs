import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
const ts=createRequire(import.meta.url)('typescript');
function freshClient(){const module={exports:{}};runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/avatar.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports});return module.exports.avatarVariant;}
test('member avatar survives new clients and evenly uses all four celestial mascots',()=>{
 const first=freshClient(), other=freshClient(), counts=[0,0,0,0];
 for(let i=0;i<1000;i++){const id=`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`;const variant=first(id);assert.equal(variant,other(id));assert.ok(Number.isInteger(variant)&&variant>=0&&variant<4);counts[variant]++;}
 assert.ok(counts.every(n=>n>200 && n<300));
});
