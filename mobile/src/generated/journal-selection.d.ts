export function chooseJournalAction(theme: { main: string; private: string }, options?: {privateOnly?:boolean; candles?:boolean; financialStress?:boolean}): string;
export function weeklyCheckInDue(createdDates: string[], lastCheckIn?: string, now?:number): boolean;
