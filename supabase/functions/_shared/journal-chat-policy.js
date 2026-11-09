import { journeyInput, needsSupport, recommendations } from './journey-policy.js';
export const CHAT_ACTIONS=['A01','A02','A03','A04','A05','A07','A08','A09','A10','A11','A12','A15','A16','A18','A19','A20','A21','A26'];
export function journalChatInput(value) {
 const input=journeyInput(value);
 if (!Array.isArray(value.messages)||!value.messages.length||value.messages.length>20) throw Error('invalid_entry');
 const messages=value.messages.map(m=>{
  if(!m||!['user','assistant'].includes(m.role)||typeof m.content!=='string'||!m.content.trim()||m.content.length>3000)throw Error('invalid_entry');
  return {role:m.role,content:m.content.trim()};
 });
 if(messages.at(-1).role!=='user'||messages.reduce((n,m)=>n+m.content.length,0)>24000)throw Error('too_large');
 if(!Array.isArray(value.previousActions)||value.previousActions.length>40||value.previousActions.some(id=>!CHAT_ACTIONS.includes(id)))throw Error('invalid_entry');
 return {...input,messages,previousActions:[...new Set(value.previousActions)],support:needsSupport(messages.at(-1).content)};
}
/** @param {(reason: string) => void} [onActionOmitted] */
export function journalChatReply(value,input,catalog,onActionOmitted=()=>{}) {
 if(!value||typeof value.support!=='boolean')throw Error('invalid_model_response',{cause:'support'});
 if(value.support) return {support:true,reply:'',actionId:null};
 if(typeof value.reply!=='string'||!value.reply.trim()||value.reply.length>2000)throw Error('invalid_model_response',{cause:'reply'});
 let actionId=null;
 if(value.actionId!=null){
  // An optional malformed suggestion must not discard a valid reflection.
  // Never guess an action: omit it while retaining strict reply/safety checks.
  if(!CHAT_ACTIONS.includes(value.actionId))onActionOmitted('action_id');
  else {
   try {
    const selection=recommendations({...value,support:false},input.preferences,catalog);
    actionId=selection.suggestedAction??null;
    if(input.previousActions.includes(actionId))actionId=null;
   }catch(error){
    if(!(error instanceof Error)||error.message!=='invalid_model_response')throw error;
    onActionOmitted('action_context');
   }
  }
 }
 return {reply:value.reply.trim(),actionId,support:false};
}
