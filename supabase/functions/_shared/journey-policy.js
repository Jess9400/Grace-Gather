import map from './journal-map.json' with { type: 'json' };
import { chooseJournalAction } from './journal-selection.js';
export const AI_CONSENT_VERSION = 'qwen-journal-explicit-2026-11-14';
// These definitions are presented to the model in both journal and chat modes.
export const ACTION_GUIDE = 'A01 light a memorial candle; A02 remember someone in prayer; A03 pray briefly; A04 share in Confession, where a listener may respond; A05 consider professional mental health support; A07 contact a trusted person; A08 write a private reflection; A09 take a quiet pause; A10 draft an apology privately; A11 send a kind note; A12 thank someone; A14 offer comfort to a confession; A15 request prayer; A16 pray for someone; A18 explore Pay it forward; A19 browse stories of hope; A20 share a testimony; A21 light a candle in prayer; A25 explore a gathering, subject to availability; A26 explore Bible Study; A27 create a gathering.';
export function safeActionExplanation(value) {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (!text || text.length > 240 || /[\r\n<>]|https?:\/\/|www\./i.test(text)) return undefined;
  return text;
}
// Phrases that make a reply read as machine-written. A reflection that uses
// one is rewritten once, then left out rather than shown.
export const GENERIC_PHRASES = [
  /\bit sounds like\b/i, /\bi hear you\b/i, /\bcompletely (understandable|normal|natural)\b/i,
  /\byou(?: are|'re|’re) not alone\b/i, /\bjourney\b/i, /\btake a moment\b/i, /\bself-care\b/i,
  /\bit(?:'s| is|’s) important to\b/i, /\bfeelings are valid\b/i, /\bthank you for sharing\b/i,
  /\bi(?:'m| am|’m) here for you\b/i, /\bconsider\b/i, /\bgod has a plan\b/i,
  /\beverything happens for a reason\b/i, /\bremember that god\b/i, /[—–]/, /\?/,
  // The same habits in Portuguese.
  /\bparece que voc[eê](?![a-zà-ú])/i, /\beu te ou[çc]o\b/i, /\b(?:totalmente|completamente) compreens[ií]vel\b/i,
  /\bvoc[eê] n[aã]o est[aá] sozinh[oa]\b/i, /\bjornada\b/i, /\btire um (?:momento|tempo)\b/i, /\bautocuidado\b/i,
  /\b[ée] importante (?:que|lembrar)\b/i, /\bsentimentos s[aã]o v[aá]lidos\b/i, /\bobrigad[oa] por compartilhar\b/i,
  /\bestou aqui (?:para|por) voc[eê](?![a-zà-ú])/i, /\bconsidere\b/i, /\bdeus tem um plano\b/i,
  /\btudo acontece por um motivo\b/i, /\blembre-se de que deus\b/i,
];
const ENGLISH_EXAMPLES = [
  ['Big presentation tomorrow and I can\'t sleep. I keep going over everything that could go wrong.', 'You don\'t have to rehearse every way tomorrow could go wrong. Give the worries to God one by one, then let the notes rest.'],
  ['My daughter starts school abroad next week and I keep imagining everything that could happen to her.', 'It\'s okay to be worried; it\'s a very natural feeling for a mom. But worrying won\'t do any good for your daughter or for you. Being calm and confident will help her feel better too, and face new situations at her best.'],
  ['It\'s been a year since Dad died. Everyone has moved on and I still set out two cups some mornings.', 'A year is not long. The second cup is love that has nowhere to go yet.'],
  ['I yelled at my son today over nothing. He looked so scared. I don\'t know why I get like this.', 'You saw his face, and it stayed with you; that is where repair starts. Tomorrow, tell him you were wrong to shout, in words a child understands.'],
  ['Night shift again. Kids, work, Mom in hospital. I have nothing left, not even for prayer.', 'With night shifts, the kids and your mom in hospital, it is no wonder there are no words left. Tonight, simply being here can be the prayer.'],
  ['I don\'t know if I believe anymore. I pray and it feels like talking to the ceiling.', 'Telling God it feels like talking to the ceiling is still praying. Many of the psalms begin exactly there.'],
  ['Biopsy came back clear. I cried in the car for twenty minutes.', 'Twenty minutes in the car is all that fear finally letting go. Thank God for it today, out loud if you can.'],
  ['Another rejection. That\'s 40 applications. Maybe I\'m just not good enough for anything.', 'Forty applications means you got up and tried forty times. A no from a company is not a verdict on you.'],
  ['Tired. Just tired.', 'Then rest tonight. Nothing more is asked of you right now.'],
  ['We fought again about money. I said things I can\'t take back.', 'Words can\'t be taken back, but they can be owned. Before you sleep, name one thing you are sorry you said, without explaining why you said it.'],
];
// Written in Brazilian Portuguese, not translated: Jess, please adjust freely.
const PORTUGUESE_EXAMPLES = [
  ['Amanhã tenho uma apresentação importante e não consigo dormir. Fico repassando tudo o que pode dar errado.', 'Você não precisa ensaiar hoje à noite tudo o que pode dar errado amanhã. Entregue cada preocupação a Deus, uma de cada vez, e tente descansar.'],
  ['Minha filha vai estudar fora na semana que vem e eu não paro de imaginar tudo o que pode acontecer com ela.', 'Tudo bem ficar preocupada; é um sentimento muito natural de mãe. Mas a preocupação não vai ajudar nem você nem ela. Se você estiver calma e confiante, ela também vai se sentir mais segura para enfrentar o que vier.'],
  ['Faz um ano que meu pai morreu. Todo mundo seguiu em frente, e em algumas manhãs eu ainda coloco duas xícaras na mesa.', 'Um ano não é muito tempo. A segunda xícara é amor que ainda não sabe para onde ir.'],
  ['Gritei com meu filho hoje por nada. Ele ficou com tanto medo. Não sei por que eu fico assim.', 'Você viu o rosto dele, e isso ficou com você; é por aí que se começa a consertar. Amanhã, diga a ele que você errou ao gritar, com palavras que uma criança entende.'],
  ['Plantão de novo. Filhos, trabalho, minha mãe no hospital. Não sobrou nada, nem para rezar.', 'Com plantões, as crianças e sua mãe no hospital, não é de admirar que faltem palavras. Hoje, estar aqui já pode ser a sua oração.'],
  ['Não sei se ainda acredito. Rezo e parece que estou falando com o teto.', 'Dizer a Deus que parece falar com o teto também é oração. Muitos salmos começam exatamente assim.'],
  ['A biópsia deu negativa. Chorei no carro por vinte minutos.', 'Aqueles vinte minutos no carro eram todo o medo finalmente indo embora. Agradeça a Deus hoje, em voz alta se puder.'],
  ['Mais uma recusa. Já são 40 currículos. Talvez eu não sirva para nada.', 'Quarenta currículos querem dizer que você se levantou e tentou quarenta vezes. Um não de uma empresa não diz quem você é.'],
  ['Cansada. Só cansada.', 'Então descanse esta noite. Por agora, é só isso que você precisa fazer.'],
  ['Brigamos de novo por causa de dinheiro. Falei coisas que não posso desfazer.', 'Palavras não voltam atrás, mas dá para assumi-las. Antes de dormir, diga uma coisa que você lamenta ter dito, sem explicar por que disse.'],
];
export const REFLECTION_EXAMPLES = { en: ENGLISH_EXAMPLES, pt: PORTUGUESE_EXAMPLES };
// Languages with examples written by people; the others follow when they have them.
export const reflectionLanguage = (language) => Object.hasOwn(REFLECTION_EXAMPLES, language);
export function reflectionGuide(language) {
  const examples = REFLECTION_EXAMPLES[language] ?? ENGLISH_EXAMPLES;
  const portuguese = language === 'pt' ? ' Write it in natural Brazilian Portuguese, the way a friend from church would, never translated from English; use "você", and "rezar" for Catholic readers but "orar" for Protestant readers. Avoid the same stock phrases in Portuguese, such as "parece que você", "você não está sozinho", "jornada", "autocuidado" and "considere".' : '';
  return `reflection: one or two short sentences, under 280 characters, written to the person as a caring friend who read every word. Use one concrete word or detail from what they wrote. Name the feeling plainly; if it fits, add one gentle, practical turn. Match their length: a very short entry gets a very short reply. No preaching, Bible quotations, verse references, questions, dashes or speaking as God. Avoid stock phrases such as "it sounds like", "I hear you", "completely understandable", "you are not alone", "journey", "take a moment", "self-care", "it's important to", "consider" and "God has a plan". ${portuguese} Examples (entry => reflection): ${examples.map(([e,r])=>JSON.stringify(e)+' => '+JSON.stringify(r)).join(' | ')}`;
}
export function reflectionIssue(value) {
  if (typeof value !== 'string' || !value.trim()) return 'missing';
  const text = value.trim();
  if (text.length > 320 || /[\r\n<>]|https?:\/\/|www\./i.test(text)) return 'format';
  return GENERIC_PHRASES.some(p=>p.test(text)) ? 'generic' : undefined;
}
export const MOODS = ['grateful','peaceful','hopeful','anxious','lonely','sad','overwhelmed','hopeless','unsure'];
// Same list as mobile/src/lib/safety.ts: it errs on the side of asking.
const DANGER=[
  /\b(?:kill myself|end my life|take my (?:own )?life|hurt myself|harm myself|self[- ]harm|cut myself|suicid(?:e|al)|want to die|wanna die|wish i (?:was|were) dead|better off dead|(?:don't|do not) want to (?:live|be alive|wake up)|end it all)\b/i,
  /(?:me matar|tirar (?:a )?minha (?:própria )?vida|acabar com (?:a )?minha vida|dar fim (?:à|a) minha vida|quero morrer|queria morrer|não quero (?:mais )?viver|me machucar|suicídio|me suicidar)/i,
  /(?:matarme|quitarme la vida|acabar con mi vida|suicidarme|suicidio|quiero morir|quisiera morir|no quiero (?:seguir )?vivir|hacerme daño)/i,
  /(?:покончить с собой|покончить с жизнью|убить себя|хочу умереть|не хочу жить|самоубийств|навредить себе|причинить себе вред)/i,
];
export function needsSupport(text) {
  const plain=String(text).replace(/[’‘]/g,"'");
  return DANGER.some(pattern=>pattern.test(plain));
}
export function journeyInput(value) {
  if (!value || value.consentVersion !== AI_CONSENT_VERSION) throw Error('consent_required');
  const p = value.preferences;
  if (!p || !['en','pt','es','ru'].includes(p.language) || !['en','pt','es','ru'].includes(p.scriptureLanguage) || !['protestant','catholic','orthodox'].includes(p.tradition) || typeof p.edition !== 'string' || p.edition.length > 80) throw Error('invalid_preferences');
  if (typeof value.text !== 'string' || !value.text.trim() || value.text.length > 30000) throw Error('invalid_entry');
  return {text:value.text.trim(),preferences:{language:p.language,scriptureLanguage:p.scriptureLanguage,tradition:p.tradition,edition:p.edition,candlePractice:p.candlePractice===true}};
}
export function recommendations(value, preferences, catalog, connectedActions = false) {
  if (!value || !MOODS.includes(value.path) || typeof value.support !== 'boolean') throw Error('invalid_model_response');
  if (value.support) return {path:'unsure',passageIds:[],actionIds:[],support:true};
  const path = catalog.PATHS[value.path];
  const edition = catalog.editions.find(e=>e.id===preferences.edition && e.language===preferences.scriptureLanguage && e.traditions.includes(preferences.tradition));
  const passages = (edition?.passages || []).filter(v=>v.theme===path.theme).sort((a,b)=>Number(b.situations?.includes(value.path)||false)-Number(a.situations?.includes(value.path)||false)).slice(0,1);
  const theme = map.find(t=>t.id===value.themeId);
  if (value.themeId !== undefined && !theme) throw Error('invalid_model_response');
  const suggestedAction = theme ? chooseJournalAction(value.actionId && ['A01','A02','A03','A04','A05','A07','A08','A09','A10','A11','A12','A15','A16','A18','A19','A20','A21','A26',...(connectedActions?['A14','A25','A27']:[])].includes(value.actionId) ? {...theme,main:value.actionId} : theme,{privateOnly:value.privateOnly===true,candles:preferences.candlePractice===true,financialStress:value.financialStress===true||theme.id==='money',connectedActions}) : undefined;
  const explanation = suggestedAction && value.actionId === suggestedAction ? safeActionExplanation(value.actionExplanation) : undefined;
  return {path:value.path,passageIds:passages.map(v=>v.id),actionIds:path.actions.slice(0,1),support:false, ...(theme ? {themeId:theme.id,suggestedAction} : {}), ...(explanation ? {actionExplanation:explanation} : {}), ...(reflectionLanguage(preferences.language) && !reflectionIssue(value.reflection) ? {reflection:value.reflection.trim()} : {})};
}
export async function readBounded(req, limit) {
  if (Number(req.headers.get('content-length')) > limit) throw Error('too_large');
  const reader = req.body?.getReader();
  if (!reader) throw Error('invalid_entry');
  const chunks=[]; let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw Error('too_large');}chunks.push(value);}
  return new Blob(chunks);
}
