// Writing that can't be understood yet: keyboard mashing, a test word, or no
// letters at all. Such an entry gets the "unclear" theme (Psalm 62:8) and a
// gentle invitation to add a few words, without an AI call and without using
// one of the day's replies. Real short entries ("Sad", "Amen", "Мне плохо")
// are never caught: most of the words must look like nonsense.
const VOWELS = /[aeiouyàáâãäåæèéêëìíîïòóôõöøùúûüýÿœаеёиоуыэюяіїє]/u;
const LATIN_OR_CYRILLIC = /^[a-zà-ÿœæа-яёіїє]+$/u;
const CONSONANT_RUN = /[bcdfghjklmnpqrstvwxzç]{5}|[бвгджзйклмнпрстфхцчшщ]{5}/u;
const FILLERS = new Set([
  'test', 'tests', 'testing', 'teste', 'testando', 'prueba', 'probando', 'тест', 'тестирую',
  'asdf', 'asd', 'qwe', 'qwer', 'qwerty', 'zxc', 'zxcv', 'sdf', 'hjkl',
  'йцу', 'йцукен', 'фыв', 'фыва', 'ячс', 'bla', 'blah', 'blabla', 'бла', 'блабла',
  'lorem', 'ipsum', 'xxx', 'xyz', 'abc', 'abcd',
]);
const KEYBOARD = [
  'asdf', 'sdfg', 'dfgh', 'fghj', 'ghjk', 'hjkl', 'qwer', 'wert', 'erty', 'rtyu', 'tyui',
  'yuio', 'uiop', 'zxcv', 'xcvb', 'cvbn', 'vbnm', 'йцук', 'цуке', 'укен', 'фыва', 'ывап',
  'вапр', 'ячсм', 'чсми',
];
function oddWord(word) {
  if (FILLERS.has(word)) return true;
  // Other alphabets are never judged.
  if (!LATIN_OR_CYRILLIC.test(word)) return false;
  if (word.length >= 3 && !VOWELS.test(word)) return true;
  if (CONSONANT_RUN.test(word)) return true;
  // lalala, fhfhfhf, aaaa
  if (/^(.{1,3})\1{2,}.?$/u.test(word)) return true;
  return word.length >= 4 && KEYBOARD.some((k) => word.includes(k));
}
export function unclearWriting(text) {
  // An empty text (voice or chosen feelings only) is not judged here.
  if (typeof text !== 'string' || !text.trim()) return false;
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? [];
  // Only numbers, symbols or emoji.
  if (!words.length) return true;
  return words.filter(oddWord).length / words.length >= 0.6;
}
export const UNCLEAR_REPLY = {
  en: "It's hard to tell what's on your heart today. You can add a few words whenever you're ready.",
  pt: 'É difícil perceber o que está no seu coração hoje. Você pode acrescentar algumas palavras quando quiser.',
  es: 'Es difícil saber qué hay en tu corazón hoy. Puedes añadir unas palabras cuando quieras.',
  ru: 'Пока трудно понять, что у вас на сердце. Можно добавить несколько слов, когда будете готовы.',
};
