import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
const require=createRequire(import.meta.url), ts=require('typescript'), module={exports:{}};
runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/discussion-api.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports});
const {saveCommunityAction:save,loadCommunity:load,communityError}=module.exports;
test('Community sends only explicitly shared words, alias and exact verse to the checked submission RPC',async()=>{
 const calls=[],client={rpc:async(name,args)=>{calls.push({name,args});return {data:'post-id',error:null};}};
 await save(client,'actor',{type:'topic',title:'  Question  ',body:'  Shared words  ',perspective:'Open discussion',verseId:'brenton:PSA.22.1',reference:'Psalm 22:1'},'  Pen name  ');
 assert.deepEqual(JSON.parse(JSON.stringify(calls)),[{name:'community_submit',args:{p_title:'Question',p_body:'Shared words',p_alias:'Pen name',p_perspective:'Open discussion',p_verse:'brenton:PSA.22.1',p_reference:'Psalm 22:1',p_parent:null}}]);
 await save(client,'actor',{type:'reply',topicId:'topic-id',body:'A reply',perspective:'Open discussion'},'Name');
 assert.equal(calls[1].args.p_parent,'topic-id'); assert.equal(calls[1].args.p_verse,null);
});
test('Community mutations use separate server-authorized moderation, report and deletion RPCs',async()=>{
 const calls=[],client={rpc:async(name,args)=>{calls.push({name,args});return {error:null};}};
 for(const action of [{type:'review',postId:'p',approve:true},{type:'report',postId:'p',reason:' Spam '},{type:'resolve',reportId:'r',remove:true},{type:'delete',postId:'p'}])await save(client,'actor',action,'Name');
 assert.deepEqual(calls.map(c=>c.name),['community_review','community_report','community_resolve','community_delete']);
 assert.equal(calls[1].args.p_reason,'Spam');
 await assert.rejects(save(client,'actor',{type:'block',author:'actor'},'Name'),/yourself/);
});
test('failed Community reads and writes propagate errors rather than showing sample success',async()=>{
 const client={rpc:async()=>({data:null,error:{message:'rate_limited'}})};
 await assert.rejects(load(client),/rate_limited/);
 await assert.rejects(save(client,'actor',{type:'delete',postId:'p'},'Name'),/rate_limited/);
 assert.match(communityError(new Error('rate_limited')),/pause/);
 assert.doesNotMatch(communityError(new Error('provider echoed sensitive data')),/sensitive data/);
});
test('Community discovers private moderation from the server and fails closed without its status',async()=>{
 const calls=[];
 const snapshot={topics:[],blocked:[],reports:[],userId:'actor',moderator:false};
 const client={rpc:async(name)=>{calls.push(name);return {data:name==='community_snapshot'?snapshot:{active:true,mode:'private_rules',externalProcessing:false,version:1},error:null};}};
 assert.equal((await load(client)).moderation.mode,'private_rules');
 assert.deepEqual(calls,['community_snapshot','community_moderation_status']);
 const unavailable={rpc:async(name)=>name==='community_snapshot'?{data:snapshot,error:null}:{data:null,error:{message:'missing function'}}};
 assert.equal((await load(unavailable)).moderation,undefined);
});
