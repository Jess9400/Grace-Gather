import MemberAvatar from "./MemberAvatar";
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
  StyleSheet,
  Platform,
  Linking,
  ActivityIndicator,
  KeyboardAvoidingView,
  TextInputProps,
} from "react-native";
import { useKeyboardReveal } from "../lib/keyboard-reveal";
import { BlurView } from "expo-blur";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FormField } from "./FormField";
import BrandMark from "./BrandMark";
// Candlelight: dark espresso rooms, ivory words and antique gold details.
// `green` fills primary buttons and selected items (cream, with `white` text);
// `white` is the card surface. `night` is the darker tab bar under the rooms.
export const colors = {
  paper: "#1B1612",
  ink: "#F4EBDA",
  muted: "#B7A993",
  inactive: "#B7A993",
  green: "#F1E4CB",
  pale: "#2F271F",
  line: "#F4EBDA2D",
  white: "#2A221B",
  gold: "#C9A45C",
  goldInk: "#D9B974",
  cardInk: "#F4EBDA",
  cardMuted: "#B7A993",
  cardLine: "#F4EBDA33",
  night: "#120E0B",
};
// A journal letter is always a cream page with dark ink, so it reads as the
// person's own writing in the candlelit room.
export const letter = {
  paper: "#F8F0DE",
  ink: "#302C28",
  muted: "#665D54",
  gold: "#806122",
  line: "#302C282D",
};
// On/off switches: a gold track when on, a soft espresso track when off.
export const switchColors = {
  trackColor: { false: "#4A3F35", true: "#C9A45C" },
  thumbColor: "#F4EBDA",
  ios_backgroundColor: "#4A3F35",
  // The web build colours the knob of a switch that is on separately.
  activeThumbColor: "#F4EBDA",
};
// The candle's glow over every room: a warm light from above on deep espresso.
const glow =
  "radial-gradient(70% 38% at 50% 0%, rgba(224,160,82,0.26) 0%, rgba(224,160,82,0) 100%), radial-gradient(60% 30% at 85% 100%, rgba(201,164,92,0.10) 0%, rgba(201,164,92,0) 100%), linear-gradient(180deg, #211A14 0%, #17120E 100%)";
export function Backdrop() {
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: colors.paper },
        (Platform.OS === "web"
          ? { backgroundImage: glow }
          : { experimental_backgroundImage: glow }) as object,
      ]}
    />
  );
}
// What a control sits on: the dark page, a card, or a cream journal letter.
type Surface = "page" | "card" | "letter";
const CardSurface = createContext<Surface>("page");
function useSurfaceColors() {
  const surface = useContext(CardSurface);
  if (surface === "letter")
    return {
      ink: letter.ink,
      muted: letter.muted,
      line: letter.line,
      outline: letter.gold + "8C",
    };
  const card = surface === "card";
  return {
    ink: card ? colors.cardInk : colors.ink,
    muted: card ? colors.cardMuted : colors.muted,
    line: card ? colors.cardLine : colors.line,
    // Small decorative outlines use the antique gold on the page.
    outline: card ? colors.cardLine : "#C9A45C8C",
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
  compact = false,
  header = true,
  centered = false,
}: {
  children: React.ReactNode;
  back?: boolean;
  place?: RoomPlace;
  footer?: React.ReactNode;
  scrollToEndKey?: string;
  // Keep a text field inside the page clear of the keyboard (no footer).
  keyboard?: boolean;
  // A room hides its church picture (e.g. while someone is writing), giving
  // the page the whole screen above the keyboard.
  compact?: boolean;
  header?: boolean;
  centered?: boolean;
}) {
  const scroll = useRef<ScrollViewInstance>(null);
  const onScroll = useKeyboardReveal(scroll);
  const lastScrolled = useRef<string | undefined>(undefined);
  const tr = useInterfaceCopy();
  const insets = useSafeAreaInsets();
  const strip = useRoomStrip(place ?? "bible") && !!place;
  if (strip && place)
    return (
      <SafeAreaView style={s.safe} edges={["left", "right"]}>
        <Backdrop />
        {/* A room's footer (its main button) stays in view, resting on the
            keyboard while someone types. */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={
            footer ? (Platform.OS === "ios" ? "padding" : "height") : undefined
          }
        >
          <ScrollView
            ref={scroll}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={!footer}
            // A downward swipe puts the keyboard away.
            keyboardDismissMode={footer ? "interactive" : "none"}
            onScroll={onScroll}
            scrollEventThrottle={32}
          >
            {!compact && <ChurchStrip place={place} back={back} />}
            <View
              style={[
                s.page,
                compact ? { paddingTop: insets.top + 12 } : s.roomPage,
              ]}
            >
              {children}
              <View style={{ height: footer ? 8 : 26 }} />
            </View>
          </ScrollView>
          {footer}
        </KeyboardAvoidingView>
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
      <Backdrop />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          avoid ? (Platform.OS === "ios" ? "padding" : "height") : undefined
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          // On iPhone, a focused field scrolls clear of the keyboard (the
          // number pad for a sign-in code, say). Pages with a footer or
          // `keyboard` already make room by resizing instead.
          automaticallyAdjustKeyboardInsets={!avoid}
          onScroll={onScroll}
          scrollEventThrottle={32}
          contentContainerStyle={[
            s.page,
            !!footer && { paddingBottom: 8 },
            centered && { flexGrow: 1, justifyContent: "center" },
          ]}
          ref={scroll}
          onContentSizeChange={() => {
            if (scrollToEndKey && lastScrolled.current !== scrollToEndKey) {
              lastScrolled.current = scrollToEndKey;
              scroll.current?.scrollToEnd({ animated: false });
            }
          }}
        >
          {header && (
            <View style={s.brand}>
              {back ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={tr("Back")}
                  onPress={() =>
                    router.canGoBack()
                      ? router.back()
                      : router.replace("/(tabs)")
                  }
                  style={({ pressed }) => [
                    s.backControl,
                    pressed && s.backPressed,
                  ]}
                >
                  <Ionicons name="chevron-back" size={24} color={colors.ink} />
                </Pressable>
              ) : (
                <BrandMark />
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
          )}
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
// Shared controls placed on a journal letter (the cream page) take its ink.
export function LetterSurface({ children }: { children: React.ReactNode }) {
  return <CardSurface.Provider value="letter">{children}</CardSurface.Provider>;
}
export function Card({
  children,
  tint = false,
}: {
  children: React.ReactNode;
  tint?: boolean;
}) {
  return (
    <CardSurface.Provider value="card">
      <View style={[s.card, tint && s.accentCard]}>{children}</View>
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
  const isLetter = useContext(CardSurface) === "letter";
  return <FormField label={label} {...props} palette={{ ink: surface.ink, muted: surface.muted, field: isLetter ? letter.paper : colors.white, line: surface.line, focus: isLetter ? letter.gold : colors.gold }} />;
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
    <CardSurface.Provider value="card">
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
  backPressed: { backgroundColor: "#F4EBDA14", opacity: 0.7 },
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
      <BrandMark />
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
    backgroundColor: "#2A221BB8",
  };
  if (Platform.OS === "android")
    return <View style={[surface, style]}>{children}</View>;
  return (
    <BlurView tint="dark" intensity={35} style={[surface, style]}>
      {children}
    </BlurView>
  );
}
