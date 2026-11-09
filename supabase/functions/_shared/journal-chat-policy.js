import { journeyInput, needsSupport, recommendations } from './journey-policy.js';
export const CHAT_ACTIONS=['A01','A02','A03','A04','A05','A07','A08','A09','A10','A11','A12','A15','A16','A18','A19','A20','A21','A25','A26'];
export function chatActionsFor(input) {
 return CHAT_ACTIONS.filter(id=>id!=='A25'||input.supportsGatheringAction);
}
export function journalChatInput(value) {
 const input=journeyInput(value);
 if (!Array.isArray(value.messages)||!value.messages.length||value.messages.length>20) throw Error('invalid_entry');
 const messages=value.messages.map(m=>{
  if(!m||!['user','assistant'].includes(m.role)||typeof m.content!=='string'||!m.content.trim()||m.content.length>3000)throw Error('invalid_entry');
  return {role:m.role,content:m.content.trim()};
 });
 if(messages.at(-1).role!=='user'||messages.reduce((n,m)=>n+m.content.length,0)>24000)throw Error('too_large');
 if(!Array.isArray(value.previousActions)||value.previousActions.length>40||value.previousActions.some(id=>!CHAT_ACTIONS.includes(id)))throw Error('invalid_entry');
 return {...input,messages,previousActions:[...new Set(value.previousActions)],supportsGatheringAction:value.supportsGatheringAction===true,support:needsSupport(messages.at(-1).content)};
}
// A narrow fallback for an explicit unmet need, not a trigger for every mention
// of loneliness. The model still interprets broader context and preferences.
function connectionDeclined(input) {
 const latest=input.messages.at(-1).content.toLowerCase().replace(/[’‘]/g,"'");
 return /keep (?:this|it) private|(?:don't|do not) (?:want to |need to |need someone to )?(?:talk|share|join|listen)|(?:not ready to|rather not|no longer need to|no need to) (?:talk|share|join)|(?:just|only) (?:listen|reflect)|no (?:suggestions|advice)|i have (?:someone|people) to talk to|não quero (?:falar|compartilhar|participar)|só (?:ouça|escute)|prefiro.*privad|no quiero (?:hablar|compartir|unirme)|solo escucha|prefiero.*privad|не хочу (?:говорить|делиться|общаться)|просто (?:слушай|послушай)/.test(latest);
}
export function connectionInvitation(input) {
 const latest=input.messages.at(-1).content.toLowerCase().replace(/[’‘]/g,"'");
 if(connectionDeclined(input))return null;
 const group=/\b(?:join|find|looking for|need)\b.{0,45}\b(?:group|gathering|church community)\b|(?:entrar|encontrar|participar).{0,35}(?:grupo|encontro)|(?:unirme|encontrar|participar).{0,35}(?:grupo|reunión)|(?:найти|присоединиться).{0,35}(?:групп|встреч|общин)/;
 const listener=/\bi\b[^.!?]{0,140}\b(?:no one|nobody|no-one) (?:to|i can) (?:talk|speak) to\b|\bi (?:need|wish i had|want) someone (?:to (?:talk to|listen)|who (?:will|would|can) listen)\b|\bi don't have (?:anyone|anybody) to talk to\b|(?:não tenho|preciso de).*(?:ninguém (?:para|pra|com quem) (?:conversar|falar)|alguém (?:para|pra) me ouvir)|(?:no tengo|necesito).*(?:nadie (?:con quien|para) hablar|alguien que me escuche)|мне не с кем (?:поговорить|общаться)|некому меня выслушать/;
 const options=group.test(latest)?['A25']:listener.test(latest)?['A04','A25']:[];
 return options.find(id=>chatActionsFor(input).includes(id)&&!input.previousActions.includes(id))??null;
}
/** @param {(reason: string) => void} [onActionOmitted] */
export function journalChatReply(value,input,catalog,onActionOmitted=()=>{}) {
 if(!value||typeof value.support!=='boolean')throw Error('invalid_model_response',{cause:'support'});
 if(value.support||input.support) return {support:true,reply:'',actionId:null};
 if(typeof value.reply!=='string'||!value.reply.trim()||value.reply.length>2000)throw Error('invalid_model_response',{cause:'reply'});
 let actionId=null;
 if(value.actionId!=null){
  // An optional malformed suggestion must not discard a valid reflection.
  // Never guess an action: omit it while retaining strict reply/safety checks.
  if(!chatActionsFor(input).includes(value.actionId))onActionOmitted('action_id');
  else {
   try {
    // A25 means browse the list, never an assertion that a session is available.
    // Keep the existing preference/context validation before returning it.
    const selection=recommendations({...value,actionId:value.actionId==='A25'?'A07':value.actionId,support:false},input.preferences,catalog);
    actionId=value.actionId==='A25'?(value.privateOnly===true?null:'A25'):selection.suggestedAction??null;
    if(input.previousActions.includes(actionId))actionId=null;
   }catch(error){
    if(!(error instanceof Error)||error.message!=='invalid_model_response')throw error;
    onActionOmitted('action_context');
   }
  }
 }
 if(value.actionId==null&&value.privateOnly!==true)actionId=connectionInvitation(input);
 if(['A04','A25'].includes(actionId)&&connectionDeclined(input))actionId=null;
 return {reply:value.reply.trim(),actionId,support:false};
}
