import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../lib/state";
import { copy } from "../../lib/content";
import { q } from "../../lib/quiet-copy";
import { colors } from "../../components/quiet-ui";
import { churchCopy } from "../../lib/church-copy";
import { isProtestant } from "../../lib/church-calendar";
import { walkFromHome, type RoomPlace } from "../../lib/church-room";
import { PlatformPressable } from "expo-router/react-navigation";
import { homeTabBarStyle } from "../../lib/home-tab-bar";
// From Home, these tabs walk to their place in the church before opening.
const TAB_PLACE: Partial<Record<string, RoomPlace>> = {
  bible: "bible",
  gatherings: "gather",
  explore: "window",
  confession: "confession",
};
export default function TabsLayout() {
  const { profile } = useApp();
  const palette = colors;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // One dark espresso tab bar across the church and its rooms, so moving
        // between them never flips the chrome.
        tabBarActiveTintColor: "#FFF8E9",
        tabBarInactiveTintColor: "#CFC3B1",
        tabBarStyle: {
          backgroundColor: palette.night,
          borderTopColor: "#FFFFFF14",
        },
        tabBarLabelStyle: { fontSize: 11 },
        sceneStyle: { backgroundColor: palette.paper },
      }}
    >
      {(
        [
          ["index", churchCopy(profile.language, "home"), "home-outline"],
          ["explore", copy(profile.language, "explore"), "compass-outline"],
          ["bible", q(profile.language, "bibleTab"), "book-outline"],
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
            // Walk to the tab's place in the church first when leaving Home.
            ...(TAB_PLACE[name] && {
              tabBarButton: (props) => (
                <PlatformPressable
                  {...props}
                  onPress={(e) => {
                    const press = () => props.onPress?.(e);
                    if (!walkFromHome(TAB_PLACE[name]!, press)) press();
                  }}
                />
              ),
            }),
            ...(name === "index"
              ? {
                  tabBarStyle: homeTabBarStyle,
                  tabBarActiveTintColor: "#FFF8E9",
                  tabBarInactiveTintColor: "#D7CBB9",
                }
              : {}),
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
