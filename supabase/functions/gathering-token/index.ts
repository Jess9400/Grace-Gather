import { AccessToken, RoomServiceClient, TrackSource } from 'npm:livekit-server-sdk@2.19.2';
import { serve,identity,json,env } from '../_shared/http.ts';
const configured=()=>['LIVEKIT_URL','LIVEKIT_API_KEY','LIVEKIT_API_SECRET'].every(k=>!!Deno.env.get(k));
serve(async(req)=>{
 if(req.method==='GET')return json({configured:configured(),audioOnly:true,missing:['LIVEKIT_URL','LIVEKIT_API_KEY','LIVEKIT_API_SECRET'].filter(k=>!Deno.env.get(k))});
 const {user,client,service}=await identity(req);const body=await req.json();
 if(!configured())return json({error:'audio_not_configured'},503);
 const server=new RoomServiceClient(env('LIVEKIT_URL').replace('wss:','https:'),env('LIVEKIT_API_KEY'),env('LIVEKIT_API_SECRET'));
 if(body.action==='catalog'){
  const allowed=await client.rpc('gathering_command',{p_action:'list'});if(allowed.error)throw allowed.error;
  const ids=(allowed.data??[]).map((g:{id:string})=>g.id);if(!ids.length)return json({rooms:[]});
  const records=await service.from('gatherings').select('id,room_name').in('id',ids);if(records.error)throw records.error;
  const rooms=await server.listRooms((records.data??[]).map(g=>g.room_name));return json({rooms:rooms.map(r=>({id:records.data?.find(g=>g.room_name===r.name)?.id,participants:r.numParticipants}))});
 }
 const record=await service.from('gatherings').select('*').eq('id',body.gatheringId).maybeSingle();if(record.error)throw record.error;const g=record.data;
 if(!g)return json({error:'unavailable'},404);const host=g.host_id===user.id;
 const participation=await client.rpc('participation_allowed');if(participation.error||!participation.data)return json({error:'not_allowed'},403);
 if(body.action==='close'){
  if(!host)return json({error:'host_required'},403);
  const updated=await service.from('gatherings').update({status:'ended'}).eq('id',g.id);if(updated.error)throw updated.error;
  // Closing is retryable. Persist closure first so no new access tokens can be issued.
  try{await server.deleteRoom(g.room_name);}catch(e){if((e as {code?:string}).code!=='not_found')return json({error:'close_retry'},503);}
  return json({closed:true});
 }
 if(g.status!=='published'||Date.now()>=Date.parse(g.ends_at))return json({error:'ended'},409);
 if(body.action==='state'){
  const membership=await client.from('memberships').select('user_id,hand_raised,can_speak').eq('gathering_id',g.id);
  if(membership.error)throw membership.error;
  if(!host&&!membership.data.some(m=>m.user_id===user.id))return json({error:'not_allowed'},403);
  return json({hands:host?membership.data.filter(m=>m.hand_raised).map(m=>m.user_id):[],endsAt:g.ends_at});
 }
 if(['speaker','remove'].includes(body.action)){
  if(!host||typeof body.participant!=='string'||body.participant===user.id)return json({error:'host_required'},403);
  const member=await service.from('memberships').select('user_id').eq('gathering_id',g.id).eq('user_id',body.participant).maybeSingle();if(member.error)throw member.error;if(!member.data)return json({error:'participant_missing'},404);
  if(body.action==='remove'){
   const ban=await service.rpc('ban_from_gathering',{p_gathering:g.id,p_user:body.participant});if(ban.error)throw ban.error;
   await server.removeParticipant(g.room_name,body.participant,{revokeTokenTs:BigInt(Math.floor(Date.now()/1000)+1)});
   const r=await service.from('memberships').delete().eq('gathering_id',g.id).eq('user_id',body.participant);if(r.error)throw r.error;
  }else{
   const enabled=body.enabled===true;
   await server.updateParticipant(g.room_name,body.participant,{permission:{canSubscribe:true,canPublish:enabled,canPublishSources:[TrackSource.MICROPHONE],canPublishData:false}});
   const r=await service.from('memberships').update({can_speak:enabled,speech_revoked:!enabled,hand_raised:false}).eq('gathering_id',g.id).eq('user_id',body.participant);if(r.error)throw r.error;
  }
  return json({updated:true});
 }
 if(body.action!=='join')return json({error:'invalid_action'},400);
 if(Date.now()<Date.parse(g.starts_at))return json({error:'not_started'},409);
 const reserved=await client.rpc('gathering_command',{p_action:'reserve',p_data:{id:g.id,invite:body.invite??''}});
 if(reserved.error)return json({error:['full','invite_required','not_allowed','unavailable'].find(x=>reserved.error!.message===x)??'join_failed'},409);
 const membership=await service.from('memberships').select('speech_revoked').eq('gathering_id',g.id).eq('user_id',user.id).single();if(membership.error)throw membership.error;
 await server.createRoom({name:g.room_name,maxParticipants:g.capacity,emptyTimeout:120,departureTimeout:30});
 const profile=await service.from('profiles').select('name').eq('id',user.id).maybeSingle();const name=host?g.host_name:profile.data?.name?.trim()||'Community member';
 // Every admitted participant may choose to unmute. The host retains the
 // ability to remove people or change their speaking permission during a room.
 const canSpeak=host||!membership.data.speech_revoked;
 const token=new AccessToken(env('LIVEKIT_API_KEY'),env('LIVEKIT_API_SECRET'),{identity:user.id,name:name.slice(0,60),ttl:Math.min(300,Math.max(1,Math.floor((Date.parse(g.ends_at)-Date.now())/1000))),metadata:JSON.stringify({role:host?'host':canSpeak?'speaker':'listener'})});
 token.addGrant({roomJoin:true,room:g.room_name,canSubscribe:true,canPublish:canSpeak,canPublishSources:[TrackSource.MICROPHONE],canPublishData:false});
 return json({token:await token.toJwt(),url:env('LIVEKIT_URL'),endsAt:g.ends_at,host,hostId:g.host_id,canSpeak,title:g.title});
});
