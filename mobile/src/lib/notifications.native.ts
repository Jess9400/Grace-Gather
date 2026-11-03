import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Language } from "./content";
import { label } from "./labels";
import { backend } from "./backend";
import { getItem, setItem, removeItem } from "./storage";
export async function enableReminder(language: Language) {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") throw new Error("notificationsDenied");
  await disableReminder();
  await Notifications.scheduleNotificationAsync({
    identifier: "away-daily",
    content: {
      title: "Grace & Gather",
      body: label(language, "reminderBody"),
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });
}
export async function disableReminder() {
  await Notifications.cancelScheduledNotificationAsync("away-daily");
}
export async function remindersEnabled() {
  return (await Notifications.getAllScheduledNotificationsAsync()).some(
    (x) => x.identifier === "away-daily",
  );
}
export async function registerGatheringPush() {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId || !backend) throw new Error("pushUnavailable");
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") throw new Error("notificationsDenied");
  const {
    data: { user },
  } = await backend.auth.getUser();
  if (!user) throw new Error("signInRequired");
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const { error } = await backend
    .from("devices")
    .upsert({ user_id: user.id, token, enabled: true });
  if (error) throw error;
  await setItem("gathering-push-token", token);
}

export async function disableGatheringPush() {
  const token = await getItem("gathering-push-token");
  if (token && backend) {
    const {
      data: { user },
    } = await backend.auth.getUser();
    if (user) {
      const { error } = await backend
        .from("devices")
        .delete()
        .eq("user_id", user.id)
        .eq("token", token);
      if (error) throw error;
    }
  }
  await removeItem("gathering-push-token");
}
