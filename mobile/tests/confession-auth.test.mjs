import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
const ts=createRequire(import.meta.url)('typescript');
function api(client) {
 const module={exports:{}};
 runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/confession.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:(name)=>name==='./backend'?{requireBackend:()=>client}:{uploadConfession:()=>{throw Error('unexpected upload');}}});
 return module.exports.confessionAPI;
}
test('Offer comfort identifies missing sign-in without requesting confession data',async()=>{
 let calls=0;
 const request=api({auth:{getSession:async()=>({data:{session:null},error:null})},functions:{invoke:async()=>{calls++;}}});
 await assert.rejects(request('list',{language:'en'}),/sign_in_required/);
 assert.equal(calls,0);
});
test('signed-in listeners receive the server list and server failures stay failures',async()=>{
 const result={items:[],reserved:[]};
 const client={auth:{getSession:async()=>({data:{session:{access_token:'token'}},error:null})},functions:{invoke:async()=>({data:result,error:null})}};
 assert.equal(await api(client)('list'),result);
 client.functions.invoke=async()=>({error:{context:{status:401,json:async()=>{throw Error('no body');}}}});
 await assert.rejects(api(client)('list'),/sign_in_required/);
 client.functions.invoke=async()=>({error:{context:{status:503,json:async()=>({error:'unavailable'})}}});
 await assert.rejects(api(client)('list'),/unavailable/);
});
