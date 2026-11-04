export const feelings:Record<string,{label:string;mark:string;words:string[];verses:string[]}>;
export function detectFeelings(text:string):{primary:string;words:string[]};
export function needsImmediateSupport(text:string):boolean;
export function recommendVerses(chosen?:Record<string,number>,words?:string[]):string[];
