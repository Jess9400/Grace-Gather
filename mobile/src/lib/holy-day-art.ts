import type { ImageSourcePropType } from "react-native";
import type { HolyDayArt } from "./holy-days";

// The illustrations themselves: each feast drawn to hold its date (the number
// sits inside the wreath, on the egg). They are drawn as SVG in
// assets/holy-days/svg and shipped as PNG, so the app needs no SVG library.
export const holyDayImages: Record<HolyDayArt, ImageSourcePropType> = {
  wreath: require("../../assets/holy-days/wreath.png"),
  eggs: require("../../assets/holy-days/eggs.png"),
  redegg: require("../../assets/holy-days/redegg.png"),
  crosses: require("../../assets/holy-days/crosses.png"),
  palm: require("../../assets/holy-days/palm.png"),
  candle: require("../../assets/holy-days/candle.png"),
  star: require("../../assets/holy-days/star.png"),
  nativity: require("../../assets/holy-days/nativity.png"),
  ash: require("../../assets/holy-days/ash.png"),
  cloud: require("../../assets/holy-days/cloud.png"),
  dovefire: require("../../assets/holy-days/dovefire.png"),
  dovewater: require("../../assets/holy-days/dovewater.png"),
  flowers: require("../../assets/holy-days/flowers.png"),
  halo: require("../../assets/holy-days/halo.png"),
  rose: require("../../assets/holy-days/rose.png"),
  book: require("../../assets/holy-days/book.png"),
};

// Each drawing is 120 wide and 140 tall with a calm middle where the calendar
// prints the date; `centre` is how far down that middle sits.
export const holyDayDateShape = { ratio: 140 / 120, centre: 82 / 140 };
// The few whose middle is dark enough to need a white number.
export const holyDayDateLight: Partial<Record<HolyDayArt, boolean>> = {
  redegg: true,
};
