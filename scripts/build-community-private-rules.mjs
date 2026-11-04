import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const rules=JSON.parse(readFileSync(new URL('shared/community-private-rules.json',root),'utf8'));
const books=Object.fromEntries(['web','dra','brenton'].map(id=>[id,JSON.parse(readFileSync(new URL(`mobile/src/generated/bible${id==='web'?'':'-'+id}/index.json`,root),'utf8')).books.map(b=>{
 let path=new URL(`mobile/src/generated/bible${id==='web'?'':'-'+id}/${b.code}.json`,root);
 if(!existsSync(path))path=new URL(`mobile/src/generated/bible/${b.code}.json`,root);
 const content=JSON.parse(readFileSync(path,'utf8'));
 return {code:b.code,name:b.name,chapters:b.chapters,verses:Object.fromEntries(Object.entries(content.chapters).map(([chapter,rows])=>[chapter,rows.filter(v=>/^[1-9][0-9]*$/.test(v.number)&&v.text).map(v=>v.number)]))};
})]));
const quote=s=>"'"+s.replaceAll("'","''")+"'";
const sql=`-- Generated rule catalogue. Runtime logic is in the following migration.
create table private.community_rule_config (
 singleton boolean primary key default true check(singleton),
 active boolean not null default false,
 policy jsonb not null,
 books jsonb not null
);
insert into private.community_rule_config(singleton,policy,books) values(true,${quote(JSON.stringify(rules))}::jsonb,${quote(JSON.stringify(books))}::jsonb);
alter table private.community_rule_config enable row level security;
revoke all on private.community_rule_config from public,anon,authenticated,service_role;
`;
writeFileSync(new URL('supabase/migrations/20261104200000_private_moderation_catalog.sql',root),sql);
writeFileSync(new URL('mobile/src/generated/community-private-rules.json',root),JSON.stringify(rules,null,2)+'\n');
