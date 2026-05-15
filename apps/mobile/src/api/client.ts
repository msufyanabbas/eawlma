import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = (Constants.expoConfig?.extra?.apiUrl as string) ||
  'http://192.168.1.125:3010/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {}
  // Tell the backend which locale to translate listing copy into. The mobile
  // i18n module persists the active language to AsyncStorage under the same
  // key the web client uses for parity.
  try {
    const locale = (await AsyncStorage.getItem('eawlma.locale')) || 'ar';
    config.headers['Accept-Language'] = locale;
  } catch {
    config.headers['Accept-Language'] = 'ar';
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (__DEV__) {
      console.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('accessToken');
    }
    return Promise.reject(error);
  }
);

export default api;
