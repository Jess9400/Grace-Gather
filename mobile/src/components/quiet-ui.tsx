import MemberAvatar from "./MemberAvatar";
import GlassBackdrop from "./GlassBackdrop";
import { glassCard, glassOn } from "../lib/glass-proto";
import ChurchStrip, { useRoomStrip } from "./ChurchStrip";
import type { RoomPlace } from "../lib/church-room";
import { useInterfaceCopy } from "../lib/use-interface-copy";
import React, { createContext, useContext, useRef } from "react";
import {
  ScrollView,
  type ScrollViewInstance,
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Platform,
  Linking,
  ActivityIndicator,
  KeyboardAvoidingView,
  TextInputProps,
} from "react-native";
import { BlurView } from "expo-blur";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
export const colors = {
  paper: "#FFFCF3",
  ink: "#302C28",
  muted: "#746A60",
  inactive: "#746A60",
  green: "#302C28",
  pale: "#F5EFE2",
  line: "#302C282D",
  white: "#FFFFFF",
  gold: "#B28A3E",
  goldInk: "#806122",
  cardInk: "#302C28",
  cardMuted: "#746A60",
  cardLine: "#B8AB96",
};
const CardSurface = createContext(false);
function useSurfaceColors() {
  const card = useContext(CardSurface);
  return {
    ink: card ? colors.cardInk : colors.ink,
    muted: card ? colors.cardMuted : colors.muted,
    line: card ? colors.cardLine : colors.line,
    // Small decorative outlines use the antique gold on the page.
    outline: card ? colors.cardLine : "#B28A3E8C",
  };
}
// `place` makes the screen one of the church's rooms: its part of the church
// runs across the top in place of the plain header.
export function Screen({
  children,
  back = false,
  place,
  footer,
  scrollToEndKey,
  keyboard = false,
}: {
  children: React.ReactNode;
  back?: boolean;
  place?: RoomPlace;
  footer?: React.ReactNode;
  scrollToEndKey?: string;
  // Keep a text field inside the page clear of the keyboard (no footer).
  keyboard?: boolean;
}) {
  const scroll = useRef<ScrollViewInstance>(null);
  const lastScrolled = useRef<string | undefined>(undefined);
  const tr = useInterfaceCopy();
  const strip = useRoomStrip(place ?? "bible") && !!place;
  if (strip && place)
    return (
      <SafeAreaView style={s.safe} edges={["left", "right"]}>
        <GlassBackdrop />
        <ScrollView keyboardShouldPersistTaps="handled">
          <ChurchStrip place={place} back={back} />
          <View style={[s.page, s.roomPage]}>
            {children}
            <View style={{ height: 26 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  const avoid = !!footer || keyboard;
  const content = (
    <SafeAreaView
      style={s.safe}
      edges={
        avoid ? ["top", "left", "right", "bottom"] : ["top", "left", "right"]
      }
    >
      <GlassBackdrop />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          avoid ? (Platform.OS === "ios" ? "padding" : "height") : undefined
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[s.page, !!footer && { paddingBottom: 8 }]}
          ref={scroll}
          onContentSizeChange={() => {
            if (scrollToEndKey && lastScrolled.current !== scrollToEndKey) {
              lastScrolled.current = scrollToEndKey;
              scroll.current?.scrollToEnd({ animated: false });
            }
          }}
        >
          <View style={s.brand}>
            {back ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tr("Back")}
                onPress={() =>
                  router.canGoBack() ? router.back() : router.replace("/(tabs)")
                }
                style={({ pressed }) => [
                  s.backControl,
                  pressed && s.backPressed,
                ]}
              >
                <Ionicons name="chevron-back" size={24} color={colors.ink} />
              </Pressable>
            ) : (
              <Ionicons name="leaf-outline" size={23} color={colors.gold} />
            )}
            <Text style={s.brandText}>GRACE & GATHER</Text>
            <Pressable
              accessibilityLabel={tr("Account and settings")}
              accessibilityRole="button"
              onPress={() => router.push("/account")}
              style={{ marginLeft: "auto", padding: 8 }}
            >
              <MemberAvatar />
            </Pressable>
          </View>
          {children}
          {!footer && <View style={{ height: 26 }} />}
        </ScrollView>
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
  return content;
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
  return (
    <CardSurface.Provider value={true}>
      <View style={[s.card, tint && s.accentCard, glassCard]}>{children}</View>
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && [s.secondary, { borderColor: surface.outline }],
        { opacity: disabled ? 0.45 : pressed ? 0.75 : 1 },
      ]}
    >
      <Text style={[s.buttonText, secondary && { color: surface.ink }]}>
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        s.chip,
        { borderColor: surface.line },
        selected && {
          backgroundColor: colors.green,
          borderColor: colors.green,
        },
      ]}
    >
      <Text
        style={[s.chipText, { color: selected ? colors.white : surface.ink }]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Row({ children }: { children: React.ReactNode }) {
  return <View style={s.row}>{children}</View>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const surface = useSurfaceColors();
  return (
    <View style={{ gap: 8, marginVertical: 7 }}>
      <Text style={[s.fieldLabel, { color: surface.ink }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.cardMuted}
        {...props}
        style={[
          s.field,
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
  return text ? (
    <CardSurface.Provider value={true}>
      <View accessibilityLiveRegion="polite" style={s.notice}>
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
  roomPage: { marginTop: -18, paddingTop: 0 },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  backControl: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  backPressed: { backgroundColor: "#302C280A", opacity: 0.7 },
  brandText: {
    flexShrink: 1,
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
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 22,
    padding: 21,
    gap: 14,
  },
  accentCard: { borderColor: colors.gold },
  button: {
    minHeight: 49,
    borderRadius: 25,
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
    color: colors.white,
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

export const serif = Platform.OS === "android" ? "serif" : "Georgia";
export function Brand() {
  const tr = useInterfaceCopy();
  return (
    <View style={s.brand}>
      <Ionicons name="leaf-outline" size={24} color={colors.gold} />
      <Text style={s.brandText}>GRACE & GATHER</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr("Account and settings")}
        onPress={() => router.push("/account")}
        style={{ marginLeft: "auto", padding: 8 }}
      >
        <MemberAvatar />
      </Pressable>
    </View>
  );
}
export function Glass({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: import("react-native").StyleProp<import("react-native").ViewStyle>;
}) {
  const surface = {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 23,
    overflow: "hidden" as const,
    backgroundColor: "#FFFFFFB8",
  };
  if (Platform.OS === "android")
    return <View style={[surface, style]}>{children}</View>;
  return (
    <BlurView tint="light" intensity={35} style={[surface, style]}>
      {children}
    </BlurView>
  );
}
