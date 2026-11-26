import { useState } from "react";
import { View, Pressable, Text } from "react-native";
import { External, Body, colors } from "./quiet-ui";
import { StudyLink } from "./StudyControls";
import BibleAtlas from "./BibleAtlas";
import { historicalContext, contextLanguageIndex } from "../lib/study-context";
import modules from "../lib/study-social-context.json";
import type { Language } from "../lib/content";
const labels = {
  en: [
    "Historical & social setting",
    "Explore the map",
    "Sources & notes",
    "Book background, not a reconstruction of every verse.",
    "What do work, family ties, power or access to resources change in this scene?",
  ],
  pt: [
    "Contexto histórico e social",
    "Explorar o mapa",
    "Fontes e notas",
    "Contexto do livro, não uma reconstrução de cada versículo.",
    "Como trabalho, vínculos familiares, poder ou acesso a recursos influenciam esta cena?",
  ],
  es: [
    "Contexto histórico y social",
    "Explorar el mapa",
    "Fuentes y notas",
    "Contexto del libro, no una reconstrucción de cada versículo.",
    "¿Cómo influyen el trabajo, los vínculos familiares, el poder o el acceso a recursos en esta escena?",
  ],
  ru: [
    "Исторический и социальный мир",
    "Открыть карту",
    "Источники и примечания",
    "Фон книги, а не реконструкция каждого стиха.",
    "Как труд, семейные связи, власть или доступ к ресурсам влияют на эту сцену?",
  ],
};
export default function StudyGeography({
  id,
  language,
}: {
  id: string;
  language: Language;
}) {
  const [open, setOpen] = useState(false),
    [sources, setSources] = useState(false);
  const context = historicalContext(id),
    i = contextLanguageIndex[language],
    c = labels[language];
  const rows = context.modules
    .map(
      (key) =>
        (
          modules as Record<
            string,
            { title: string[]; text: string[]; source: string }
          >
        )[key],
    )
    .filter(Boolean);
  return (
    <View style={{ gap: 16, paddingVertical: 14 }}>
      <Text style={{ color: colors.goldInk, fontSize: 16, fontWeight: "600" }}>
        {c[0]}
      </Text>
      <Body small>{context.period[i]}</Body>
      <StudyLink
        icon="map-outline"
        title={c[1]}
        onPress={() => setOpen(true)}
      />
      {open && (
        <BibleAtlas
          book={context.book}
          region={context.region}
          language={language}
          onClose={() => setOpen(false)}
        />
      )}
      {rows.map((row) => (
        <View key={row.source} style={{ gap: 8 }}>
          <Body>{row.title[i]}</Body>
          <Body small>{row.text[i]}</Body>
        </View>
      ))}
      {!!rows.length && <Body small>{c[4]}</Body>}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: sources }}
        onPress={() => setSources(!sources)}
      >
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          {c[2]} {sources ? "⌃" : "⌄"}
        </Text>
      </Pressable>
      {sources && (
        <>
          <Body small>{c[3]}</Body>
          {rows.map((row) => (
            <External key={row.source} title={row.title[i]} url={row.source} />
          ))}
          <Body small>
            Map data: Natural Earth · OpenBible.info. Original editorial
            summaries, separate from Scripture.
          </Body>
        </>
      )}
    </View>
  );
}
