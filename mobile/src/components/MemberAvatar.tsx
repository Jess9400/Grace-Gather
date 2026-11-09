import { useEffect, useState } from "react";
import { usePrayerUnread } from "../lib/prayers";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { backend } from "../lib/backend";
import { avatarVariant } from "../lib/avatar";

/** Four friendly celestial mascots, drawn locally without personal likenesses. */
export function CelestialAvatar({
  variant,
  size = 36,
}: {
  variant: number;
  size?: number;
}) {
  const kind = variant % 4;
  const background = ["#DFE9E4", "#DDDDF0", "#F4E5CD", "#EEDDE4"][kind];
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
  const eyes = kind === 1 ? [31, 47] : [40, 58];
  const eyeY = kind === 1 ? 57 : 49;
  return (
    <View
      accessible={false}
      pointerEvents="none"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: background,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#302C2812",
      }}
    >
      {kind === 0 && (
        <>
          <View
            style={{
              ...shape(10, 39, 27, 27, "#F9FCF9"),
              transform: [{ rotate: "30deg" }],
            }}
          />
          <View
            style={{
              ...shape(64, 39, 27, 27, "#F9FCF9"),
              transform: [{ rotate: "-30deg" }],
            }}
          />
          <View style={shape(27, 33, 46, 43, "#FFFCF3")} />
          <View
            style={{
              ...shape(32, 18, 36, 12, "transparent"),
              borderWidth: size * 0.035,
              borderColor: "#C9A155",
            }}
          />
        </>
      )}
      {kind === 1 && (
        <>
          <View style={shape(23, 19, 56, 65, "#F6D78B")} />
          <View style={shape(43, 12, 47, 49, background)} />
          <Ionicons
            name="sparkles"
            size={size * 0.18}
            color="#FFF9E4"
            style={{
              position: "absolute",
              left: size * 0.66,
              top: size * 0.24,
            }}
          />
        </>
      )}
      {kind === 2 && (
        <>
          {Array.from({ length: 8 }, (_, i) => (
            <View
              key={i}
              style={{
                ...shape(47, 9, 6, 82, "transparent"),
                transform: [{ rotate: `${i * 45}deg` }],
              }}
            >
              <View
                style={{
                  width: "100%",
                  height: size * 0.12,
                  borderRadius: size * 0.04,
                  backgroundColor: "#D9AA50",
                }}
              />
            </View>
          ))}
          <View style={shape(25, 25, 50, 50, "#F4C768")} />
        </>
      )}
      {kind === 3 && (
        <Ionicons
          name="star"
          size={size * 0.78}
          color="#F4CD87"
          style={{ position: "absolute", left: size * 0.1, top: size * 0.1 }}
        />
      )}
      <View style={shape(eyes[0], eyeY, 4, 6, "#55443A")} />
      <View style={shape(eyes[1], eyeY, 4, 6, "#55443A")} />
      <View style={shape(eyes[0] - 7, eyeY + 8, 9, 5, "#E8A798")} />
      <View style={shape(eyes[1] + 3, eyeY + 8, 9, 5, "#E8A798")} />
      <View
        style={{
          ...shape(eyes[0] + 6, eyeY + 8, 10, 6, "transparent"),
          borderBottomWidth: Math.max(1, size * 0.018),
          borderBottomColor: "#876050",
        }}
      />
    </View>
  );
}

export default function MemberAvatar() {
  const unread = usePrayerUnread();
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
  // A welcoming guest mascot also prevents an empty-icon flash during auth restore.
  // Signed-in accounts retain their stable, device-independent assignment.
  return (
    <View>
      <CelestialAvatar variant={userId ? avatarVariant(userId) : 0} />
      {unread > 0 && (
        <View
          style={{
            position: "absolute",
            right: -5,
            top: -5,
            minWidth: 19,
            height: 19,
            borderRadius: 10,
            backgroundColor: "#302C28",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 3,
          }}
        >
          <Text style={{ color: "#FFFCF3", fontSize: 10, fontWeight: "700" }}>
            {unread > 99 ? "99+" : unread}
          </Text>
        </View>
      )}
    </View>
  );
}
