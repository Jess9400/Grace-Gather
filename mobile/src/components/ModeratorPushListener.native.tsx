import { useEffect } from "react";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async (notice) => {
    const screen = notice.request.content.data?.screen;
    const supported = screen === "admin" || screen === "notifications" || screen === "friends" || screen === "story";
    return { shouldShowBanner: supported, shouldShowList: supported, shouldPlaySound: supported, shouldSetBadge: false };
  },
});

export default function ModeratorPushListener() {
  useEffect(() => {
    const open = (response: Notifications.NotificationResponse) => {
      if (response.notification.request.content.data?.screen === "admin") router.push("/admin");
      else if (response.notification.request.content.data?.screen === "notifications") router.push("/notifications");
      else if (response.notification.request.content.data?.screen === "friends") router.push({ pathname: "/friends", params: { view: "friends" } });
      else if (response.notification.request.content.data?.screen === "story") {
        const id = response.notification.request.content.data?.id;
        if (typeof id === "string" && /^testimony-[0-9a-f-]{36}$/i.test(id)) router.push({ pathname: "/story/[id]", params: { id, comments: "1" } });
      }
    };
    const last = Notifications.getLastNotificationResponse();
    if (last) { open(last); Notifications.clearLastNotificationResponse(); }
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, []);
  return null;
}
