import { screenConfession } from './confession-policy.js';
import { parseCommunityDecision } from './community-screening-policy.js';

// Inputs are untrusted. A model is only allowed to suggest publication; the
// database rechecks consent and state atomically before changing visibility.
export async function autoScreenConfession(input, deps) {
  try {
    if (input.itemConsent !== true || !await deps.permission(input.author)) return 'pending';
    let transcript = '';
    if (input.audio) {
      if (input.audioConsent !== true) return 'pending';
      transcript = await deps.transcribe(input.audio, input.language);
      if (typeof transcript !== 'string' || transcript.trim().length < 3 || transcript.length > 30000) return 'pending';
    }
    const text = [input.body, transcript].filter(Boolean).join('\n');
    const localSignals = screenConfession(text, input.kind, false).signals;
    if (localSignals.some(signal => ['safety_context','threat'].includes(signal))) await deps.flag?.(input);
    if (!text.trim() || localSignals.length) return 'pending';
    const decision = parseCommunityDecision(await deps.screen({ text, language: input.language, kind: input.kind }));
    if (decision.flags.some(flag => ['self_harm','threat','sexual_exploitation','harmful_advice'].includes(flag))) await deps.flag?.(input);
    if (!decision.publish || !await deps.permission(input.author)) return 'pending';
    const approved = await deps.approve(input.id, input.author, input.created, !!input.audio, input.body, input.language, input.audioType ?? null);
    return approved ? 'approved' : 'unchanged';
  } catch {
    // Never disclose provider errors or content, and never publish on failure.
    return 'pending';
  }
}
