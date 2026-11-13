const languages = new Set(['en', 'pt', 'es', 'ru']);
export function translationInput(value) {
  if (!value || !languages.has(value.language) || !Array.isArray(value.texts) || !value.texts.length || value.texts.length > 12)
    throw Error('invalid_entry');
  const texts = value.texts.map(text => {
    if (typeof text !== 'string' || !text.trim() || text.length > 2000) throw Error('invalid_entry');
    return text;
  });
  if (texts.reduce((n, text) => n + text.length, 0) > 12000) throw Error('too_large');
  return { language: value.language, texts };
}
export function translationOutput(raw, input) {
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw Error('invalid_model_response'); }
  if (!Array.isArray(parsed.translations) || parsed.translations.length !== input.texts.length ||
    parsed.translations.some(x => typeof x !== 'string' || !x.trim() || x.length > 6000))
    throw Error('invalid_model_response');
  return parsed.translations;
}
