import {
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  Tajawal_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/tajawal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { I18nextProvider } from 'react-i18next';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from './src/navigation';
import { LoadingScreen } from './src/components/LoadingScreen';
import { bootstrapI18n, i18n } from './src/i18n';
import { syncRtlForLanguage } from './src/i18n/rtl';
import { useAuthStore } from './src/store/auth.store';
import { useUiStore } from './src/store/ui.store';
import { paperLightTheme, paperDarkTheme } from './src/theme/paper';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

export default function App() {
  const scheme = useColorScheme();
  const [bootstrapped, setBootstrapped] = useState(false);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateUi = useUiStore((s) => s.hydrate);
  const language = useUiStore((s) => s.language);

  const [fontsLoaded] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
    Tajawal_800ExtraBold,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([hydrateAuth(), hydrateUi()]);
      const uiLang = useUiStore.getState().language;
      await bootstrapI18n(uiLang);
      syncRtlForLanguage(uiLang);
      if (!cancelled) setBootstrapped(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrateAuth, hydrateUi]);

  // Keep the active i18n language in sync when the user picks one at runtime.
  useEffect(() => {
    if (bootstrapped && language && i18n.language !== language) {
      void i18n.changeLanguage(language);
    }
  }, [bootstrapped, language]);

  if (!fontsLoaded || !bootstrapped) {
    return (
      <View style={{ flex: 1 }}>
        <LoadingScreen />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            <PaperProvider theme={scheme === 'dark' ? paperDarkTheme : paperLightTheme}>
              <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
              <AppNavigator />
            </PaperProvider>
          </I18nextProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
