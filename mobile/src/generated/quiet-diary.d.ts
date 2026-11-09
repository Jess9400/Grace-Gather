import { Mood, Preferences, Entry, data } from '../lib/content';
export function quietMood(text:string,chosen?:Record<string,number>,language?:string):Mood;
export function selectQuietPassage(editions:typeof data.editions,prefs:Preferences,mood:Mood):null|{id:string;text:string;reference:string;sourceUrl:string;theme:string;context:Record<string,string>;editionId:string;editionName:string;language:string;attribution:string;licenseUrl:string};
export function savedJournalEntries(entries:Entry[]):Entry[];
export function journalBackupAudioNames(entries:Entry[]):string[];

export function hopelessWriting(text:string):boolean;
