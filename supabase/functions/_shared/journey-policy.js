import map from './journal-map.json' with { type: 'json' };
import { chooseJournalAction } from './journal-selection.js';
export const AI_CONSENT_VERSION = 'qwen-journal-2026-11-03';
export const MOODS = ['grateful','peaceful','hopeful','anxious','lonely','sad','overwhelmed','hopeless','unsure'];
export function needsSupport(text) {
  return /\b(kill myself|end my life|hurt myself|suicid(?:e|al)|matarme|quitarme la vida|suicidarme|me matar|tirar minha vida|me machucar|suicídio|suicidio)\b|(?:покончить с собой|убить себя|хочу умереть|самоубийств)/iu.test(text);
}
export function journeyInput(value) {
  if (!value || value.consentVersion !== AI_CONSENT_VERSION) throw Error('consent_required');
  const p = value.preferences;
  if (!p || !['en','pt','es','ru'].includes(p.language) || !['en','pt','es','ru'].includes(p.scriptureLanguage) || !['protestant','catholic','orthodox'].includes(p.tradition) || typeof p.edition !== 'string' || p.edition.length > 80) throw Error('invalid_preferences');
  if (typeof value.text !== 'string' || !value.text.trim() || value.text.length > 30000) throw Error('invalid_entry');
  return {text:value.text.trim(),preferences:{language:p.language,scriptureLanguage:p.scriptureLanguage,tradition:p.tradition,edition:p.edition,candlePractice:p.candlePractice===true}};
}
export function recommendations(value, preferences, catalog) {
  if (!value || !MOODS.includes(value.path) || typeof value.support !== 'boolean') throw Error('invalid_model_response');
  if (value.support) return {path:'unsure',passageIds:[],actionIds:[],support:true};
  const path = catalog.PATHS[value.path];
  const edition = catalog.editions.find(e=>e.id===preferences.edition && e.language===preferences.scriptureLanguage && e.traditions.includes(preferences.tradition));
  const passages = (edition?.passages || []).filter(v=>v.theme===path.theme).sort((a,b)=>Number(b.situations?.includes(value.path)||false)-Number(a.situations?.includes(value.path)||false)).slice(0,1);
  const theme = map.find(t=>t.id===value.themeId);
  if (value.themeId !== undefined && !theme) throw Error('invalid_model_response');
  return {path:value.path,passageIds:passages.map(v=>v.id),actionIds:path.actions.slice(0,1),support:false, ...(theme ? {themeId:theme.id, suggestedAction:chooseJournalAction(value.actionId && ['A01','A02','A03','A04','A05','A07','A08','A09','A10','A11','A12','A15','A16','A18','A19','A20','A21','A26'].includes(value.actionId) ? {...theme,main:value.actionId} : theme,{privateOnly:value.privateOnly===true,candles:preferences.candlePractice===true,financialStress:value.financialStress===true||theme.id==='money'})} : {})};
}
export async function readBounded(req, limit) {
  if (Number(req.headers.get('content-length')) > limit) throw Error('too_large');
  const reader = req.body?.getReader();
  if (!reader) throw Error('invalid_entry');
  const chunks=[]; let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw Error('too_large');}chunks.push(value);}
  return new Blob(chunks);
}
