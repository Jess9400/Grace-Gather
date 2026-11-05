import { useEffect, useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { backend } from "../lib/backend";
import { avatarVariant } from "../lib/avatar";

const portraits = [
  { background: "#E7DDC9", skin: "#C88D65", hair: "#49342C", shirt: "#67715A" },
  { background: "#E2D4CD", skin: "#8D593F", hair: "#302C28", shirt: "#AC795C" },
  { background: "#DDE1D2", skin: "#EBC3A2", hair: "#775039", shirt: "#6E8589" },
  { background: "#E7DFC9", skin: "#B87A51", hair: "#3C302C", shirt: "#8E7280" },
];

/** Small original illustrations built from native shapes; no remote image requests. */
export function AvatarPortrait({
  variant,
  size = 36,
}: {
  variant: number;
  size?: number;
}) {
  const p = portraits[variant % portraits.length];
  const shape = (
    left: number,
    top: number,
    width: number,
    height: number,
    color: string,
    radius = 50,
  ) => ({
    position: "absolute" as const,
    left: (left * size) / 100,
    top: (top * size) / 100,
    width: (width * size) / 100,
    height: (height * size) / 100,
    backgroundColor: color,
    borderRadius: (radius * size) / 100,
  });
  return (
    <View
      accessible={false}
      pointerEvents="none"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: p.background,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#302C281A",
      }}
    >
      <View
        style={shape(
          22,
          13,
          56,
          variant === 1 || variant === 3 ? 71 : 48,
          p.hair,
        )}
      />
      <View style={shape(13, 73, 74, 53, p.shirt)} />
      <View style={shape(42, 61, 16, 21, p.skin)} />
      <View style={shape(28, 24, 44, 46, p.skin)} />
      <View style={shape(23, 39, 9, 14, p.skin)} />
      <View style={shape(68, 39, 9, 14, p.skin)} />
      {variant === 0 ? (
        <View
          style={{
            ...shape(25, 15, 47, 17, p.hair),
            transform: [{ rotate: "-14deg" }],
          }}
        />
      ) : variant === 1 ? (
        <>
          <View style={shape(20, 13, 34, 24, p.hair)} />
          <View style={shape(47, 13, 31, 19, p.hair)} />
        </>
      ) : variant === 2 ? (
        <View
          style={{
            ...shape(34, 16, 40, 15, p.hair),
            transform: [{ rotate: "18deg" }],
          }}
        />
      ) : (
        <>
          <View style={shape(24, 15, 32, 23, p.hair)} />
          <View style={shape(60, 23, 13, 35, p.hair)} />
        </>
      )}
      <View style={shape(37, 43, 4, 5, "#302C28")} />
      <View style={shape(58, 43, 4, 5, "#302C28")} />
      <View
        style={{
          ...shape(43, 53, 14, 8, "transparent"),
          borderBottomWidth: Math.max(1, size / 45),
          borderBottomColor: "#744B39",
          borderRadius: size / 10,
        }}
      />
    </View>
  );
}

export default function MemberAvatar() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let active = true,
      authChanged = false;
    const subscription = backend?.auth.onAuthStateChange((_event, session) => {
      authChanged = true;
      if (active) setUserId(session?.user.id ?? null);
    });
    void backend?.auth
      .getSession()
      .then(({ data }) => {
        if (active && !authChanged) setUserId(data.session?.user.id ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
      subscription?.data.subscription.unsubscribe();
    };
  }, []);
  return userId ? (
    <AvatarPortrait variant={avatarVariant(userId)} />
  ) : (
    <Ionicons name="person-circle-outline" size={26} color="#302C28" />
  );
}
