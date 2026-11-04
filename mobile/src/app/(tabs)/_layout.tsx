import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../lib/state";
import { copy } from "../../lib/content";
import { q } from "../../lib/quiet-copy";
import { colors } from "../../components/quiet-ui";
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
          ["index", "home", "home-outline"],
          ["explore", "explore", "compass-outline"],
          ["bible", "bible", "book-outline"],
          ["confession", "confession", "heart-outline"],
          ["gatherings", "gather", "calendar-outline"],
          ["more", "more", "ellipsis-horizontal"],
        ] as const
      ).map(([name, label, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title:
              label === "home" || label === "bible" || label === "more"
                ? q(profile.language, label)
                : copy(profile.language, label),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={icon} color={color as string} size={size} />
            ),
          }}
        />
      ))}
      {["diary", "learn"].map((name) => (
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
