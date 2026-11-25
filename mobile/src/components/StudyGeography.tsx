import mapLinks from "../generated/study-original/maps.json";
import { View } from "react-native";
import { External, Body } from "./quiet-ui";
import type { Language } from "../lib/content";
const titles = {
  en: [
    "Places in this book",
    "Explore the historical setting on OpenBible’s reference maps. Identifications can be uncertain; the source lists alternatives.",
  ],
  pt: [
    "Lugares deste livro",
    "Explore o contexto geográfico nos mapas de referência do OpenBible. Algumas localizações são incertas; a fonte apresenta alternativas.",
  ],
  es: [
    "Lugares de este libro",
    "Explora el contexto geográfico en los mapas de referencia de OpenBible. Algunas ubicaciones son inciertas; la fuente ofrece alternativas.",
  ],
  ru: [
    "Места этой книги",
    "Изучите географический контекст на справочных картах OpenBible. Некоторые места определены предположительно; источник приводит варианты.",
  ],
};
export default function StudyGeography({
  id,
  language,
}: {
  id: string;
  language: Language;
}) {
  const book = id.split(":").pop()!.split(".")[0];
  const url = (mapLinks as Record<string, string>)[book];
  return url ? (
    <View style={{ gap: 12 }}>
      <Body small>{titles[language][1]}</Body>
      <External title={titles[language][0]} url={url} />
      <Body small>OpenBible.info · CC BY · English</Body>
    </View>
  ) : null;
}
