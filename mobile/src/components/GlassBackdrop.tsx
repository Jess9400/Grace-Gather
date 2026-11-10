import { StyleSheet, View } from "react-native";
import { backdropLayers, candle, lookOn } from "../lib/look-proto";

// PROTOTYPE ONLY: the room's background for the look being tried.
export default function GlassBackdrop() {
  if (!lookOn) return null;
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: candle ? "#1B1612" : "#FFFCF3" },
      ]}
    >
      {backdropLayers.map((layer, i) => (
        <View
          key={i}
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundImage: layer,
              opacity: layer.startsWith("url(") ? (candle ? 0.5 : 0.28) : 1,
            } as object,
          ]}
        />
      ))}
    </View>
  );
}
