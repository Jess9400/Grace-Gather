import type { ImageSourcePropType } from "react-native";
import type { Language } from "./content";
export type AtlasRegion = "levant" | "east" | "mediterranean";
export const atlasSize: Record<AtlasRegion, [number, number]> = {
  levant: [1050, 1200],
  east: [1500, 1100],
  mediterranean: [1500, 1100],
};
export const atlasImages: Record<
  AtlasRegion,
  Record<Language, ImageSourcePropType>
> = {
  levant: {
    en: require("../../assets/study-maps/levant-en.png"),
    pt: require("../../assets/study-maps/levant-pt.png"),
    es: require("../../assets/study-maps/levant-es.png"),
    ru: require("../../assets/study-maps/levant-ru.png"),
  },
  east: {
    en: require("../../assets/study-maps/east-en.png"),
    pt: require("../../assets/study-maps/east-pt.png"),
    es: require("../../assets/study-maps/east-es.png"),
    ru: require("../../assets/study-maps/east-ru.png"),
  },
  mediterranean: {
    en: require("../../assets/study-maps/mediterranean-en.png"),
    pt: require("../../assets/study-maps/mediterranean-pt.png"),
    es: require("../../assets/study-maps/mediterranean-es.png"),
    ru: require("../../assets/study-maps/mediterranean-ru.png"),
  },
};
