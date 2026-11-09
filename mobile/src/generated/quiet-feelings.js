export const feelings = {
  anxious: { label: 'anxious', mark: '≈', words: ['anxious','anxiety','worried','worry','scared','afraid','stressed','stress','panic','nervous','future'], verses: ['web-john-14-27','web-matthew-11-28','web-romans-15-13'] },
  lonely: { label: 'lonely', mark: '☾', words: ['lonely','alone','isolated','disconnected','unseen','miss','missing','belong'], verses: ['web-john-15-9','web-psalm-34-18','web-romans-15-13'] },
  great: { label: 'great', mark: '✧', words: ['great','happy','joy','joyful','excited','wonderful','good','amazing','peaceful'], verses: ['web-1-thessalonians-5-18','web-romans-15-13','web-john-15-9'] },
  sad: { label: 'a little low', mark: '⌁', words: ['sad','low','grief','grieving','loss','cry','crying','hurt','heartbroken','depressed','hopeless'], verses: ['web-psalm-34-18','web-matthew-11-28','web-john-14-27'] },
  overwhelmed: { label: 'overwhelmed', mark: '≋', words: ['overwhelmed','exhausted','tired','burned out','burnt out','too much','burden','drained','busy','heavy'], verses: ['web-matthew-11-28','web-john-14-27','web-psalm-34-18'] },
  grateful: { label: 'grateful', mark: '☼', words: ['grateful','thankful','thanks','blessed','appreciate','gratitude'], verses: ['web-1-thessalonians-5-18','web-john-15-9','web-romans-15-13'] },
  unsure: { label: 'not sure', mark: '·', words: ['unsure','confused','lost','uncertain','not sure'], verses: ['web-romans-15-13','web-matthew-11-28','web-john-14-27'] },
};

// Feelings in Portuguese, Spanish and Russian. A trailing * matches any
// ending (ansioso/ansiosa, sozinho/sozinha, тревожно/тревожный), since these
// languages change word endings for gender, number and tense.
export const feelingWords = {
  pt: {
    anxious: ['ansios*','ansiedade','preocupad*','preocupação','preocupo','medo','assustad*','nervos*','estressad*','estresse','pânico','aflit*','angústia','angustiad*'],
    lonely: ['sozinh*','solidão','solitári*','isolad*','abandonad*','saudade*','ninguém me'],
    great: ['feliz','felizes','felicidade','alegri*','alegre','content*','maravilhos*','animad*','empolgad*','ótimo','ótima','incrível'],
    sad: ['triste*','tristeza','chorei','chorando','chorar','choro','desanimad*','abatid*','magoad*','coração partido','deprimid*','pra baixo','para baixo'],
    overwhelmed: ['sobrecarregad*','exaust*','cansad*','esgotad*','não aguento','não dou conta','sem forças','demais pra mim'],
    grateful: ['grato','grata','gratos','gratas','gratidão','agradecid*','agradeço','abençoad*'],
    unsure: ['confus*','perdid*','indecis*','incert*','não sei o que fazer'],
    hopeless: ['sem esperança','desesperanç*','desesperad*','não vejo saída','nada vai mudar'],
    hopeful: ['esperanç*','otimist*','recomeço','novo começo'],
    peaceful: ['em paz','tranquil*','calm*','seren*','sossegad*'],
  },
  es: {
    anxious: ['ansios*','ansiedad','preocupad*','preocupación','miedo','asustad*','nervios*','estresad*','estrés','pánico','angustia*'],
    lonely: ['sola','solos','solas','me siento solo','soledad','aislad*','abandonad*','nadie me'],
    great: ['feliz','felices','felicidad','alegr*','content*','maravillos*','emocionad*','genial','increíble'],
    sad: ['triste*','tristeza','lloré','llorando','llorar','llanto','desanimad*','abatid*','dolid*','corazón roto','deprimid*'],
    overwhelmed: ['agobiad*','abrumad*','exhaust*','cansad*','agotad*','no puedo más','demasiado para mí'],
    grateful: ['agradecid*','agradezco','gratitud','bendecid*'],
    unsure: ['confundid*','perdid*','indecis*','insegur*','no sé qué hacer'],
    hopeless: ['sin esperanza','desesperanz*','desesperad*','nada va a cambiar'],
    hopeful: ['esperanz*','optimis*','nuevo comienzo'],
    peaceful: ['en paz','tranquil*','calm*','seren*'],
  },
  ru: {
    anxious: ['тревог*','тревожн*','беспоко*','волну*','страх*','страшно','боюсь','паник*','нервн*','стресс*'],
    lonely: ['одинок*','одиночеств*','никому не нужн*','скучаю'],
    great: ['счастлив*','радост*','рада','рад','радуюсь','прекрасн*','замечательн*','отличн*'],
    sad: ['грустн*','грусть','печал*','плак*','плачу','тоск*','уныни*','депресс*'],
    overwhelmed: ['устал*','измотан*','выгор*','нет сил','слишком много','не справляюсь'],
    grateful: ['благодар*','спасибо','благословен*'],
    unsure: ['запута*','растерян*','не знаю что делать','не уверен*'],
    hopeless: ['нет надежд*','без надежд*','безнадёжн*','безнадежн*','отчаян*','ничего не изменится','нет смысла'],
    hopeful: ['надежд*','оптимис*'],
    peaceful: ['спокойн*','на душе мир','умиротвор*'],
  },
};
// "Not sad", "ya no", "не грустно", and "sem/sin/без/нет" ("sem esperança").
const negated = /(?:^|[^\p{L}])(?:não|nao|nunca|já não|ya no|no|ni|sem|sin|не|нет|без|больше не|никогда не)\s+(?:(?:estou|estava|me sinto|sinto|fico|estoy|estaba|me siento|siento|чувствую себя|чувствую)\s+)?(?:(?:muito|tão|tao|tan|muy|очень|так)\s+)?$/u;
const escape = (word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function detectInLanguage(text, words) {
  const input = text.toLowerCase().replaceAll('’', "'");
  const matches = [];
  for (const [mood, list] of Object.entries(words)) {
    for (const entry of list) {
      const stem = entry.endsWith('*');
      const word = stem ? entry.slice(0, -1) : entry;
      const pattern = new RegExp(`(?<!\\p{L})${escape(word)}${stem ? '\\p{L}*' : '(?!\\p{L})'}`, 'gu');
      for (const match of input.matchAll(pattern)) {
        const before = input.slice(Math.max(0, match.index - 32), match.index);
        if (negated.test(before)) continue;
        matches.push({ mood, word: match[0], index: match.index });
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

export function detectFeelings(text, language = 'en') {
  if (language !== 'en') return feelingWords[language] ? detectInLanguage(text, feelingWords[language]) : { primary: 'unsure', words: [] };
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
