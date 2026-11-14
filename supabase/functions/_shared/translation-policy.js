const languages = new Set(['en', 'pt', 'es', 'ru']);
export function translationInput(value) {
  if (!value || !languages.has(value.language) || !Array.isArray(value.items) || !value.items.length || value.items.length > 12)
    throw Error('invalid_entry');
  const sources = new Set(['comment','community_title','community_body','friend_message']);
  const items = value.items.map(item => {
    if (!item || !sources.has(item.source) || typeof item.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)) throw Error('invalid_entry');
    return {source:item.source,id:item.id};
  });
  return { language: value.language, items };
}
export function translationOutput(raw, input) {
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw Error('invalid_model_response'); }
  if (!Array.isArray(parsed.translations) || parsed.translations.length !== input.texts.length ||
    parsed.translations.some(x => typeof x !== 'string' || !x.trim() || x.length > 6000))
    throw Error('invalid_model_response');
  return parsed.translations;
}
