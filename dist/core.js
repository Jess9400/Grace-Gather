export const LANGUAGES = {en:'English',pt:'Português',es:'Español',ru:'Русский'};
export const DEFAULT_PREFS = {language:'en',scriptureLanguage:'en',tradition:'protestant',edition:'web'};
export const MOODS = ['grateful','peaceful','hopeful','anxious','lonely','sad','overwhelmed','hopeless','unsure'];
export const THEMES = {hopeless:'hope',grateful:'gratitude',peaceful:'peace',hopeful:'hope',anxious:'peace',lonely:'belonging',sad:'rest',overwhelmed:'rest',unsure:'hope'};
export function escapeHTML(value='') {return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function compatibleEditions(editions,prefs) {return editions.filter(e=>e.language===prefs.scriptureLanguage&&e.traditions.includes(prefs.tradition));}
export function normalizePrefs(raw,editions) {
  const p={...DEFAULT_PREFS,...raw};
  if(!LANGUAGES[p.language])p.language='en';
  if(!LANGUAGES[p.scriptureLanguage])p.scriptureLanguage='en';
  if(!['protestant','catholic','orthodox'].includes(p.tradition))p.tradition='protestant';
  const options=compatibleEditions(editions,p);
  if(!options.some(e=>e.id===p.edition))p.edition=options[0]?.id??'';
  return p;
}
export function selectPassages(editions,prefs,mood) {
  const edition=compatibleEditions(editions,prefs).find(e=>e.id===prefs.edition);
  if(!edition)return [];
  const theme=THEMES[mood]??'hope';
  return [...edition.passages].sort((a,b)=>Number(b.theme===theme)-Number(a.theme===theme)).slice(0,5).map(p=>({...p,editionId:edition.id,editionName:edition.name,language:edition.language,tradition:prefs.tradition,license:edition.license,licenseUrl:edition.licenseUrl,attribution:edition.attribution,scope:edition.scope}));
}
// A conservative, local keyword gate, never a diagnosis or a complete safety assessment.
export function needsHumanSupport(text) {
  return /\b(kill myself|end my life|hurt myself|suicid(?:e|al)|matarme|quitarme la vida|suicidarme|me matar|tirar minha vida|me machucar|suicídio|suicidio)\b|(?:покончить с собой|убить себя|хочу умереть|самоубийств)/iu.test(String(text));
}
export function isValidEntry(text,mood,blob){return !!(text.trim()||MOODS.includes(mood)||(blob&&blob.size>0));}
export function audioExtension(type){return type.includes('mp4')?'m4a':type.includes('ogg')?'ogg':type.includes('mpeg')?'mp3':type.includes('wav')?'wav':'webm';}
