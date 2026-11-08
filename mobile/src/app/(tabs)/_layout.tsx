import { StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useApp } from "../../lib/state";
import { copy } from "../../lib/content";
import { q } from "../../lib/quiet-copy";
import { colors } from "../../components/quiet-ui";
import { churchCopy } from "../../lib/church-copy";
import { isProtestant } from "../../lib/church-calendar";
// On Home the church fills the screen, so the tab bar floats over it as
// dark glass with light labels. Every other tab keeps the ivory bar.
const churchTabs = {
  tabBarActiveTintColor: "#FFF8EC",
  tabBarInactiveTintColor: "rgba(255,248,236,0.62)",
  tabBarStyle: {
    position: "absolute" as const,
    backgroundColor: "rgba(30,22,16,0.42)",
    borderTopWidth: 0,
    elevation: 0,
  },
  tabBarBackground: () => (
    <BlurView tint="dark" intensity={30} style={StyleSheet.absoluteFill} />
  ),
};

export default function TabsLayout() {
  const { profile } = useApp();
  const palette = colors;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.green,
        tabBarInactiveTintColor: palette.inactive,
        tabBarStyle: {
          backgroundColor: palette.paper,
          borderTopColor: palette.line,
        },
        tabBarLabelStyle: { fontSize: 11 },
        sceneStyle: { backgroundColor: palette.paper },
      }}
    >
      {(
        [
          ["index", churchCopy(profile.language, "home"), "home-outline"],
          ["bible", q(profile.language, "bible"), "book-outline"],
          [
            "confession",
            isProtestant(profile)
              ? churchCopy(profile.language, "unburden")
              : copy(profile.language, "confession"),
            "heart-outline",
          ],
          ["explore", copy(profile.language, "explore"), "compass-outline"],
          [
            "gatherings",
            churchCopy(profile.language, "gather"),
            "people-outline",
          ],
        ] as const
      ).map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            ...(name === "index" && churchTabs),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={icon} color={color as string} size={size} />
            ),
          }}
        />
      ))}
      {/* The journal opens from Home and from Your space; learning and More
          stay reachable from their own links. */}
      {["diary", "learn", "more"].map((name) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            tabBarButton: () => null,
            tabBarItemStyle: { display: "none" },
          }}
        />
      ))}
    </Tabs>
  );
}
