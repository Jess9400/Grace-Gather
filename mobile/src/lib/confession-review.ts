export function confessionReviewNote(decision: string, input: string): string | null {
  const note = input.trim();
  if (!['approved', 'rejected'].includes(decision) || note.length > 500) return null;
  if ((decision === 'rejected' || note.length > 0) && note.length < 5) return null;
  return note || 'Reviewed and approved.';
}
