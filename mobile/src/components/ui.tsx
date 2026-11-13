import MemberAvatar from "./MemberAvatar";
import React, { createContext, useContext } from "react";
import {
  ScrollView,
  KeyboardAvoidingView,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Linking,
  ActivityIndicator,
  TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../lib/state";
import { label } from "../lib/labels";
import { FormField } from "./FormField";
// The same Candlelight palette as quiet-ui, for the older Confession and
// gathering components: dark espresso, ivory words, cream fills, gold details.
export const colors = {
  paper: "#1B1612",
  ink: "#F4EBDA",
  muted: "#B7A993",
  inactive: "#F4EBDAB3",
  green: "#F1E4CB",
  pale: "#2F271F",
  line: "#F4EBDA2D",
  white: "#2A221B",
  gold: "#C9A45C",
  cardInk: "#F4EBDA",
  cardMuted: "#B7A993",
  cardLine: "#F4EBDA33",
};
const CardSurface = createContext(false);
type SurfacePalette = {
  background: string;
  surface: string;
  field: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  accentInk: string;
};
const SurfaceContext = createContext<SurfacePalette | null>(null);
export function SurfaceTheme({
  palette,
  children,
}: {
  palette: SurfacePalette | null;
  children: React.ReactNode;
}) {
  return (
    <SurfaceContext.Provider value={palette}>
      {children}
    </SurfaceContext.Provider>
  );
}
export function useSurfaceColors() {
  const card = useContext(CardSurface);
  const theme = useContext(SurfaceContext);
  return (
    theme || {
      ink: card ? colors.cardInk : colors.ink,
      muted: card ? colors.cardMuted : colors.muted,
      line: card ? colors.cardLine : colors.line,
    }
  );
}
export function Screen({
  children,
  back = false,
  quiet = false,
  keyboardAware = false,
  headerAction,
  scrollRef,
}: {
  children: React.ReactNode;
  back?: boolean;
  quiet?: boolean;
  keyboardAware?: boolean;
  headerAction?: React.ReactNode;
  scrollRef?: React.RefObject<React.ComponentRef<typeof ScrollView> | null>;
}) {
  const { profile } = useApp();
  const theme = useContext(SurfaceContext);
  return (
    <SafeAreaView
      style={[s.safe, theme && { backgroundColor: theme.background }]}
      edges={["top", "left", "right"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        enabled={keyboardAware && Platform.OS === "android"}
        behavior="height"
      >
        <ScrollView
          ref={scrollRef}
          automaticallyAdjustKeyboardInsets={keyboardAware}
          keyboardDismissMode={keyboardAware ? "interactive" : "none"}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.page}
        >
          {back && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={label(profile.language, "back")}
              style={{
                minWidth: 44,
                minHeight: 44,
                alignSelf: "flex-start",
                justifyContent: "center",
              }}
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/(tabs)")
              }
            >
              <Ionicons
                name="arrow-back"
                size={23}
                color={theme?.ink ?? colors.ink}
              />
            </Pressable>
          )}
          {!quiet && (
            <View style={s.brand}>
              <Ionicons name="leaf-outline" size={23} color={colors.gold} />
              <Text style={s.brandText}>GRACE & GATHER</Text>
              <View style={{ marginLeft: "auto" }}>{headerAction}</View>
              <Pressable
                accessibilityLabel={label(profile.language, "accountSettings")}
                accessibilityRole="button"
                onPress={() => router.push("/account")}
                style={{
                  minHeight: 44,
                  minWidth: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MemberAvatar />
              </Pressable>
            </View>
          )}
          {children}
          <View style={{ height: 26 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Heading({ children }: { children: React.ReactNode }) {
  const surface = useSurfaceColors();
  return (
    <Text
      accessibilityRole="header"
      style={[s.heading, { color: surface.ink }]}
    >
      {children}
    </Text>
  );
}
export function Subheading({ children }: { children: React.ReactNode }) {
  const surface = useSurfaceColors();
  return (
    <Text
      accessibilityRole="header"
      style={[s.subheading, { color: surface.ink }]}
    >
      {children}
    </Text>
  );
}
export function Body({
  children,
  small = false,
}: {
  children: React.ReactNode;
  small?: boolean;
}) {
  const surface = useSurfaceColors();
  return (
    <Text
      selectable
      style={[
        small ? s.small : s.body,
        { color: small ? surface.muted : surface.ink },
      ]}
    >
      {children}
    </Text>
  );
}
export function Card({
  children,
  tint = false,
}: {
  children: React.ReactNode;
  tint?: boolean;
}) {
  const theme = useContext(SurfaceContext);
  return (
    <CardSurface.Provider value={true}>
      <View
        style={[
          s.card,
          tint && s.accentCard,
          theme && {
            backgroundColor: theme.surface,
            borderColor: theme.line,
            borderRadius: 16,
          },
        ]}
      >
        {children}
      </View>
    </CardSurface.Provider>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const surface = useSurfaceColors();
  const theme = useContext(SurfaceContext);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        theme && { backgroundColor: theme.accent },
        secondary && [s.secondary, { borderColor: surface.line }],
        { opacity: disabled ? 0.45 : pressed ? 0.75 : 1 },
      ]}
    >
      <Text
        style={[
          s.buttonText,
          theme && { color: theme.accentInk },
          secondary && { color: surface.ink },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Chip({
  title,
  selected = false,
  onPress,
}: {
  title: string;
  selected?: boolean;
  onPress: () => void;
}) {
  const surface = useSurfaceColors();
  const theme = useContext(SurfaceContext);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        s.chip,
        { borderColor: surface.line },
        selected && {
          backgroundColor: theme?.accent ?? colors.green,
          borderColor: theme?.accent ?? colors.green,
        },
      ]}
    >
      <Text
        style={[
          s.chipText,
          {
            color: selected
              ? (theme?.accentInk ?? colors.paper)
              : surface.ink,
          },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Row({ children }: { children: React.ReactNode }) {
  return <View style={s.row}>{children}</View>;
}
export function Field({
  label,
  hideLabel = false,
  ...props
}: TextInputProps & { label: string; hideLabel?: boolean }) {
  const surface = useSurfaceColors();
  const theme = useContext(SurfaceContext);
  return <FormField label={label} hideLabel={hideLabel} {...props} palette={{ ink: surface.ink, muted: theme?.muted ?? colors.cardMuted, field: theme?.field ?? colors.white, line: theme?.line ?? colors.cardLine, focus: theme?.accent ?? colors.gold }} />;
}
export function External({ title, url }: { title: string; url: string }) {
  return (
    <Button
      secondary
      title={title + " ↗"}
      onPress={() => {
        if (/^https:\/\//.test(url) || url.startsWith("mailto:"))
          void Linking.openURL(url);
      }}
    />
  );
}
export function Notice({ text }: { text: string }) {
  const theme = useContext(SurfaceContext);
  return text ? (
    <CardSurface.Provider value={true}>
      <View
        accessibilityLiveRegion="polite"
        style={[
          s.notice,
          theme && {
            backgroundColor: theme.field,
            borderColor: theme.line,
            borderWidth: 1,
          },
        ]}
      >
        <Body small>{text}</Body>
      </View>
    </CardSurface.Provider>
  ) : null;
}
export function Busy() {
  return <ActivityIndicator style={{ padding: 25 }} color={colors.green} />;
}
export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  page: {
    padding: 22,
    gap: 16,
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  brandText: {
    letterSpacing: 2.1,
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink,
  },
  heading: {
    fontFamily: Platform.OS === "android" ? "serif" : "Georgia",
    fontSize: 35,
    lineHeight: 41,
    color: colors.ink,
    letterSpacing: -0.8,
  },
  subheading: {
    fontFamily: Platform.OS === "android" ? "serif" : "Georgia",
    fontSize: 24,
    lineHeight: 30,
    color: colors.ink,
  },
  body: { fontSize: 16, lineHeight: 25, color: colors.ink },
  small: { fontSize: 13, lineHeight: 20, color: colors.muted },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: 22,
    padding: 21,
    gap: 14,
  },
  accentCard: { borderTopWidth: 3 },
  button: {
    minHeight: 49,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.green,
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.line,
  },
  buttonText: {
    color: colors.paper,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 30,
    minHeight: 43,
    paddingHorizontal: 15,
    paddingVertical: 11,
    justifyContent: "center",
  },
  chipText: { fontSize: 13, color: colors.ink },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  field: {
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: 14,
    padding: 15,
    fontSize: 16,
    color: colors.cardInk,
    backgroundColor: colors.white,
    minHeight: 50,
  },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.ink },
  notice: { padding: 14, borderRadius: 14, backgroundColor: colors.pale },
});
