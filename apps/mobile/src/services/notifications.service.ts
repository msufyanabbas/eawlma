import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import api from '../api/client';

const PUSH_TOKEN_KEY = 'eawlma.pushToken';

// Foreground presentation rules. Without this, an arriving push is silent
// when the user happens to have the app open — bad UX for messages.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationService {
  private static notificationListener: Notifications.Subscription | null = null;
  private static responseListener: Notifications.Subscription | null = null;

  // ---------------------------------------------------------------------------
  // Permission + token
  // ---------------------------------------------------------------------------

  /**
   * Asks for permission, mints an Expo push token, persists it locally, and
   * tells the backend about it. Returns the token, or `null` if anything
   * along the way prevented it from completing (simulator, denied, etc.).
   *
   * Safe to call on every authenticated app launch — the upsert on the
   * backend dedupes by token string.
   */
  static async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      if (__DEV__) console.log('[Push] Not a real device, skipping');
      return null;
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }
    if (final !== 'granted') {
      if (__DEV__) console.log('[Push] Permission not granted');
      return null;
    }

    if (Platform.OS === 'android') {
      await this.ensureAndroidChannels();
    }

    try {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        (Constants as any).easConfig?.projectId ??
        undefined;

      const expoToken = projectId
        ? await Notifications.getExpoPushTokenAsync({ projectId })
        : await Notifications.getExpoPushTokenAsync();
      const token = expoToken.data;

      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
      await this.syncTokenToBackend(token);
      return token;
    } catch (err) {
      if (__DEV__) console.error('[Push] Token error:', err);
      return null;
    }
  }

  private static async ensureAndroidChannels(): Promise<void> {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C63A6',
    });
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250],
      lightColor: '#6C63A6',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('inquiries', {
      name: 'Inquiries',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#D4A843',
    });
  }

  private static async syncTokenToBackend(token: string): Promise<void> {
    try {
      await api.post('/notifications/register-device', {
        token,
        platform: Platform.OS,
        deviceModel: Device.modelName ?? undefined,
      });
    } catch (err) {
      // Non-fatal: the next call will retry. Login flow shouldn't crash if
      // the backend is briefly unreachable.
      if (__DEV__) console.error('[Push] sync token failed:', err);
    }
  }

  /**
   * Called from logout. Soft-disables the token on the backend and wipes
   * the local cache so the next sign-in mints a fresh registration.
   */
  static async unregisterDevice(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      if (token) {
        await api.delete('/notifications/unregister-device', { data: { token } });
      }
    } catch (err) {
      if (__DEV__) console.error('[Push] unregister failed:', err);
    } finally {
      try {
        await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
      } catch {
        /* AsyncStorage failure is non-fatal */
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Listener lifecycle
  // ---------------------------------------------------------------------------

  static setupListeners(
    onNotification: (n: Notifications.Notification) => void,
    onNotificationResponse: (r: Notifications.NotificationResponse) => void,
  ): void {
    this.notificationListener = Notifications.addNotificationReceivedListener(onNotification);
    this.responseListener =
      Notifications.addNotificationResponseReceivedListener(onNotificationResponse);
  }

  static removeListeners(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Convenience
  // ---------------------------------------------------------------------------

  static getBadgeCount(): Promise<number> {
    return Notifications.getBadgeCountAsync();
  }

  static setBadgeCount(count: number): Promise<boolean> {
    return Notifications.setBadgeCountAsync(count);
  }

  static async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
  }

  /** Useful for verifying the local pipeline without hitting the backend. */
  static scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<string> {
    return Notifications.scheduleNotificationAsync({
      content: { title, body, data: data ?? {}, sound: true },
      trigger: null,
    });
  }
}
