// Dynamic Expo config. Replaces the previous app.json so the Google Maps
// API key (and any other secret) lives in .env — which is gitignored — and
// gets injected into native config (Android/iOS) plus the JS-runtime
// Constants.expoConfig.extra at build/start time.
//
// We resolve .env by absolute path so it loads regardless of which CWD
// Expo CLI was invoked from (otherwise running `expo start` from the
// monorepo root would silently miss this file).
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const API_URL = process.env.API_URL || 'http://192.168.1.125:3010/api/v1';

module.exports = {
  expo: {
    name: 'عولمة',
    slug: 'eawlma',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: false,
    splash: {
      backgroundColor: '#6C63A6',
      resizeMode: 'contain',
    },
    assetBundlePatterns: ['**/*'],
    // Custom URL scheme — handles `eawlma://listings/<id>`-style links from
    // older share targets that don't support Universal/App Links. The web
    // domain links below are the preferred path (no app-installed prompt).
    scheme: 'eawlma',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'sa.eawlma.app',
      config: {
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
      },
      // Universal Links — requires apple-app-site-association hosted at
      // https://eawlma.sa/.well-known/apple-app-site-association declaring
      // this bundle id with the matching paths. Without that file Safari
      // falls back to the web page (which is the desired graceful default).
      associatedDomains: ['applinks:eawlma.sa'],
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#6C63A6',
      },
      package: 'sa.eawlma.app',
      config: {
        googleMaps: {
          apiKey: GOOGLE_MAPS_API_KEY,
        },
      },
      // App Links — `autoVerify: true` makes Android verify the
      // /.well-known/assetlinks.json file on eawlma.sa and skip the chooser
      // dialog. The custom scheme entry covers links from non-browser apps.
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            { scheme: 'https', host: 'eawlma.sa', pathPrefix: '/listings' },
            { scheme: 'https', host: 'eawlma.sa', pathPrefix: '/agents' },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
        {
          action: 'VIEW',
          data: [
            { scheme: 'eawlma', host: 'listings' },
            { scheme: 'eawlma', host: 'agents' },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    // expo-notifications config plugin: ships the small-icon asset Android
    // uses for foreground/heads-up notifications. The current PNG is a
    // placeholder using the app icon — replace with a proper white-on-
    // transparent monochrome glyph before the public release.
    plugins: [
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#6C63A6',
        },
      ],
    ],
    extra: {
      apiUrl: API_URL,
      googleMapsApiKey: GOOGLE_MAPS_API_KEY,
      eas: {
        projectId: '7ac3856f-7773-472e-bb55-cc9da63af9d4',
      },
    },
  },
};
