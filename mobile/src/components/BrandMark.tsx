import { Image, View } from "react-native";

// The Grace & Gather emblem: a small chapel at night with a lit door, inside
// a ring. Drawn in assets/brand/emblem.svg.
//
// It always sits on its own dark espresso disc, like a seal, so the gold and
// cream stay readable over a bright church picture as well as in the dark
// rooms. Small sizes use a bolder rendering of the same drawing, because its
// fine lines vanish when it is only a few millimetres wide.
//
// It sits beside the written name, so it is hidden from screen readers.
const ESPRESSO = "#1B1612";
const FINE = require("../../assets/brand/emblem.png");
const BOLD = require("../../assets/brand/emblem-small.png");

export default function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: ESPRESSO,
        boxShadow: "0px 2px 10px rgba(0,0,0,0.45)",
      }}
    >
      <Image
        source={size < 64 ? BOLD : FINE}
        accessible={false}
        style={{ width: size, height: size }}
      />
    </View>
  );
}
