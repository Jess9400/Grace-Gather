import { useState } from "react";
import { Platform, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

type Palette = { ink: string; muted: string; field: string; line: string; focus: string };

/** Shared form treatment; callers supply the colors of the current surface. */
export function FormField({ label, hideLabel = false, palette, onFocus, onBlur, style, ...props }: TextInputProps & {
  label: string;
  hideLabel?: boolean;
  palette: Palette;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.group}>
      {!hideLabel && <Text style={[styles.label, { color: palette.ink }]}>{label}</Text>}
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        placeholderTextColor={props.placeholderTextColor ?? palette.muted}
        selectionColor={props.selectionColor ?? palette.focus}
        onFocus={(event) => { setFocused(true); onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); onBlur?.(event); }}
        style={[
          styles.field,
          { color: palette.ink, backgroundColor: palette.field, borderColor: palette.line },
          Platform.OS === "web" && ({ outlineStyle: "none" } as object),
          props.multiline && styles.multiline,
          style,
          focused && { borderColor: palette.focus },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8, marginVertical: 7 },
  label: { fontSize: 13, fontWeight: "600" },
  field: { borderWidth: 1, borderRadius: 14, minHeight: 52, paddingHorizontal: 15, paddingVertical: 14, fontSize: 16 },
  multiline: { minHeight: 130, textAlignVertical: "top" },
});
