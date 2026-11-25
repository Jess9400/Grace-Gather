import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Body, External, colors } from "./quiet-ui";
import type { Language, Tradition } from "../lib/content";

const copy = {
  en: [
    "These are attributed approaches to reading Scripture, not verse-specific agreement between churches.",
    "Catholic",
    "Protestant · Westminster",
    "Orthodox",
    "Read the passage in its literary setting and within the whole of Scripture. Catholic interpretation also considers living Tradition and the analogy of faith.",
    "The Westminster tradition treats Scripture as its own interpreter: clearer passages help illuminate difficult ones. This represents one Protestant tradition, not every Protestant church.",
    "Orthodox study reads Scripture within the worship and life of the Church, drawing on the Church Fathers and Holy Tradition.",
    "Sources & study notes",
  ],
  pt: [
    "São abordagens de leitura identificadas pela fonte, não um consenso entre igrejas sobre este versículo.",
    "Católica",
    "Protestante · Westminster",
    "Ortodoxa",
    "Leia a passagem em seu contexto literário e no conjunto das Escrituras. A interpretação católica também considera a Tradição viva e a analogia da fé.",
    "A tradição de Westminster entende que a Escritura interpreta a própria Escritura: passagens mais claras ajudam a compreender as difíceis. É uma tradição protestante, não uma definição de todas as igrejas.",
    "O estudo ortodoxo lê as Escrituras na vida e na liturgia da Igreja, recorrendo aos Padres da Igreja e à Santa Tradição.",
    "Fontes e notas de estudo",
  ],
  es: [
    "Son enfoques de lectura atribuidos a su fuente, no un consenso entre iglesias sobre este versículo.",
    "Católica",
    "Protestante · Westminster",
    "Ortodoxa",
    "Lee el pasaje en su contexto literario y en el conjunto de la Escritura. La interpretación católica también considera la Tradición viva y la analogía de la fe.",
    "La tradición de Westminster entiende que la Escritura se interpreta a sí misma: los pasajes más claros ayudan a comprender los difíciles. Es una tradición protestante, no una definición de todas las iglesias.",
    "El estudio ortodoxo lee la Escritura dentro de la vida y la liturgia de la Iglesia, recurriendo a los Padres y a la Santa Tradición.",
    "Fuentes y notas de estudio",
  ],
  ru: [
    "Это подходы к чтению с указанием источника, а не утверждение, что все церкви одинаково толкуют этот стих.",
    "Католический",
    "Протестантский · Вестминстер",
    "Православный",
    "Читайте отрывок в его литературном контексте и в единстве всего Писания. Католическое толкование также учитывает живое Предание и аналогию веры.",
    "Вестминстерская традиция считает Писание собственным толкователем: более ясные отрывки помогают понять трудные. Это одна из протестантских традиций, а не описание всех церквей.",
    "Православный подход читает Писание в жизни и богослужении Церкви, обращаясь к Отцам Церкви и Священному Преданию.",
    "Источники и примечания",
  ],
};
const sources = [
  [
    "Dei Verbum §12",
    "https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_const_19651118_dei-verbum_en.html",
  ],
  ["Westminster Confession 1.9", "https://opc.org/wcf.html#Chapter_01"],
  [
    "OCA · Biblical interpretation",
    "https://www.oca.org/orthodoxy/the-orthodox-faith/doctrine-scripture/the-bible/interpretation",
  ],
];
export default function StudyTraditions({
  language,
  tradition,
}: {
  language: Language;
  tradition: Tradition;
}) {
  const c = copy[language];
  const [selected, setSelected] = useState(
    ["catholic", "protestant", "orthodox"].indexOf(tradition),
  );
  const [footnote, setFootnote] = useState(false);
  return (
    <View style={{ gap: 16 }}>
      <Body small>{c[0]}</Body>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
        {[0, 1, 2].map((index) => (
          <Pressable
            key={index}
            accessibilityRole="tab"
            accessibilityState={{ selected: selected === index }}
            onPress={() => setSelected(index)}
            style={{
              paddingVertical: 12,
              borderBottomWidth: selected === index ? 2 : 0,
              borderColor: colors.gold,
            }}
          >
            <Text
              style={{ color: selected === index ? colors.ink : colors.muted }}
            >
              {c[index + 1]}
            </Text>
          </Pressable>
        ))}
      </View>
      <Body>{c[selected + 4]}</Body>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: footnote }}
        onPress={() => setFootnote(!footnote)}
      >
        <Text
          style={{ fontSize: 12, color: colors.muted, paddingVertical: 12 }}
        >
          {c[7]} ⌄
        </Text>
      </Pressable>
      {footnote && (
        <External title={sources[selected][0]} url={sources[selected][1]} />
      )}
    </View>
  );
}
