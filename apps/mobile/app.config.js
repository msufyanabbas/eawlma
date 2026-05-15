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
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'sa.eawlma.app',
      config: {
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
      },
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
    },
    extra: {
      apiUrl: API_URL,
      googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    },
  },
};
