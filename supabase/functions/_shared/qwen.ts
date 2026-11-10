import { json } from './http.ts';
export async function qwen(body: Record<string, unknown>) {
  const key = Deno.env.get('alibaba_api_key') || Deno.env.get('DASHSCOPE_API_KEY');
  if (!key) throw Error('service_not_configured');
  const base = Deno.env.get('QWEN_BASE_URL') || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
  const url = new URL(base.replace(/\/$/,'')+'/chat/completions');
  if(url.protocol!=='https:' || !(url.hostname==='dashscope-intl.aliyuncs.com' || url.hostname.endsWith('.maas.aliyuncs.com'))) throw Error('service_not_configured');
  const response=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
  // Never log provider response bodies: they may echo a private journal or audio.
  if(!response.ok) throw Error(response.status===429?'provider_busy':'provider_unavailable');
  const result=await response.json();
  const choice=result.choices?.[0];
  if(choice?.finish_reason!=='stop' || typeof choice?.message?.content!=='string') throw Error('invalid_model_response');
  return choice.message.content;
}
export function aiError(error: unknown) {
  const code=error instanceof Error ? error.message : '';
  const status: Record<string,number>={consent_required:400,invalid_preferences:400,invalid_entry:400,too_large:413,invalid_audio:400,rate_limited:429,daily_reflection_limit:429,daily_chat_limit:429,provider_busy:503,provider_unavailable:503,service_not_configured:503,invalid_model_response:502};
  return json({error:code in status?code:'ai_unavailable'},status[code]||503);
}
export async function reserveAI(service: ReturnType<typeof import('./http.ts')['admin']>, user: string, kind: string){
  const {data,error}=await service.rpc('reserve_ai_request',{p_user:user,p_kind:kind});
  if(error) throw Error('service_not_configured');
  if(data!==true) throw Error('rate_limited');
}
