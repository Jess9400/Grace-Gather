import { parseCommunityDecision } from './community-screening-policy.js';

// Internal identifiers and ownership are used only to load the correct item;
// they are never included in the model's request.
export async function decideRecheck(job, deps) {
  let snapshot=null;
  try {
    snapshot=await deps.candidate(job.kind,job.source_id);
    if(!snapshot) return {snapshot:null,outcome:'skip'};
    let transcript='';
    if(snapshot.audioType) {
      const recording=await deps.download(job.source_id,snapshot.audioType);
      if(!await deps.permission(snapshot.author)) return {snapshot,outcome:'skip'};
      transcript=await deps.transcribe(recording,snapshot.language,snapshot.author);
      if(typeof transcript!=='string'||transcript.trim().length<3||transcript.length>30000) throw Error('invalid_audio');
    }
    if(!await deps.permission(snapshot.author)) return {snapshot,outcome:'skip'};
    const body=[snapshot.body,transcript].filter(Boolean).join('\n');
    if(!body.trim()) throw Error('empty_content');
    const raw=await deps.screen({kind:job.kind,title:snapshot.title,body,displayName:snapshot.displayName,language:snapshot.language,perspective:snapshot.perspective},snapshot.author);
    return {snapshot,outcome:parseCommunityDecision(raw).publish?'safe':'hold'};
  } catch { return {snapshot,outcome:'retry'}; }
}
