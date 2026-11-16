import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Body, Button, Heading, Subheading, colors } from "./quiet-ui";
import PreviewDialog from "./PreviewDialog";
import type { Language } from "../lib/content";
import { termsCopy } from "../lib/terms-copy";
import { terms } from "../lib/terms-content";

export default function TermsAgreementNotice({ language, action }: { language: Language; action: "continue" | "signIn" }) {
  const [open, setOpen] = useState(false);
  const words = termsCopy[language] ?? termsCopy.en;
  return <>
    <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: "center" }}>
      {action === "signIn" ? words.signInNotice : words.continueNotice}
      <Text accessibilityRole="link" onPress={() => setOpen(true)} style={{ color: colors.goldInk, textDecorationLine: "underline" }}>{words.title}</Text>.
    </Text>
    <PreviewDialog visible={open} onClose={() => setOpen(false)} closeLabel={words.close}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1 }}><Heading>{words.title}</Heading></View>
        <Pressable accessibilityRole="button" accessibilityLabel={words.close} onPress={() => setOpen(false)} hitSlop={12} style={{ padding: 8 }}>
          <Ionicons name="close" size={24} color={colors.ink} />
        </Pressable>
      </View>
      <Body small>Grace &amp; Gather · {new Date(2026, 10, 16).toLocaleDateString(language, { day: "numeric", month: "long", year: "numeric" })}</Body>
      {(terms[language] ?? terms.en).map(([title, text]) => <TermsSection key={title} title={title} text={text} />)}
      <Button title={words.close} onPress={() => setOpen(false)} />
    </PreviewDialog>
  </>;
}

function TermsSection({ title, text }: { title: string; text: string }) {
  return <><Subheading>{title}</Subheading><Body>{text}</Body></>;
}
