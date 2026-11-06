import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../lib/state";
import { copy } from "../../lib/content";
import { q } from "../../lib/quiet-copy";
import { colors } from "../../components/quiet-ui";
import { churchCopy } from "../../lib/church-copy";
import { isProtestant } from "../../lib/church-calendar";
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
          ["explore", copy(profile.language, "explore"), "compass-outline"],
          ["bible", q(profile.language, "bible"), "book-outline"],
          [
            "confession",
            isProtestant(profile)
              ? churchCopy(profile.language, "unburden")
              : copy(profile.language, "confession"),
            "heart-outline",
          ],
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
