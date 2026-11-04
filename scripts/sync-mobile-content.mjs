import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {CONFESSION_COPY} from '../dist/confession-copy.js';
import {COPY} from '../dist/content.js';
import {PATHS,ACTIONS,FLOW_COPY} from '../dist/journey.js';
import {COMMUNITY_COPY,EVIDENCE,ACTION_EVIDENCE} from '../dist/community-copy.js';
import {PROFILE_COPY} from '../dist/profile-copy.js';
import {FEED,COURSES,CATEGORIES,ORGANIZATIONS} from '../dist/community-data.js';
import {BOOKS} from '../dist/books.js';
import {PSALM23} from '../dist/psalms.js';
const editions=JSON.parse(await readFile('dist/scripture.json','utf8')).editions;
await mkdir('supabase/functions/_shared',{recursive:true});
await writeFile('supabase/functions/_shared/journey-catalog.json',JSON.stringify({editions,PATHS}));
await mkdir('mobile/src/generated',{recursive:true});
await writeFile('mobile/src/generated/catalog.json',JSON.stringify({editions,COPY,CONFESSION_COPY,FLOW_COPY,COMMUNITY_COPY,PROFILE_COPY,PATHS,ACTIONS,EVIDENCE,ACTION_EVIDENCE,FEED,COURSES,CATEGORIES,ORGANIZATIONS,BOOKS,PSALM23},null,2));
for(const f of ['core.js','journey.js','personalization.js'])await copyFile('dist/'+f,'mobile/src/generated/'+f);
const rows=[...FEED.map(x=>({...x,kind:'feed'})),...COURSES.map(x=>({...x,kind:'course'})),...ORGANIZATIONS.map(x=>({...x,kind:'organization'}))];
await writeFile('supabase/seed-content.sql',rows.map(x=>`INSERT INTO public.content_items(id,kind,data,published) VALUES ('${x.id}','${x.kind}','${JSON.stringify(x).replaceAll("'","''")}'::jsonb,true) ON CONFLICT(id) DO UPDATE SET data=excluded.data;`).join('\n')+'\n');
console.log('Synced sourced mobile content and backend seed.');

for(const f of ['confession-policy.js','confession-service.js'])await copyFile('shared/'+f,'supabase/functions/_shared/'+f);

for (const file of ["quiet-feelings.js", "quiet-diary.js", "quiet-studies.json"]) await copyFile("shared/"+file,"mobile/src/generated/"+file);
