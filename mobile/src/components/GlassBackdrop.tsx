import { Image, StyleSheet, View } from "react-native";
import { useChurchSnapshot } from "../lib/church-room";

// A quiet light behind glass surfaces: the person's own church from Home,
// heavily blurred under an ivory veil, so the page still belongs with Home and
// the church rooms. Without a picture yet, warm glows stand in for it.
export default function GlassBackdrop() {
  const snapshot = useChurchSnapshot();
  return (
    <View style={StyleSheet.absoluteFill}>
      {snapshot ? (
        <Image
          source={{ uri: snapshot.uri }}
          accessible={false}
          blurRadius={28}
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, { opacity: 0.55 }]}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, s.glow]} />
      )}
      <View style={[StyleSheet.absoluteFill, s.veil]} />
    </View>
  );
}
const s = StyleSheet.create({
  glow: {
    backgroundImage:
      "radial-gradient(circle at 12% 8%, rgba(178,138,62,0.22) 0%, rgba(178,138,62,0) 45%), radial-gradient(circle at 92% 70%, rgba(214,160,120,0.20) 0%, rgba(214,160,120,0) 50%)",
  },
  // Light enough to read through: ivory over the picture, a little thicker
  // where the reply sits lower on the page.
  veil: {
    backgroundImage:
      "linear-gradient(180deg, rgba(255,252,243,0.62) 0%, rgba(255,252,243,0.8) 55%, rgba(255,252,243,0.9) 100%)",
  },
});
