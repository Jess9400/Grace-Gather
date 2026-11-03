import {compatibleEditions} from './core.js';
export const normalizeCity=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toLowerCase();
export function organizationsForCity(organizations,profile){
 if(!profile?.city||profile.country!=='BR')return [];
 const city=normalizeCity(profile.city),region=String(profile.region??'').toUpperCase();
 return organizations.filter(o=>o.locations?.some(x=>normalizeCity(x.city)===city&&x.region===region));
}
export function dailyPassage(editions,prefs,day=new Date()){
 const edition=compatibleEditions(editions,prefs).find(e=>e.id===prefs.edition);
 if(!edition?.passages.length)return null;
 const serial=Math.floor(Date.UTC(day.getFullYear(),day.getMonth(),day.getDate())/86400000);
 const passage=edition.passages[((serial%edition.passages.length)+edition.passages.length)%edition.passages.length];
 return {...passage,editionId:edition.id,editionName:edition.name,language:edition.language,attribution:edition.attribution,licenseUrl:edition.licenseUrl};
}
export const BRAZIL_STATES=['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
