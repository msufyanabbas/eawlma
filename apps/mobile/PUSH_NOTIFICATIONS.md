# Push Notifications

End-to-end guide for the push pipeline on eawlma — what's wired up, how to test it, and what an SRE needs to know when something fires off-hours.

## Architecture

```
[trigger]                  [backend]                              [Expo]                  [device]
NotificationsService.create
  └─ persists in_app row
  └─ void PushService.sendToUser(userId, payload)
        └─ SELECT * FROM device_tokens WHERE user_id=? AND is_active=true
        └─ POST https://exp.host/--/api/v2/push/send  ──────────►  FCM / APNs  ──────────►  expo-notifications
                                                                                              └─ foreground: setNotificationHandler
                                                                                              └─ tap: addNotificationResponseReceivedListener → nav
```

The in-app save is the **canonical** event; the push is a best-effort fanout. Push failures are caught inside `PushService.dispatch` — they never propagate up and never block the save.

## Data model

`device_tokens` (one row per push registration):

| column        | type         | notes                                                          |
| ------------- | ------------ | -------------------------------------------------------------- |
| `id`          | uuid         |                                                                |
| `user_id`     | uuid FK      | `ON DELETE CASCADE` — user delete drops their tokens           |
| `token`       | varchar(512) | unique; the Expo push token string                             |
| `platform`    | enum         | `ios` \| `android` \| `web`                                    |
| `device_model`| varchar(100) | optional, from `Device.modelName`                              |
| `is_active`   | boolean      | flipped to `false` on logout or `DeviceNotRegistered` response |
| `created_at` / `updated_at` / `deleted_at` / `version` | BaseEntity columns |

Partial index on `(user_id) WHERE is_active = true` so `sendToUser` only scans live rows.

## Mobile lifecycle

`src/services/notifications.service.ts` is the single entry point. Key methods:

- `registerForPushNotifications()` — asks for permission, mints an Expo push token, stores it in AsyncStorage (`eawlma.pushToken`), and POSTs `/notifications/register-device`. Idempotent — safe to call on every auth-state flip.
- `unregisterDevice()` — DELETE `/notifications/unregister-device` (soft-disable on the backend) and clear the AsyncStorage cache. Called from `useAuthStore.logout`.
- `setupListeners(onReceive, onTap)` — wires up the foreground + tap handlers.
- `removeListeners()` — call from the cleanup of the same `useEffect` that set them up.

Foreground presentation is forced via `Notifications.setNotificationHandler` so a message arriving while the user is staring at the app still shows the alert + plays the sound + bumps the badge.

### Android channels

Three channels are created on first registration:

- `default` — fallback, MAX importance
- `messages` — DM pushes, HIGH importance + sound
- `inquiries` — listing inquiry pushes, HIGH importance

The backend maps each `NotificationType` to a channel via `channelFor()` in `notifications.service.ts`. iOS ignores `channelId` and uses the app's single notification category.

### Tap routing

`App.tsx` reads `data.type` from the notification payload and routes via the `NavigationContainer` ref:

| `data.type`                                | navigates to                 |
| ------------------------------------------ | ---------------------------- |
| `message_received` (+ `conversationId`)    | `Chat`                       |
| `message_received` (no conversation id)    | `Messages`                   |
| `inquiry_received`                         | `Inquiries`                  |
| `listing_approved` / `listing_rejected`    | `MyListings`                 |
| `booking_*`                                | `Bookings`                   |
| `commission` / `deal_closed`               | `Commissions`                |
| `payment_succeeded` / `payout`             | `Wallet`                     |
| `support_reply`                            | `Support`                    |
| anything else                              | `Notifications`              |

Cold-start taps (app launched by tapping the notification) are handled via `Notifications.getLastNotificationResponseAsync()` after nav mounts.

## Backend

`PushService` (`apps/backend/src/modules/notifications/push.service.ts`):

- `registerToken(userId, token, platform, deviceModel)` — upsert keyed on `token`. Reactivates a row if the same token re-registers (sign-in on a previously-signed-out device).
- `unregisterToken(token)` — flip `is_active` to false. Row kept for audit.
- `sendToUser(userId, payload)` — fetches active tokens and dispatches.
- `dispatch(tokens, payload)` — single HTTP POST to `https://exp.host/--/api/v2/push/send` with chunked batches. Walks the response, and on `DeviceNotRegistered` deactivates the offending token so we stop spending budget on a tombstone.

The service is wired into `NotificationsService.create()`:

```ts
void this.pushService.sendToUser(input.userId, {
  title: input.title,
  body: input.body,
  data: { ...(input.data ?? {}), type: input.type, notificationId: saved.id },
  channelId: channelFor(input.type),
});
```

`void` is deliberate — the call is fire-and-forget so the in-app save commit doesn't wait on Expo's HTTP latency.

## Settings UI

`apps/mobile/src/screens/SettingsScreen.tsx` — the Push Notifications switch reads the OS permission on mount (so the UI doesn't lie when the user toggled the system Settings entry) and on toggle either:

- registers (on) — and if the OS denies, surfaces an Alert with an "Open Settings" deep link to the app's notification settings;
- unregisters (off).

There is **no** UI-only toggle: flipping the switch always reflects the real backend + OS state.

## Testing the pipeline

### 1. Local-only smoke test (no backend)

```ts
import { NotificationService } from './src/services/notifications.service';

await NotificationService.scheduleLocalNotification(
  'Hello',
  'This is a local test',
  { type: 'message_received', conversationId: 'abc' },
);
```

Verifies the listener wiring + channel display, but bypasses Expo's push gateway. Tap should route to `Chat` per the routing table above.

### 2. End-to-end via the Expo dashboard

1. Sign in on a physical device — `expo-notifications` will skip token minting on the simulator.
2. Grab the token via the dev console: `await AsyncStorage.getItem('eawlma.pushToken')`.
3. Open <https://expo.dev/notifications> and paste the token.
4. Send. Verify the device receives it, the OS shows the channel name, and tapping routes correctly.

### 3. End-to-end via the backend

1. Create a notification through any path that calls `NotificationsService.create` (e.g. send a chat message to a user who has the app installed on a different device).
2. Watch the backend log for `[PushService]` lines (success counts and DeviceNotRegistered cleanups).
3. The device should buzz within ~2s.

## Operational notes

- **Expo's rate limit**: 600 notifications/second per project. We batch by 100 in `dispatch` to stay well under it.
- **Tombstone cleanup**: a token deactivated by `DeviceNotRegistered` will be re-activated automatically next time the user signs in on that device (the upsert in `registerToken`). No manual cleanup needed.
- **Opt-outs**: `NotificationsService.create` checks `user.notificationPreferences[type] !== false` *before* persisting. A user who toggled a category off in their preferences gets no in-app row and no push. The per-device push toggle in Settings is separate (it controls OS permission, not the preference map).
- **EAS project id**: token minting requires `Constants.expoConfig.extra.eas.projectId` once we move to a real EAS build. In Expo Go / local dev, the call works without it.

## Where to look when something breaks

| symptom                                 | first place to check                                                          |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| No push arrives                         | Backend log for `[PushService]`. If `tokens=0`, check `device_tokens`.        |
| Token registers but pushes don't arrive | Expo dashboard delivery receipts for that token.                              |
| Tap doesn't route                       | `App.tsx` `handleTap` — confirm `data.type` matches one of the cases.         |
| Android channel name wrong              | `NotificationService.ensureAndroidChannels()` — channels are immutable on Android once created. Uninstall + reinstall to recreate. |
| User can't re-enable push from Settings | OS permission has been hard-denied. The Alert offers the deep link to the system Settings entry. |
