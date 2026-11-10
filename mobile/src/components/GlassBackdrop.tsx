import { Image, StyleSheet, View } from "react-native";
import { useChurchSnapshot } from "../lib/church-room";
import { glassImageOpacity, glassOn, glassVeil } from "../lib/glass-proto";

// PROTOTYPE ONLY: the person's own church from Home, heavily blurred under an
// ivory veil, behind every page.
export default function GlassBackdrop() {
  const snapshot = useChurchSnapshot();
  if (!glassOn) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.clip]}>
      {snapshot ? (
        <Image
          source={{ uri: snapshot.uri }}
          accessible={false}
          resizeMode="cover"
          style={[
            s.picture,
            { opacity: glassImageOpacity, filter: "blur(26px)" } as object,
          ]}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, s.glow]} />
      )}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundImage: glassVeil } as object,
        ]}
      />
    </View>
  );
}
const s = StyleSheet.create({
  clip: { overflow: "hidden", backgroundColor: "#FFFCF3" },
  // Oversized so the blur has no clear edges.
  picture: {
    position: "absolute",
    left: -40,
    right: -40,
    top: -40,
    bottom: -40,
  },
  glow: {
    backgroundImage:
      "radial-gradient(circle at 12% 8%, rgba(178,138,62,0.28) 0%, rgba(178,138,62,0) 45%), radial-gradient(circle at 92% 70%, rgba(214,160,120,0.26) 0%, rgba(214,160,120,0) 50%)",
  },
});
