export function chooseJournalAction(theme: { main: string; private: string }, options?: {privateOnly?:boolean; candles?:boolean; financialStress?:boolean; connectedActions?:boolean}): string;
export function weeklyCheckInDue(createdDates: string[], lastCheckIn?: string, now?:number): boolean;
