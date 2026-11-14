import { Image } from "react-native";

// The Grace & Gather emblem: a small chapel at night with a lit door, inside
// a ring. Drawn in assets/brand/emblem.svg; this shows its gold-and-cream
// rendering, which is made for the dark rooms. It sits beside the written
// name, so it is hidden from screen readers.
export default function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <Image
      source={require("../../assets/brand/emblem.png")}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{ width: size, height: size }}
    />
  );
}
