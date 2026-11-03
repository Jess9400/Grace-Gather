// Screening prioritizes human review; it never diagnoses, punishes disclosures, or auto-publishes.
export const THEMES = ['loneliness','regret','grief','fear','relationships','faith','other'];
export const RESPONSE_TYPES = ['listen','encouragement','prayer'];
export const REPORT_REASONS = ['unkind','pressure','danger','privacy','other'];
export const normalizeConfession = text => text.normalize('NFKC').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g,'').replace(/[013457@$]/g,c=>({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','@':'a','$':'s'}[c])).replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
export function screenConfession(text, kind='confession', hasAudio=false) {
 const n=normalizeConfession(text), compact=n.replace(/\s/g,'');const signals=[];
 // Disclosure/history and credible intent both need qualified context review, never a word-based ban.
 if(/\b(kill|murder|suicid\w*|self harm|end my life|hurt myself|matar|matarmi|matarme|me matar|asesin\w*|assassin\w*|me machucar)\b|уби[ить]|суицид|самоубии|покончить с собой/u.test(n)||/suicide|killmyself|suicidio/.test(compact))signals.push('safety_context');
 if(/\b(i will|i am going to|vou|voy a) (kill|hurt|matar|ferir)|тебя убью|убью тебя/.test(n))signals.push('threat');
 if(/https?[:/]|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\d[\s()+.-]*){8,}/i.test(text))signals.push('identifying_or_contact_details');
 if(kind==='reply'&&/\b(deserve|your fault|just pray|god hates|go to hell|kill yourself|culpa sua|voce merece|dios te odia|tu culpa|te lo mereces)\b|сам виноват|сама виновата|бог ненавидит/.test(n))signals.push('shame_or_pressure');
 if(hasAudio)signals.push('audio_review');
 return {status:'pending',priority:signals.includes('threat')?0:signals.includes('safety_context')?1:2,signals};
}
export function validateConfession(b) {
 if(!b||typeof b.body!=='string'||b.body.trim().length>3000||!['en','pt','es','ru'].includes(b.language)||!THEMES.includes(b.theme)||!RESPONSE_TYPES.includes(b.responseType)||b.consent!==true)return null;
 return {body:b.body.trim(),theme:b.theme,response_type:b.responseType,language:b.language};
}
