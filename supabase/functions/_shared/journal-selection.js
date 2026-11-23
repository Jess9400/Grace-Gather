// Only catalog identifiers cross the model boundary. No generated scripture or advice.
export function chooseJournalAction(theme, { privateOnly = false, candles = false, financialStress = false, connectedActions = false } = {}) {
  let id = privateOnly ? theme.private : theme.main;
  if (privateOnly && ['A04','A07','A14','A15','A18','A20','A25','A27'].includes(id)) id = 'A08';
  if (['A01','A21'].includes(id) && !candles) id = 'A02';
  if (id === 'A06') id = 'A25';
  if (['A22','A17'].includes(id) || (!connectedActions && ['A25','A14'].includes(id))) id = theme.private;
  if (!connectedActions && id === 'A27') id = 'A18';
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
