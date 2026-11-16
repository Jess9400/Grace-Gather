import { parseCommunityDecision } from './community-screening-policy.js';
import { screenConfession } from './confession-policy.js';

export async function autoScreenText(kind, candidate, deps) {
  try {
    if (!candidate || !['testimony','comment','giving'].includes(kind)) return 'pending';
    // The model cannot verify a charity or its destination. Keep links for a person.
    if (kind === 'giving' && candidate.website) return 'pending';
    const content=[candidate.title,candidate.body,candidate.displayName,...(candidate.tags||[])].filter(Boolean).join('\n');
    if (!content || screenConfession(content,kind==='comment'?'reply':'confession',false).signals.length) return 'pending';
    const modelInput={kind,title:candidate.title,body:candidate.body,displayName:candidate.displayName,tags:candidate.tags,language:candidate.language};
    const decision=parseCommunityDecision(await deps.screen(modelInput));
    if (!decision.publish) return 'pending';
    return await deps.approve(candidate) ? 'approved' : 'pending';
  } catch { return 'pending'; }
}
