export const feelings:Record<string,{label:string;mark:string;words:string[];verses:string[]}>;
export const feelingWords:Record<string,Record<string,string[]>>;
export function detectFeelings(text:string,language?:string):{primary:string;words:string[]};
export function needsImmediateSupport(text:string):boolean;
export function recommendVerses(chosen?:Record<string,number>,words?:string[]):string[];
