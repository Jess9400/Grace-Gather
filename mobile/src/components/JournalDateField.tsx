import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { colors } from "./quiet-ui";
import { dateKey } from "../lib/journal-export";
import type { Language } from "../lib/content";

const words = {
  choose: { en: "Choose date", pt: "Escolher data", es: "Elegir fecha", ru: "Выбрать дату" },
  clear: { en: "Clear", pt: "Limpar", es: "Borrar", ru: "Очистить" },
  done: { en: "Done", pt: "Concluir", es: "Listo", ru: "Готово" },
};

export default function JournalDateField({ label, value, language, onChange }: {
  label: string; value: string; language: Language; onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => new Date());
  const display = value ? new Date(`${value}T12:00:00`).toLocaleDateString(language, { dateStyle: "medium" }) : words.choose[language];
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.ink }}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${display}`} onPress={() => {
        setDraft(value ? new Date(`${value}T12:00:00`) : new Date());
        setOpen(true);
      }} style={{ borderWidth: 1, borderColor: colors.cardLine, borderRadius: 16, padding: 18, backgroundColor: colors.white }}>
        <Text style={{ color: colors.ink, fontSize: 16 }}>{display}</Text>
      </Pressable>
      {!!value && <Pressable accessibilityRole="button" onPress={() => onChange("")}><Text style={{ color: colors.goldInk }}>{words.clear[language]}</Text></Pressable>}
      {open && <DateTimePicker value={draft} mode="date" display={Platform.OS === "ios" ? "spinner" : "default"} locale={language} onChange={(event, date) => {
        if (Platform.OS === "android") {
          setOpen(false);
          if (event.type === "set" && date) onChange(dateKey(date));
        } else if (date) setDraft(date);
      }} />}
      {open && Platform.OS === "ios" && <Pressable accessibilityRole="button" onPress={() => { onChange(dateKey(draft)); setOpen(false); }}><Text style={{ color: colors.goldInk, fontWeight: "600" }}>{words.done[language]}</Text></Pressable>}
    </View>
  );
}
