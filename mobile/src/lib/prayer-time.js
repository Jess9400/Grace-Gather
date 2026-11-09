// Input is explicitly the device's local time; persist a UTC instant.
export function prayerTime(date, time, now = Date.now()) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time)) throw Error('Enter a valid date and time.');
 const [y,m,d]=date.split('-').map(Number),[h,min]=time.split(':').map(Number);
 const value=new Date(y,m-1,d,h,min);
 if(value.getFullYear()!==y||value.getMonth()!==m-1||value.getDate()!==d||value.getHours()!==h||value.getMinutes()!==min||value.getTime()<now+5*60000||value.getTime()>now+30*86400000) throw Error('Choose a time between 5 minutes and 30 days from now.');
 return value.toISOString();
}
