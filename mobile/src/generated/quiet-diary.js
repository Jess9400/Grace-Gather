import { detectFeelings } from './quiet-feelings.js';
const mobileMoods={great:'grateful',sad:'sad',anxious:'anxious',lonely:'lonely',overwhelmed:'overwhelmed',grateful:'grateful',unsure:'unsure',hopeless:'hopeless',hopeful:'hopeful',peaceful:'peaceful'};
export function hopelessWriting(text) {
 const input=text.toLowerCase().replaceAll('’', "'");
 const pattern=/hopeless|nothing (?:will|is going to) change|what's the point|sem esperança|sin esperanza|безнадеж|безнадёж/g;
 return [...input.matchAll(pattern)].some(m=>!/(?:not|never|no longer|don't|do not|isn't|wasn't)\s+(?:(?:feel|feeling|felt|am|be)\s+)?(?:(?:very|so|really)\s+)?$/.test(input.slice(Math.max(0,m.index-32),m.index)));
}
export function quietMood(text,chosen={},language='en') {
 const selected=Object.entries(chosen).filter(([key,n])=>Object.hasOwn(mobileMoods,key)&&[1,2,3].includes(n)).sort((a,b)=>b[1]-a[1]);
 if (!selected.length && language==='en' && hopelessWriting(text)) return 'hopeless';
 return mobileMoods[selected[0]?.[0]??detectFeelings(text,language).primary]??'unsure';
}
const themes={sad:'rest',overwhelmed:'rest',anxious:'peace',peaceful:'peace',grateful:'gratitude',hopeful:'hope',hopeless:'hope',lonely:'belonging',unsure:'hope'};
export function selectQuietPassage(editions,prefs,mood) {
 const edition=editions.find(e=>e.id===prefs.edition&&e.language===prefs.scriptureLanguage&&e.traditions.includes(prefs.tradition));
 if(!edition)return null;
 const options=edition.passages.filter(p=>p.theme===themes[mood]);
 const passage=options.find(p=>p.situations?.includes(mood))??options[0];
 return passage?{...passage,editionId:edition.id,editionName:edition.name,language:edition.language,attribution:edition.attribution,licenseUrl:edition.licenseUrl}:null;
}
export function savedJournalEntries(entries){return entries.filter(e=>!e.sessionOnly);}
export function journalBackupAudioNames(entries){return entries.filter(e=>!e.sessionOnly&&e.audio).map(e=>e.audio+'.bin');}
