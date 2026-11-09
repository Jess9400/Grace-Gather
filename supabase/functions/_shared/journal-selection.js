// Only catalog identifiers cross the model boundary. No generated scripture or advice.
export function chooseJournalAction(theme, { privateOnly = false, candles = false, financialStress = false } = {}) {
  let id = privateOnly ? theme.private : theme.main;
  if (['A01','A21'].includes(id) && !candles) id = 'A02';
  // Until a specific available session/listener is checked, use a private invitation.
  if (['A06','A25','A22','A17'].includes(id)) id = 'A07';
  if (id === 'A14') id = 'A11';
  if (id === 'A13') id = 'A18';
  if (id === 'A23') id = 'A08';
  if (financialStress && id === 'A18') id = 'A03';
  return id;
}
export function weeklyCheckInDue(createdDates, lastCheckIn, now = Date.now()) {
  const dates = createdDates.map(x=>Date.parse(x)).filter(Number.isFinite);
  if (!dates.length) return false;
  const last = Date.parse(lastCheckIn || '');
  const anchor = Number.isFinite(last) ? last : Math.min(...dates);
  return now - anchor >= 7 * 86400000;
}
