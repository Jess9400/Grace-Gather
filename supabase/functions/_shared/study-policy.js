export function studyInput(value) {
  if (value?.consent !== 'study-qwen-v1') throw Error('consent_required');
  const p = value.preferences;
  if (!p || !['en','pt','es','ru'].includes(p.language) || !['en','pt','es','ru'].includes(p.scriptureLanguage) || !['protestant','catholic','orthodox'].includes(p.tradition) || typeof p.edition !== 'string' || p.edition.length > 80) throw Error('invalid_preferences');
  if (!Array.isArray(value.messages) || !value.messages.length || value.messages.length > 8) throw Error('invalid_entry');
  const messages=value.messages.map(m=>{
    if (!m || !['user','assistant'].includes(m.role) || typeof m.content!=='string' || !m.content.trim() || m.content.length>6000) throw Error('invalid_entry');
    return {role:m.role,content:m.content.trim()};
  });
  if(messages.at(-1).role!=='user') throw Error('invalid_entry');
  return {messages,preferences:{language:p.language,scriptureLanguage:p.scriptureLanguage,tradition:p.tradition,edition:p.edition}};
}
