import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../lib/state";
import { copy } from "../../lib/content";
import { colors } from "../../components/ui";
export default function TabsLayout() {
  const { profile } = useApp();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.line,
        },
        tabBarLabelStyle: { fontSize: 11 },
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      {(
        [
          ["index", "journal", "book-outline"],
          ["explore", "explore", "compass-outline"],
          ["learn", "learn", "school-outline"],
          ["gatherings", "gather", "calendar-outline"],
        ] as const
      ).map(([name, label, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: copy(profile.language, label),
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name={icon}
                color={typeof color === "string" ? color : colors.muted}
                size={size}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
