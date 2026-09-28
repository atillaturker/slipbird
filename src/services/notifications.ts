import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const BUDGET_CHANNEL = 'budget-alerts';

/** Show budget alerts even while the app is open; create the Android channel. Call once at start. */
export async function setupNotifications(channelName: string): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(BUDGET_CHANNEL, { name: channelName, importance: Notifications.AndroidImportance.DEFAULT });
  }
}

/** Asks once (when the first budget is set). True when alerts can be shown. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** A local notification, now. No push server: budget alerts are computed on the device. */
export async function notifyNow(title: string, body: string): Promise<void> {
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;
  await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: Platform.OS === 'android' ? { channelId: BUDGET_CHANNEL } : null });
}
