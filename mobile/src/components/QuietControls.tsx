import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, useSurfaceColors } from "./ui";

type Icon = React.ComponentProps<typeof Ionicons>["name"];

/** Compact actions keep a 44-point target without looking like primary buttons. */
export function TextAction({
  title,
  icon,
  onPress,
  disabled = false,
  selected = false,
  iconOnly = false,
}: {
  title: string;
  icon?: Icon;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
  iconOnly?: boolean;
}) {
  const surface = useSurfaceColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.textAction,
        { opacity: disabled ? 0.45 : pressed ? 0.65 : 1 },
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={20}
          color={surface.ink}
          accessible={false}
        />
      )}
      {!iconOnly && (
        <Text style={[styles.actionText, { color: surface.ink }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Disclosure({
  title,
  summary,
  children,
  open: controlled,
  onToggle,
  disabled = false,
}: {
  title: string;
  summary?: string;
  children: React.ReactNode;
  open?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const open = controlled ?? expanded;
  const surface = useSurfaceColors();
  return (
    <View
      style={{
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: surface.line,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        onPress={onToggle ?? (() => setExpanded(!open))}
        style={({ pressed }) => [
          styles.disclosure,
          { opacity: pressed ? 0.65 : 1 },
        ]}
      >
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[styles.actionText, { color: surface.ink }]}>
            {title}
          </Text>
          {!!summary && (
            <Text style={[styles.summary, { color: surface.muted }]}>
              {summary}
            </Text>
          )}
        </View>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={17}
          color={surface.muted}
          accessible={false}
        />
      </Pressable>
      {open && (
        <View style={{ gap: 12, paddingTop: 4, paddingBottom: 16 }}>
          {children}
        </View>
      )}
    </View>
  );
}

export function ActionCard({
  title,
  description,
  icon,
  onPress,
  primary = false,
  disabled = false,
}: {
  title: string;
  description: string;
  icon: Icon;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        {
          backgroundColor: primary ? colors.pale : colors.white,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={25}
        color={primary ? colors.cardInk : colors.gold}
        accessible={false}
      />
      <View style={{ flex: 1, gap: 5 }}>
        <Text
          style={[
            styles.cardTitle,
            { color: primary ? colors.cardInk : colors.ink },
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.summary,
            { color: primary ? colors.cardMuted : colors.inactive },
          ]}
        >
          {description}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={primary ? colors.cardMuted : colors.muted}
        accessible={false}
      />
    </Pressable>
  );
}

export function FilterStrip({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="button"
          accessibilityState={{ selected: option.value === value }}
          onPress={() => onChange(option.value)}
          style={[
            styles.filter,
            option.value === value && { backgroundColor: colors.green },
          ]}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "500",
              color: option.value === value ? colors.paper : colors.ink,
            }}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  textAction: {
    minHeight: 44,
    minWidth: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 5,
    alignSelf: "flex-start",
  },
  actionText: { fontSize: 14, fontWeight: "500", lineHeight: 21 },
  summary: { fontSize: 13, lineHeight: 20 },
  disclosure: {
    minHeight: 48,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionCard: {
    minHeight: 106,
    borderRadius: 18,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  cardTitle: { fontSize: 17, lineHeight: 24, fontWeight: "600" },
  filter: {
    minHeight: 44,
    paddingHorizontal: 15,
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "#FFFFFF0D",
  },
});
