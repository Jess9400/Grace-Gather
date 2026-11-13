import { useEffect } from "react";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async (notice) => {
    const moderation = notice.request.content.data?.screen === "admin";
    return { shouldShowBanner: moderation, shouldShowList: moderation, shouldPlaySound: moderation, shouldSetBadge: false };
  },
});

export default function ModeratorPushListener() {
  useEffect(() => {
    const open = (response: Notifications.NotificationResponse) => {
      if (response.notification.request.content.data?.screen === "admin") router.push("/admin");
    };
    const last = Notifications.getLastNotificationResponse();
    if (last) { open(last); Notifications.clearLastNotificationResponse(); }
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, []);
  return null;
}
