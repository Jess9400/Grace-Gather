// Never log the request or provider response: the recording is private.
export async function transcribeConfession(file: File, language: string): Promise<string> {
  const formats: Record<string, string> = {
    'audio/mp4': 'mp4', 'audio/webm': 'webm', 'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3', 'audio/wav': 'wav',
  };
  const type = file.type.split(';')[0];
  const format = formats[type];
  const key = Deno.env.get('alibaba_api_key') || Deno.env.get('DASHSCOPE_API_KEY');
  if (!format || !key || !['en', 'pt', 'es', 'ru'].includes(language)) throw Error('unavailable');
  const endpoint = new URL(Deno.env.get('CONFESSION_ASR_URL') || 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation');
  if (endpoint.protocol !== 'https:' || !(endpoint.hostname === 'dashscope-intl.aliyuncs.com' || endpoint.hostname.endsWith('.maas.aliyuncs.com'))) throw Error('unavailable');
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  const response = await fetch(endpoint, {
    method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', 'X-DashScope-SSE': 'disable' },
    body: JSON.stringify({ model: Deno.env.get('CONFESSION_ASR_MODEL') || 'qwen-audio-3.1-asr-flash', input: { messages: [{ role: 'user', content: [{ type: 'input_audio', input_audio: { data: `data:${type};base64,${btoa(binary)}` } }] }] }, parameters: { format, language_hints: [language] } }),
    signal: AbortSignal.timeout(60000), redirect: 'error',
  });
  if (!response.ok) throw Error('unavailable');
  const output = (await response.json())?.output;
  // output.sentence can contain only the current sentence; screening a partial
  // transcript would miss the rest of the recording.
  const transcript = output?.text;
  if (typeof transcript !== 'string') throw Error('unavailable');
  return transcript;
}
