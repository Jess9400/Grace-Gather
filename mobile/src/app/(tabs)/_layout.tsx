import { Tabs, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../lib/state";
import { q } from "../../lib/quiet-copy";
import { colors } from "../../components/quiet-ui";
import { colors as legacyColors } from "../../components/ui";
export default function TabsLayout() {
  const { profile } = useApp();
  const legacy = useSegments().some((s) => s === "confession"),
    palette = legacy ? legacyColors : colors;
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
          ["bible", "bible", "book-outline"],
          ["diary", "diary", "create-outline"],
          ["more", "more", "ellipsis-horizontal"],
        ] as const
      ).map(([name, label, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: q(profile.language, label),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={icon} color={color as string} size={size} />
            ),
          }}
        />
      ))}
      {["explore", "learn", "confession", "gatherings"].map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
