import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Body, Button, Card, Subheading, colors } from "./ui";
import { aiCopy } from "../lib/ai-copy";
import type { Language } from "../lib/content";
import { backend } from "../lib/backend";

export default function GuidanceControl({
  language,
  value,
  onChange,
  disabled,
  children,
}: {
  language: Language;
  value: boolean;
  onChange: (enabled: boolean) => void;
  disabled: boolean;
  children?: React.ReactNode;
}) {
  const [details, setDetails] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let active = true,
      authChanged = false;
    void backend?.auth
      .getSession()
      .then(({ data }) => {
        if (active && !authChanged) setSignedIn(!!data.session);
      })
      .catch(() => {});
    const sub = backend?.auth.onAuthStateChange((_event, session) => {
      authChanged = true;
      if (active) setSignedIn(!!session);
    });
    return () => {
      active = false;
      sub?.data.subscription.unsubscribe();
    };
  }, []);
  return (
    <View style={styles.control}>
      <View style={styles.row}>
        <Ionicons name="sparkles-outline" size={20} color={colors.gold} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.title}>{aiCopy(language, "compactTitle")}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={aiCopy(language, "howItWorks")}
          onPress={() => setDetails(true)}
          style={styles.info}
        >
          <Ionicons
            name="information-circle-outline"
            size={21}
            color={colors.muted}
          />
        </Pressable>
        <Switch
          accessibilityLabel={aiCopy(language, "compactTitle")}
          value={value}
          disabled={disabled}
          trackColor={{ false: colors.line, true: colors.green }}
          thumbColor={colors.white}
          onValueChange={(enabled) =>
            enabled ? setDetails(true) : onChange(false)
          }
        />
      </View>
      {value && !signedIn && (
        <Button
          secondary
          disabled={disabled}
          title={aiCopy(language, "signIn")}
          onPress={() => router.push("/account")}
        />
      )}
      {children}
      <Modal
        visible={details}
        transparent
        animationType="fade"
        onRequestClose={() => setDetails(false)}
      >
        <View style={styles.backdrop}>
          <ScrollView
            style={styles.sheet}
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          >
            <Card>
              <Subheading>{aiCopy(language, "compactTitle")}</Subheading>
              <Body>{aiCopy(language, "consent")}</Body>
              {!value && (
                <Button
                  title={aiCopy(language, "agree")}
                  disabled={disabled}
                  onPress={() => {
                    onChange(true);
                    setDetails(false);
                  }}
                />
              )}
              <Button
                secondary
                title={aiCopy(language, "closeDetails")}
                onPress={() => setDetails(false)}
              />
            </Card>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  control: { gap: 8 },
  info: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 7 },
  title: { color: colors.ink, fontSize: 15, fontWeight: "600", lineHeight: 22 },
  backdrop: {
    flex: 1,
    backgroundColor: "#00000088",
    padding: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: { width: "100%", maxWidth: 500, maxHeight: "90%", flexGrow: 0 },
});
