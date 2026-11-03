import React from "react";
import {
  ScrollView,
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
export const colors = {
  paper: "#F6F3EC",
  ink: "#27372E",
  muted: "#6C756C",
  green: "#526C54",
  pale: "#E9EDE3",
  line: "#DBDFD4",
  rose: "#F2E5DE",
  white: "#FFFEFA",
};
export function Screen({
  children,
  back = false,
}: {
  children: React.ReactNode;
  back?: boolean;
}) {
  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.page}
      >
        {back && (
          <Button
            secondary
            title="‹"
            accessibilityLabel="Back"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/(tabs)")
            }
          />
        )}
        <View style={s.brand}>
          <Ionicons name="leaf-outline" size={23} color={colors.green} />
          <Text style={s.brandText}>AWAY CHURCH</Text>
          <Pressable
            accessibilityLabel="Account and settings"
            accessibilityRole="button"
            onPress={() => router.push("/account")}
            style={{ marginLeft: "auto", padding: 8 }}
          >
            <Ionicons
              name="person-circle-outline"
              size={26}
              color={colors.ink}
            />
          </Pressable>
        </View>
        {children}
        <View style={{ height: 26 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
export function Heading({ children }: { children: React.ReactNode }) {
  return (
    <Text accessibilityRole="header" style={s.heading}>
      {children}
    </Text>
  );
}
export function Subheading({ children }: { children: React.ReactNode }) {
  return (
    <Text accessibilityRole="header" style={s.subheading}>
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
  return (
    <Text selectable style={small ? s.small : s.body}>
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
    <View style={[s.card, tint && { backgroundColor: colors.pale }]}>
      {children}
    </View>
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        { opacity: disabled ? 0.45 : pressed ? 0.75 : 1 },
      ]}
    >
      <Text style={[s.buttonText, secondary && { color: colors.ink }]}>
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        s.chip,
        selected && {
          backgroundColor: colors.green,
          borderColor: colors.green,
        },
      ]}
    >
      <Text style={[s.chipText, selected && { color: "white" }]}>{title}</Text>
    </Pressable>
  );
}
export function Row({ children }: { children: React.ReactNode }) {
  return <View style={s.row}>{children}</View>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 8, marginVertical: 7 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
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
    <View accessibilityLiveRegion="polite" style={s.notice}>
      <Body small>{text}</Body>
    </View>
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
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 22,
    padding: 21,
    gap: 14,
  },
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
    color: "white",
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
    borderColor: colors.line,
    borderRadius: 14,
    padding: 15,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.white,
    minHeight: 50,
  },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.ink },
  notice: { padding: 14, borderRadius: 14, backgroundColor: colors.pale },
});
