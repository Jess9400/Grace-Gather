import { useEffect, type ReactNode } from "react";
import { BackHandler, StyleSheet, View } from "react-native";

// The church entrance covers Home as an ordinary full-screen layer rather than
// a native modal. On iPhone a modal opened while the screen was still changing
// (just after sign-in or onboarding) could stay stuck on its first frame: a
// dark screen with no doors and no words. Home hides its tab bar meanwhile.
export default function EntranceLayer({
  children,
  color,
  onBack,
}: {
  children: ReactNode;
  color: string;
  onBack: () => void;
}) {
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.layer,
        { backgroundColor: color },
      ]}
      accessibilityViewIsModal
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { zIndex: 1000, elevation: 1000 },
});
