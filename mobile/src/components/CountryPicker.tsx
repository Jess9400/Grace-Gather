import { useMemo, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import countries from "../generated/countries.json";
import type { Language } from "../lib/content";
import { colors, Field } from "./quiet-ui";

const text = {
  en: { label: "Country (optional)", hint: "Start typing a country", empty: "No matching countries" },
  pt: { label: "País (opcional)", hint: "Digite o nome de um país", empty: "Nenhum país encontrado" },
  es: { label: "País (opcional)", hint: "Escribe el nombre de un país", empty: "No se encontraron países" },
  ru: { label: "Страна (необязательно)", hint: "Начните вводить название страны", empty: "Страны не найдены" },
};
const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();

export default function CountryPicker({ language, value, onChange }: { language: Language; value: string; onChange: (value: string) => void }) {
  const selected = countries.find((item) => item.code === value);
  const [query, setQuery] = useState(selected?.[language] ?? "");
  const [editing, setEditing] = useState(false);
  const matches = useMemo(() => {
    const search = fold(query);
    if (!search) return [];
    return countries.filter((item) => fold(item[language]).includes(search) || fold(item.en).includes(search) || fold(item.code) === search).slice(0, 8);
  }, [query, language]);
  return <View>
    <Field label={text[language].label} value={editing ? query : (selected?.[language] ?? "")} placeholder={text[language].hint} autoCorrect={false}
      onFocus={() => { setQuery(selected?.[language] ?? ""); setEditing(true); }} onChangeText={(next) => { setQuery(next); if (value) onChange(""); }} />
    {editing && query.trim().length > 0 && <View style={styles.results}>
      {matches.length ? matches.map((item) => <Pressable key={item.code} accessibilityRole="button" style={styles.option}
        onPress={() => { setQuery(item[language]); onChange(item.code); setEditing(false); Keyboard.dismiss(); }}>
        <Text style={styles.optionText}>{item[language]}</Text>
      </Pressable>) : <Text style={styles.empty}>{text[language].empty}</Text>}
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  results: { borderRadius: 14, backgroundColor: colors.white, paddingHorizontal: 14, marginTop: 4 },
  option: { minHeight: 44, justifyContent: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  optionText: { color: colors.ink, fontSize: 16 },
  empty: { color: colors.muted, paddingVertical: 14 },
});
