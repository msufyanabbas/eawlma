# Eawlma Mobile — Setup

A React Native (Expo SDK 52) client that talks to the same backend as the
web app. Lives inside the monorepo as `@eawlma/mobile`. Pulls translations
from the shared `@eawlma/i18n-locales` workspace package so adding a new
language requires editing JSON in only one place.

## First-time setup

The workspace dependencies are installed automatically by the root-level
`npm install`. From the repo root:

```bash
npm install
```

Then start the Metro dev server:

```bash
cd apps/mobile
npx expo start
```

This prints a QR code in the terminal:

- **iOS**: open the Camera app, point it at the QR. Expo Go takes over.
- **Android**: open the Expo Go app, tap "Scan QR code", point it at the QR.
- **Both**: device and Mac/PC must be on the same Wi-Fi. If they aren't,
  press `s` in the Metro terminal to switch to tunnel mode (slower but
  works across networks).

## Connecting to the backend

`src/api/client.ts` reads `expo.extra.apiUrl` from `app.json`. The default
points to `http://localhost:3010/api/v1`, which works for an iOS simulator
running on the same Mac as the backend.

For a physical device, change `extra.apiUrl` in `app.json` to your machine's
LAN IP — e.g. `http://192.168.1.42:3010/api/v1`. The backend has to be
reachable on that interface, not just `localhost`.

## What's in the box

```
apps/mobile/
├── App.tsx                        # entry: providers + bootstrap
├── app.json                       # Expo config
├── babel.config.js                # reanimated plugin
├── metro.config.js                # monorepo-aware resolver
├── tsconfig.json                  # paths: @/* → src/*
├── assets/                        # icons + splash (placeholders)
└── src/
    ├── theme/                     # COLORS, FONTS, SIZES, SHADOWS + paper themes
    ├── store/                     # auth.store, ui.store (Zustand)
    ├── api/                       # axios client + per-resource modules
    ├── i18n/                      # i18next bootstrap + RTL helpers
    ├── navigation/                # Bottom tabs + root stack + types
    ├── components/                # ListingCard, Header, SearchBar,
    │                               # BottomSheet, EmptyState, LoadingScreen
    └── screens/
        ├── auth/                  # LoginScreen, RegisterScreen
        ├── HomeScreen             # tab
        ├── SearchScreen           # tab
        ├── SavedScreen            # tab
        ├── MessagesScreen         # tab
        ├── ProfileScreen          # tab
        ├── ListingDetailScreen
        ├── AgentProfileScreen
        ├── BookingScreen
        ├── ChatScreen
        ├── DashboardScreen
        ├── MyListingsScreen
        ├── AddListingScreen       # 5-step wizard
        ├── WalletScreen
        └── NotificationsScreen
```

## RTL

Arabic / Urdu / Persian / Hebrew flip the layout direction. The check lives
in `src/i18n/rtl.ts` and is called from `App.tsx` on boot.

A direction switch (e.g. user picks Arabic from English) requires reloading
the JS bundle on Android — call `Updates.reloadAsync()` from `expo-updates`
after `setLanguage()`, or instruct the user to close and reopen the app.
iOS picks up the flip immediately.

## Missing assets

`assets/icon.png`, `splash.png`, `adaptive-icon.png`, `notification-icon.png`
are referenced in `app.json` but not committed (see `assets/README.md` for
required dimensions). Expo will use built-in placeholders during local dev;
add real PNGs before publishing.

## Known caveats

- **react-native-mmkv** was in the original brief but isn't installed — it
  requires a custom dev client because it ships native code, and would
  break Expo Go. We use `expo-secure-store` (tokens) +
  `@react-native-async-storage/async-storage` (preferences) instead. If you
  want MMKV later, run `npx expo install react-native-mmkv` and build a
  dev client with `npx expo prebuild` + `npx expo run:ios|android`.
- **react-native-maps** on Android requires a Google Maps API key
  (`google.maps.android.config.googleMaps.apiKey` in `app.json`). The map
  screens degrade to a placeholder when the key is missing.
- **expo-router** is *not* used — the app uses classic React Navigation
  with `createStackNavigator` + `createBottomTabNavigator`.

## i18n changes

To add a string:

1. Add the key to `packages/i18n-locales/locales/en.json`.
2. Add the same key with proper translation to each of the 37 other locale
   files in the same directory.
3. Use `t('namespace.key')` in your component.

Both apps pick the new keys up automatically — no manual import or
re-registration.
