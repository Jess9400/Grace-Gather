import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Body, colors, External } from "./quiet-ui";
import { findStepWords, loadStepWords, type StepWord } from "../lib/stepbible";
import source from "../generated/stepbible/source.json";
import copy from "../lib/pro-study-preview.json";
import type { Language } from "../lib/content";
export default function StepBibleSearch({ language }: { language: Language }) {
  const c = copy[language];
  const [rows, setRows] = useState<StepWord[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [showSource, setShowSource] = useState(false);
  const [query, setQuery] = useState("G3056");
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    loadStepWords()
      .then((value) => {
        if (active) setRows(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  const matches = useMemo(
    () => findStepWords(rows ?? [], query),
    [rows, query],
  );
  return (
    <View style={{ gap: 16 }}>
      <TextInput
        accessibilityLabel={c.searchWords}
        placeholder={c.searchWords}
        placeholderTextColor={colors.muted}
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          setSelected(null);
        }}
        autoCapitalize="none"
        style={{
          color: colors.ink,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: 16,
          fontSize: 17,
        }}
        maxLength={80}
      />
      <Body small>{c.sourceEnglish}</Body>
      {!rows && !failed && <ActivityIndicator color={colors.goldInk} />}
      {failed && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setFailed(false);
            setAttempt(attempt + 1);
          }}
        >
          <Body>{c.retry}</Body>
        </Pressable>
      )}
      {rows && matches.length === 0 && <Body>{c.noWords}</Body>}
      {matches.map((row) => (
        <Pressable
          key={row.id}
          accessibilityRole="button"
          accessibilityState={{ expanded: selected === row.id }}
          onPress={() => setSelected(selected === row.id ? null : row.id)}
          style={{
            gap: 5,
            paddingVertical: 15,
            borderBottomWidth: 1,
            borderColor: colors.line,
          }}
        >
          <Text selectable style={{ color: colors.ink, fontSize: 23 }}>
            {row.word}
          </Text>
          <Body>
            {row.transliteration} · {row.id}
          </Body>
          <Body>{row.gloss}</Body>
          {selected === row.id && (
            <>
              <Body small>
                {row.language} · {row.grammar}
              </Body>
              <Body small>{c.lexicalContext}</Body>
            </>
          )}
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: showSource }}
        onPress={() => setShowSource(!showSource)}
      >
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          STEPBible · CC BY 4.0 {showSource ? "⌃" : "⌄"}
        </Text>
      </Pressable>
      {showSource && (
        <>
          <Body small>{source.attribution}</Body>
          <Body small>{source.changes}</Body>
          <External title="STEPBible" url={source.source} />
          <External title={c.license} url={source.license} />
        </>
      )}
    </View>
  );
}
