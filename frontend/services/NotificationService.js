import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
});

// Monthly planting reminders keyed by month (1-12)
const MONTHLY_REMINDERS = {
  1:  "🌱 January: time to order seeds and plan your crop rotation!",
  2:  "🌱 February: sow onions and leeks indoors. Chit your seed potatoes.",
  3:  "🌿 March: sow tomatoes and peppers indoors. Plant shallot sets outside.",
  4:  "🌷 April: last frost risk — harden off seedlings before planting out.",
  5:  "☀️ May: plant out courgettes and beans after the last frost.",
  6:  "🍓 June: pinch out tomato side shoots. First strawberries ready!",
  7:  "🥕 July: harvest regularly to keep plants producing. Water deeply.",
  8:  "✂️ August: cut back summer raspberries. Take tender cuttings.",
  9:  "🍎 September: plant spring bulbs and divide perennials.",
  10: "🧄 October: plant garlic and tulip bulbs now.",
  11: "🌳 November: plant bare-root trees and roses while dormant.",
  12: "📋 December: plan next year's garden and clean your tools.",
};

export async function requestPermission() {
  if (!Device.isDevice) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleMonthlySowingReminder() {
  const granted = await requestPermission();
  if (!granted) return false;

  // Cancel existing monthly reminders
  await cancelMonthlySowingReminder();

  const month = new Date().getMonth() + 1;
  const message = MONTHLY_REMINDERS[month] || "🌿 Check your Alloti app for this month's gardening tasks.";

  // Schedule for the 1st of every month at 09:00
  await Notifications.scheduleNotificationAsync({
    identifier: "monthly-sowing",
    content: {
      title: "Alloti — Monthly Gardening Reminder",
      body: message,
      data: { type: "monthly_sowing" },
    },
    trigger: {
      type: "calendar",
      day: 1,
      hour: 9,
      minute: 0,
      repeats: true,
    },
  });

  await AsyncStorage.setItem("notifications_enabled", "true");
  return true;
}

export async function scheduleWeeklySowingReminder() {
  const granted = await requestPermission();
  if (!granted) return false;

  await Notifications.scheduleNotificationAsync({
    identifier: "weekly-garden",
    content: {
      title: "Alloti — Weekend Garden Check",
      body: "🌿 What needs doing in your garden this weekend?",
      data: { type: "weekly_garden" },
    },
    trigger: {
      type: "weekly",
      weekday: 6, // Saturday
      hour: 9,
      minute: 0,
      repeats: true,
    },
  });

  return true;
}

export async function scheduleFrostAlert(frostDate) {
  const granted = await requestPermission();
  if (!granted) return false;

  const fireDate = new Date(frostDate);
  fireDate.setDate(fireDate.getDate() - 3); // 3 days before

  if (fireDate <= new Date()) return false;

  await Notifications.scheduleNotificationAsync({
    identifier: "frost-alert",
    content: {
      title: "⚠️ Alloti — Frost Warning",
      body: "Frost expected in 3 days — protect tender plants tonight.",
      data: { type: "frost_alert" },
    },
    trigger: { date: fireDate },
  });

  return true;
}

export async function sendImmediateNotification(title, body) {
  const granted = await requestPermission();
  if (!granted) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null, // fire immediately
  });
}

export async function cancelMonthlySowingReminder() {
  await Notifications.cancelScheduledNotificationAsync("monthly-sowing").catch(() => {});
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.setItem("notifications_enabled", "false");
}

export async function getScheduledReminders() {
  return Notifications.getAllScheduledNotificationsAsync();
}
