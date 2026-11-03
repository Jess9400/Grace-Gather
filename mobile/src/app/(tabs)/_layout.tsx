import { Text } from "react-native";
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
        tabBarInactiveTintColor: colors.inactive,
        tabBarStyle: {
          backgroundColor: colors.paper,
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
          ["learn", "learn", "book-outline"],
          ["confession", "confession", "heart-outline"],
          ["gatherings", "gather", "calendar-outline"],
        ] as const
      ).map(([name, label, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: copy(profile.language, label),
            tabBarLabel: ({ color }) => (
              <Text
                style={{
                  fontSize: 10,
                  lineHeight: 12,
                  textAlign: "center",
                  color: typeof color === "string" ? color : colors.muted,
                }}
              >
                {copy(profile.language, label)}
              </Text>
            ),
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
