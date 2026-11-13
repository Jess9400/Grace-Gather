import { createElement } from "react";
import { Pressable, Text, View } from "react-native";
import { colors } from "./quiet-ui";
import type { Language } from "../lib/content";

const clear = { en: "Clear", pt: "Limpar", es: "Borrar", ru: "Очистить" };
export default function JournalDateField({ label, value, language, onChange }: {
  label: string; value: string; language: Language; onChange: (value: string) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.ink }}>{label}</Text>
      {createElement("input", {
        type: "date", value, lang: language, "aria-label": label,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(event.currentTarget.value),
        style: { boxSizing: "border-box", width: "100%", minHeight: 52, border: `1px solid ${colors.cardLine}`, borderRadius: 14, padding: "12px 15px", color: colors.ink, background: colors.white, colorScheme: "dark", fontSize: 16 },
      })}
      {!!value && <Pressable accessibilityRole="button" onPress={() => onChange("")}><Text style={{ color: colors.goldInk }}>{clear[language]}</Text></Pressable>}
    </View>
  );
}
