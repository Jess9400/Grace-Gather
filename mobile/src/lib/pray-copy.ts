import type { Language } from "./content";
// Copy and prayers for the Pray screen, opened from the icon in the Orthodox
// church. The Russian prayers are the traditional Church Slavonic texts; the
// other languages are common translations. All of it awaits review by a priest
// or editor and the four-language review.
const L = (en: string, pt: string, es: string, ru: string) => ({
  en,
  pt,
  es,
  ru,
});
const words = {
  title: L("Pray", "Rezar", "Rezar", "Помолиться"),
  intro: L(
    "Choose a prayer, or simply stay a while before the icon.",
    "Escolha uma oração ou simplesmente fique um pouco diante do ícone.",
    "Elige una oración o simplemente quédate un momento ante el icono.",
    "Выберите молитву или просто побудьте перед иконой.",
  ),
  prayers: L("Prayers", "Orações", "Oraciones", "Молитвы"),
  forOthers: L(
    "For your loved ones",
    "Pelos seus",
    "Por los tuyos",
    "О близких",
  ),
  health: L("For the living", "Pelos vivos", "Por los vivos", "О здравии"),
  repose: L(
    "For the departed",
    "Pelos falecidos",
    "Por los difuntos",
    "Об упокоении",
  ),
  namesHealth: L(
    "Who among the living would you like to pray for? Write their names.",
    "Por quem, entre os vivos, quer rezar? Escreva os nomes.",
    "¿Por quién de los vivos quieres rezar? Escribe sus nombres.",
    "За кого из живых помолиться? Напишите имена.",
  ),
  namesRepose: L(
    "Whom among the departed would you like to remember? Write their names.",
    "Quem, entre os falecidos, quer lembrar? Escreva os nomes.",
    "¿A quién de los difuntos quieres recordar? Escribe sus nombres.",
    "Кого из ушедших помянуть? Напишите имена.",
  ),
  namesField: L("Names", "Nomes", "Nombres", "Имена"),
  namesPlaceholder: L(
    "Maria, Nicholas, Anna",
    "Maria, Nicolau, Ana",
    "María, Nicolás, Ana",
    "Мария, Николай, Анна",
  ),
  prayForThem: L(
    "Pray for them",
    "Rezar por eles",
    "Rezar por ellos",
    "Помолиться о них",
  ),
  needNames: L(
    "Write at least one name.",
    "Escreva pelo menos um nome.",
    "Escribe al menos un nombre.",
    "Напишите хотя бы одно имя.",
  ),
  namesPrivate: L(
    "The names are not saved or sent anywhere.",
    "Os nomes não são salvos nem enviados.",
    "Los nombres no se guardan ni se envían.",
    "Имена нигде не сохраняются и никуда не отправляются.",
  ),
  ownWords: L(
    "In your own words",
    "Com suas próprias palavras",
    "Con tus propias palabras",
    "Своими словами",
  ),
  ownWordsSub: L(
    "Talk to God in your journal",
    "Fale com Deus no seu diário",
    "Habla con Dios en tu diario",
    "Поговорить с Богом в дневнике",
  ),
  askPrayer: L(
    "Ask others to pray for you",
    "Pedir que rezem por você",
    "Pedir que recen por ti",
    "Попросить о молитве",
  ),
  askPrayerSub: L(
    "Share a prayer request with the community",
    "Compartilhe um pedido de oração com a comunidade",
    "Comparte una petición de oración con la comunidad",
    "Поделиться просьбой о молитве с сообществом",
  ),
  amen: L("Amen", "Amém", "Amén", "Аминь"),
  lightCandle: L(
    "Light a candle",
    "Acender uma vela",
    "Encender una vela",
    "Поставить свечу",
  ),
};
export type PrayWord = keyof typeof words;
export function prayCopy(language: Language, key: PrayWord) {
  return words[key][language] ?? words[key].en;
}

const prayers = [
  {
    id: "our-father",
    title: L("Our Father", "Pai Nosso", "Padre Nuestro", "Отче наш"),
    note: L(
      "The Lord's Prayer",
      "A oração do Senhor",
      "La oración del Señor",
      "Молитва Господня",
    ),
    text: L(
      "Our Father, who art in heaven,\nhallowed be thy name;\nthy kingdom come;\nthy will be done\non earth as it is in heaven.\nGive us this day our daily bread;\nand forgive us our trespasses,\nas we forgive those who trespass against us;\nand lead us not into temptation,\nbut deliver us from evil.",
      "Pai nosso que estais nos céus,\nsantificado seja o vosso nome;\nvenha a nós o vosso reino;\nseja feita a vossa vontade,\nassim na terra como no céu.\nO pão nosso de cada dia nos dai hoje;\nperdoai-nos as nossas ofensas,\nassim como nós perdoamos a quem nos tem ofendido;\ne não nos deixeis cair em tentação,\nmas livrai-nos do mal.",
      "Padre nuestro que estás en el cielo,\nsantificado sea tu nombre;\nvenga a nosotros tu reino;\nhágase tu voluntad\nen la tierra como en el cielo.\nDanos hoy nuestro pan de cada día;\nperdona nuestras ofensas,\ncomo también nosotros perdonamos a los que nos ofenden;\nno nos dejes caer en la tentación,\ny líbranos del mal.",
      "Отче наш, Иже еси на небесех!\nДа святится имя Твое,\nда приидет Царствие Твое,\nда будет воля Твоя,\nяко на небеси и на земли.\nХлеб наш насущный даждь нам днесь;\nи остави нам долги наша,\nякоже и мы оставляем должником нашим;\nи не введи нас во искушение,\nно избави нас от лукаваго.",
    ),
  },
  {
    id: "theotokos",
    title: L(
      "Rejoice, O Virgin Theotokos",
      "Virgem Mãe de Deus, alegra-te",
      "Virgen Madre de Dios, alégrate",
      "Богородице Дево, радуйся",
    ),
    note: L(
      "Hymn to the Mother of God",
      "Hino à Mãe de Deus",
      "Himno a la Madre de Dios",
      "Песнь Пресвятой Богородице",
    ),
    text: L(
      "Rejoice, O Virgin Theotokos,\nMary full of grace, the Lord is with thee.\nBlessed art thou among women,\nand blessed is the fruit of thy womb,\nfor thou hast borne the Saviour of our souls.",
      "Virgem Mãe de Deus, alegra-te,\nMaria cheia de graça, o Senhor é contigo.\nBendita és tu entre as mulheres\ne bendito é o fruto do teu ventre,\nporque deste à luz o Salvador das nossas almas.",
      "Virgen Madre de Dios, alégrate,\nMaría llena de gracia, el Señor es contigo.\nBendita tú eres entre las mujeres\ny bendito es el fruto de tu vientre,\nporque has dado a luz al Salvador de nuestras almas.",
      "Богородице Дево, радуйся,\nБлагодатная Марие, Господь с Тобою;\nблагословена Ты в женах\nи благословен Плод чрева Твоего,\nяко Спаса родила еси душ наших.",
    ),
  },
  {
    id: "jesus-prayer",
    title: L(
      "The Jesus Prayer",
      "Oração de Jesus",
      "Oración de Jesús",
      "Иисусова молитва",
    ),
    note: L(
      "A short prayer for every day",
      "Uma oração breve para cada dia",
      "Una oración breve para cada día",
      "Короткая молитва на каждый день",
    ),
    text: L(
      "Lord Jesus Christ, Son of God,\nhave mercy on me, a sinner.",
      "Senhor Jesus Cristo, Filho de Deus,\ntem piedade de mim, pecador.",
      "Señor Jesucristo, Hijo de Dios,\nten piedad de mí, pecador.",
      "Господи Иисусе Христе,\nСыне Божий,\nпомилуй мя, грешнаго.",
    ),
  },
  {
    id: "heavenly-king",
    title: L(
      "O Heavenly King",
      "Rei Celestial",
      "Rey Celestial",
      "Царю Небесный",
    ),
    note: L(
      "Prayer to the Holy Spirit",
      "Oração ao Espírito Santo",
      "Oración al Espíritu Santo",
      "Молитва Святому Духу",
    ),
    text: L(
      "O Heavenly King, Comforter, Spirit of truth,\nwho art everywhere present and fillest all things,\nTreasury of blessings and Giver of life:\ncome and abide in us,\ncleanse us from every stain,\nand save our souls, O Good One.",
      "Rei celestial, Consolador, Espírito da verdade,\nque estás em toda parte e tudo preenches,\nTesouro dos bens e Doador da vida,\nvem e habita em nós,\npurifica-nos de toda mancha\ne salva, ó Bondoso, as nossas almas.",
      "Rey celestial, Consolador, Espíritu de verdad,\nque estás en todas partes y lo llenas todo,\nTesoro de bienes y Dador de vida,\nven y habita en nosotros,\npurifícanos de toda mancha\ny salva, oh Bondadoso, nuestras almas.",
      "Царю Небесный, Утешителю, Душе истины,\nИже везде сый и вся исполняяй,\nСокровище благих и жизни Подателю,\nприиди и вселися в ны,\nи очисти ны от всякия скверны,\nи спаси, Блаже, души наша.",
    ),
  },
];

export type PrayerText = { title: string; text: string };

export function prayerList(language: Language) {
  return prayers.map((p) => ({
    id: p.id,
    title: p.title[language] ?? p.title.en,
    note: p.note[language] ?? p.note.en,
    text: p.text[language] ?? p.text.en,
  }));
}

// A short prayer for people named by the user: the living, or the departed.
export function namesPrayer(
  language: Language,
  kind: "health" | "repose",
  names: string,
): PrayerText {
  const living = {
    en: `Save, O Lord, and have mercy on your servants:\n${names}.\nGrant them health and salvation.`,
    pt: `Salva, Senhor, e tem piedade dos teus servos:\n${names}.\nConcede-lhes saúde e salvação.`,
    es: `Salva, Señor, y ten piedad de tus siervos:\n${names}.\nConcédeles salud y salvación.`,
    ru: `Спаси, Господи, и помилуй\nрабов Твоих:\n${names}.\nДаруй им здравие и спасение.`,
  };
  const departed = {
    en: `Give rest, O Lord, to the souls of your departed servants:\n${names}.\nForgive them every sin, voluntary and involuntary,\nand grant them the Kingdom of Heaven.`,
    pt: `Dá descanso, Senhor, às almas dos teus servos falecidos:\n${names}.\nPerdoa-lhes todo pecado, voluntário e involuntário,\ne concede-lhes o Reino dos Céus.`,
    es: `Da descanso, Señor, a las almas de tus siervos difuntos:\n${names}.\nPerdónales todo pecado, voluntario e involuntario,\ny concédeles el Reino de los Cielos.`,
    ru: `Упокой, Господи, души\nусопших рабов Твоих:\n${names}.\nПрости им все согрешения,\nвольные и невольные,\nи даруй им Царствие Небесное.`,
  };
  const text = kind === "health" ? living : departed;
  return {
    title: prayCopy(language, kind),
    text: text[language] ?? text.en,
  };
}
