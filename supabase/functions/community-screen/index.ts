import {serve, identity, json} from '../_shared/http.ts';
import {readCommunityScreenRequest} from '../_shared/community-screening-policy.js';
// Private compatibility check. No text is sent to a model or other processor.
serve(async req => {
  if(req.method !== 'POST') return json({error:'method_not_allowed'},405);
  const {client}=await identity(req);
  const {postId}=await readCommunityScreenRequest(req);
  const {data,error}=await client.rpc('community_check_private',{p_post:postId});
  return error ? json({error:'not_available'},403) : json({publication:data,mode:'private_rules',externalProcessing:false});
});
