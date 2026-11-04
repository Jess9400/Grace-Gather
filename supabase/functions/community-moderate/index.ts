import {serve, identity, json} from '../_shared/http.ts';
import {readCommunityScreenRequest} from '../_shared/community-screening-policy.js';
// Compatibility endpoint for earlier app builds. New posts are reviewed in the
// same database transaction as submission, without an external AI provider.
serve(async req => {
  if(req.method !== 'POST') return json({error:'method_not_allowed'},405);
  const {client}=await identity(req);
  const {postId}=await readCommunityScreenRequest(req);
  const {data,error}=await client.rpc('community_check_private',{p_post:postId});
  if(error) return json({error:'not_available'},403);
  return json({publication:data,mode:'private_rules',externalProcessing:false});
});
