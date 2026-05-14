import React, { useEffect, useState } from 'react';
import { Text as RNText } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  Tajawal_800ExtraBold,
} from '@expo-google-fonts/tajawal';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';

import { initI18n } from './src/i18n';
import { useAuthStore } from './src/store/auth.store';
import { useUIStore } from './src/store/ui.store';
import { useTheme } from './src/hooks/useTheme';
import { useRTL } from './src/hooks/useRTL';
import { messagesApi } from './src/api';
import { SIZES } from './src/theme';

import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import SavedScreen from './src/screens/SavedScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ListingDetailScreen from './src/screens/ListingDetailScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import MyListingsScreen from './src/screens/MyListingsScreen';
import AddListingScreen from './src/screens/AddListingScreen';
import EditListingScreen from './src/screens/EditListingScreen';
import WalletScreen from './src/screens/WalletScreen';
import CommissionsScreen from './src/screens/CommissionsScreen';
import ChatScreen from './src/screens/ChatScreen';
import AgentProfileScreen from './src/screens/AgentProfileScreen';
import InquiriesScreen from './src/screens/InquiriesScreen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  const { colors } = useTheme();
  const { isRTL, isAr } = useRTL();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  const { data: unreadData } = useQuery({
    queryKey: ['conversations-unread'],
    queryFn: () => messagesApi.unreadTotal(),
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  });
  const unread =
    unreadData?.count ??
    unreadData?.data?.count ??
    unreadData?.total ??
    unreadData?.data?.total ??
    0;

  const tabs = [
    { name: 'Home',     component: HomeScreen,     labelAr: 'الرئيسية', labelEn: 'Home',     icon: 'home' },
    { name: 'Search',   component: SearchScreen,   labelAr: 'بحث',      labelEn: 'Search',   icon: 'search' },
    { name: 'Saved',    component: SavedScreen,    labelAr: 'محفوظات',  labelEn: 'Saved',    icon: 'heart' },
    { name: 'Messages', component: MessagesScreen, labelAr: 'رسائل',    labelEn: 'Messages', icon: 'chatbubbles' },
    { name: 'Profile',  component: ProfileScreen,  labelAr: 'حسابي',    labelEn: 'Profile',  icon: 'person' },
  ];

  // React Navigation bottom tabs don't auto-flip for RTL. Reverse the order
  // so Home lands on the right when an RTL language is active.
  const orderedTabs = isRTL ? [...tabs].reverse() : tabs;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: SIZES.tabBarHeight,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: SIZES.caption,
          fontFamily: 'Tajawal_700Bold',
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color }) => {
          const tab = tabs.find(t => t.name === route.name);
          if (!tab) return null;
          return (
            <Ionicons
              name={(focused ? tab.icon : `${tab.icon}-outline`) as any}
              size={24}
              color={color}
            />
          );
        },
      })}
    >
      {orderedTabs.map(tab => (
        <Tab.Screen
          key={tab.name}
          name={tab.name as any}
          component={tab.component}
          options={{
            tabBarLabel: isAr ? tab.labelAr : tab.labelEn,
            tabBarBadge:
              tab.name === 'Messages' && unread > 0 ? unread : undefined,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

function setDefaultFont() {
  // @ts-expect-error defaultProps is a runtime field on Text
  const existing = RNText.defaultProps || {};
  // @ts-expect-error see above
  RNText.defaultProps = {
    ...existing,
    style: [{ fontFamily: 'Tajawal_400Regular' }, existing.style],
  };
}

export default function App() {
  const [ready, setReady] = useState(false);
  const { loadFromStorage } = useAuthStore();
  const { loadPreferences } = useUIStore();

  const [fontsLoaded] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
    Tajawal_800ExtraBold,
  });

  useEffect(() => {
    async function bootstrap() {
      await loadPreferences();
      await loadFromStorage();
      await initI18n();
      setReady(true);
    }
    bootstrap();
  }, []);

  useEffect(() => {
    if (fontsLoaded) setDefaultFont();
  }, [fontsLoaded]);

  if (!fontsLoaded || !ready) {
    return <SplashScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
            <Stack.Screen name="AgentProfile" component={AgentProfileScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="MyListings" component={MyListingsScreen} />
            <Stack.Screen name="AddListing" component={AddListingScreen} />
            <Stack.Screen name="EditListing" component={EditListingScreen} />
            <Stack.Screen name="Wallet" component={WalletScreen} />
            <Stack.Screen name="Commissions" component={CommissionsScreen} />
            <Stack.Screen name="Inquiries" component={InquiriesScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
