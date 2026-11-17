import { StyleSheet, View } from "react-native";

// The walk is illustrated, but its doorway should feel like the same entrance
// as the opening scene: an arched oak door with iron straps and brass pulls.
// It shares the church artwork's 300 x 400 coordinate system on both platforms.
export default function IntroDoor({ anchorOffset = 0 }: { anchorOffset?: number }) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.arch, { left: anchorOffset - 35, top: anchorOffset - 103 }]}
    >
      <View style={styles.wood}>
        {[7, 14, 21, 30, 39, 46, 53].map((left) => (
          <View key={left} style={[styles.plank, { left }]} />
        ))}
        <View style={styles.seam} />
        {[27, 55, 80].map((top) => (
          <View key={top} style={[styles.strapRow, { top }]}>
            <View style={styles.strap} />
            <View style={styles.strap} />
          </View>
        ))}
        {[21, 36].map((left) => (
          <View key={left} style={[styles.pull, { left }]}>
            <View style={styles.pullPlate} />
            <View style={styles.pullRing} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  arch: {
    position: "absolute",
    width: 70,
    height: 95,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "#8E7050",
    backgroundColor: "#403124",
    overflow: "hidden",
  },
  wood: {
    position: "absolute",
    left: 4,
    right: 4,
    top: 4,
    bottom: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: "#693523",
    overflow: "hidden",
  },
  plank: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "#3A1B14",
    opacity: 0.6,
  },
  seam: {
    position: "absolute",
    left: "50%",
    top: 0,
    bottom: 0,
    width: 1.4,
    backgroundColor: "#27150F",
  },
  strapRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  strap: { width: 25, height: 2.3, backgroundColor: "#201B18" },
  pull: { position: "absolute", top: 47, width: 5, height: 9, alignItems: "center" },
  pullPlate: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#C8A15B" },
  pullRing: {
    width: 5,
    height: 5,
    borderRadius: 3,
    borderWidth: 0.9,
    borderColor: "#D3AC64",
    marginTop: -1,
  },
});
