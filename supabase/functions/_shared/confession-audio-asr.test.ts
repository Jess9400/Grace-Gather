import { transcribeConfession } from './confession-audio-asr.ts';

Deno.test('audio transcription uses the native endpoint and never sends to an unapproved host', async () => {
  const previous=globalThis.fetch;
  let called=0;
  Deno.env.set('DASHSCOPE_API_KEY','test-key');
  Deno.env.delete('alibaba_api_key');
  Deno.env.delete('CONFESSION_ASR_URL');
  globalThis.fetch=async (input,init)=>{
    called++;
    if (!String(input).startsWith('https://dashscope-intl.aliyuncs.com/')) throw Error('wrong host');
    const body=JSON.parse(String((init as {body?:unknown})?.body));
    if(body.parameters.format!=='mp4'||body.parameters.language_hints[0]!=='pt') throw Error('wrong format');
    if(!body.input.messages[0].content[0].input_audio.data.startsWith('data:audio/mp4;base64,')) throw Error('wrong data');
    return new Response(JSON.stringify({output:{text:'Uma amostra segura'}}),{status:200});
  };
  try {
    const file=new File([new Uint8Array(32)],'sample.m4a',{type:'audio/mp4'});
    if(await transcribeConfession(file,'pt')!=='Uma amostra segura') throw Error('wrong transcript');
    globalThis.fetch=async()=>new Response(JSON.stringify({output:{sentence:{text:'only one sentence'}}}),{status:200});
    let partialRejected=false;
    try { await transcribeConfession(file,'pt'); } catch { partialRejected=true; }
    if(!partialRejected) throw Error('a partial transcript was accepted');
    Deno.env.set('CONFESSION_ASR_URL','https://unapproved.invalid/collect');
    let failed=false;
    try { await transcribeConfession(file,'pt'); } catch { failed=true; }
    if(!failed || called!==1) throw Error('unapproved endpoint was used');
  } finally {
    globalThis.fetch=previous;
    Deno.env.delete('DASHSCOPE_API_KEY');
    Deno.env.delete('CONFESSION_ASR_URL');
  }
});
