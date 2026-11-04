export const feelings = {
  anxious: { label: 'anxious', mark: '≈', words: ['anxious','anxiety','worried','worry','scared','afraid','stressed','stress','panic','nervous','future'], verses: ['web-john-14-27','web-matthew-11-28','web-romans-15-13'] },
  lonely: { label: 'lonely', mark: '☾', words: ['lonely','alone','isolated','disconnected','unseen','miss','missing','belong'], verses: ['web-john-15-9','web-psalm-34-18','web-romans-15-13'] },
  great: { label: 'great', mark: '✧', words: ['great','happy','joy','joyful','excited','wonderful','good','amazing','peaceful'], verses: ['web-1-thessalonians-5-18','web-romans-15-13','web-john-15-9'] },
  sad: { label: 'a little low', mark: '⌁', words: ['sad','low','grief','grieving','loss','cry','crying','hurt','heartbroken','depressed','hopeless'], verses: ['web-psalm-34-18','web-matthew-11-28','web-john-14-27'] },
  overwhelmed: { label: 'overwhelmed', mark: '≋', words: ['overwhelmed','exhausted','tired','burned out','burnt out','too much','burden','drained','busy','heavy'], verses: ['web-matthew-11-28','web-john-14-27','web-psalm-34-18'] },
  grateful: { label: 'grateful', mark: '☼', words: ['grateful','thankful','thanks','blessed','appreciate','gratitude'], verses: ['web-1-thessalonians-5-18','web-john-15-9','web-romans-15-13'] },
  unsure: { label: 'not sure', mark: '·', words: ['unsure','confused','lost','uncertain','not sure'], verses: ['web-romans-15-13','web-matthew-11-28','web-john-14-27'] },
};

export function detectFeelings(text) {
  const input = text.toLowerCase().replaceAll('’', "'");
  const matches = [];
  for (const [mood, item] of Object.entries(feelings)) {
    for (const word of item.words) {
      const pattern = new RegExp(`\\b${word}\\b`, 'g');
      for (const match of input.matchAll(pattern)) {
        const before = input.slice(Math.max(0, match.index - 32), match.index);
        if (/(?:not|never|no longer|don't|do not|isn't|wasn't)\s+(?:(?:feel|feeling|felt|am|be)\s+)?(?:(?:very|so|really)\s+)?$/.test(before)) continue;
        matches.push({ mood, word, index: match.index });
      }
    }
  }
  const scores = {};
  for (const match of matches) scores[match.mood] = (scores[match.mood] || 0) + 1;
  const ranked = Object.entries(scores).sort((a,b) => b[1] - a[1]);
  return {
    primary: ranked[0]?.[0] || 'unsure',
    words: [...new Set(matches.sort((a,b) => a.index - b.index).map(x => x.word))].slice(0,6),
  };
}

export function needsImmediateSupport(text) {
  return /\b(kill myself|end my life|hurt myself|suicidal|suicide)\b/i.test(text);
}

// Explicit choices lead; only the words accepted in the review influence the rest.
export function recommendVerses(chosen = {}, acceptedWords = []) {
  const selected = Object.entries(chosen)
    .filter(([id, intensity]) => feelings[id] && [1,2,3].includes(intensity))
    .sort((a,b) => b[1] - a[1]).map(([id]) => id);
  const detected = detectFeelings(acceptedWords.join('. '));
  const remaining = Object.keys(feelings).filter(id => !selected.includes(id) &&
    detected.words.some(word => feelings[id].words.includes(word)));
  const ordered = [...selected, ...remaining];
  if (!ordered.length) ordered.push('unsure');
  const result = [];
  for (let round = 0; round < 3; round++) {
    for (const mood of ordered) {
      const id = feelings[mood].verses[round];
      if (!result.includes(id)) result.push(id);
      if (result.length === 3) return result;
    }
  }
  return result;
}
