import { detectFeelings } from './quiet-feelings.js';
const mobileMoods={great:'grateful',sad:'sad',anxious:'anxious',lonely:'lonely',overwhelmed:'overwhelmed',grateful:'grateful',unsure:'unsure'};
export function quietMood(text,chosen={},language='en') {
 const selected=Object.entries(chosen).filter(([key,n])=>Object.hasOwn(mobileMoods,key)&&[1,2,3].includes(n)).sort((a,b)=>b[1]-a[1]);
 return mobileMoods[selected[0]?.[0]??(language==='en'?detectFeelings(text).primary:'unsure')]??'unsure';
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
