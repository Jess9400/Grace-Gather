import React, { createContext, useContext } from "react";
import {
  ScrollView,
  KeyboardAvoidingView,
  View,
  Text,
  Pressable,
  TextInput,
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
export const colors = {
  paper: "#0D3028",
  ink: "#FFFDF9",
  muted: "#B7C68F",
  inactive: "#FFFDF9B3",
  green: "#B7C68F",
  pale: "#FFFDF9",
  line: "#B7C68F66",
  white: "#FFFDF9",
  gold: "#D7BD84",
  cardInk: "#0D3028",
  cardMuted: "#52634E",
  cardLine: "#63704D",
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
                <Ionicons
                  name="person-circle-outline"
                  size={26}
                  color={colors.ink}
                />
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
              ? (theme?.accentInk ?? colors.cardInk)
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
  return (
    <View style={{ gap: 8, marginVertical: 7 }}>
      {!hideLabel && (
        <Text style={[s.fieldLabel, { color: surface.ink }]}>{label}</Text>
      )}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme?.muted ?? colors.cardMuted}
        {...props}
        style={[
          s.field,
          theme && {
            backgroundColor: theme.field,
            color: theme.ink,
            borderColor: theme.line,
          },
          props.multiline && { minHeight: 130, textAlignVertical: "top" },
          props.style,
        ]}
      />
    </View>
  );
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
    color: colors.cardInk,
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
