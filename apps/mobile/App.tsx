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
import { useTranslation } from 'react-i18next';

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
import StaysScreen from './src/screens/StaysScreen';
import AgentsListScreen from './src/screens/AgentsListScreen';
import MarketScreen from './src/screens/MarketScreen';
import BookingScreen from './src/screens/BookingScreen';
import ReviewsScreen from './src/screens/ReviewsScreen';
import HotelsScreen from './src/screens/HotelsScreen';
import AboutScreen from './src/screens/AboutScreen';
import HelpScreen from './src/screens/HelpScreen';
import BookingsListScreen from './src/screens/BookingsListScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import TermsScreen from './src/screens/TermsScreen';
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';
import AdminModerationScreen from './src/screens/admin/AdminModerationScreen';
import AdminUsersScreen from './src/screens/admin/AdminUsersScreen';
import AdminCommissionsScreen from './src/screens/admin/AdminCommissionsScreen';
import AdminPayoutsScreen from './src/screens/admin/AdminPayoutsScreen';
import AdminDisputesScreen from './src/screens/admin/AdminDisputesScreen';
import AdminPromosScreen from './src/screens/admin/AdminPromosScreen';
import { useWebSocket } from './src/hooks/useWebSocket';

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
  const { isRTL } = useRTL();
  const { t } = useTranslation();
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

  // Tab labels go through i18next so all 38 locales render — the previous
  // ternary only handled Arabic vs English and silently fell back to English
  // for the other 36. The translation keys already ship in every locale JSON.
  const tabs = [
    { name: 'Home',     component: HomeScreen,     label: t('tabs.home'),     icon: 'home' },
    { name: 'Search',   component: SearchScreen,   label: t('tabs.search'),   icon: 'search' },
    { name: 'Saved',    component: SavedScreen,    label: t('tabs.saved'),    icon: 'heart' },
    { name: 'Messages', component: MessagesScreen, label: t('tabs.messages'), icon: 'chatbubbles' },
    { name: 'Profile',  component: ProfileScreen,  label: t('tabs.profile'),  icon: 'person' },
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
            tabBarLabel: tab.label,
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
        <AppContent />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

// Sits inside QueryClientProvider so useWebSocket can call useQueryClient.
function AppContent() {
  useWebSocket();

  return (
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
            <Stack.Screen name="Stays" component={StaysScreen} />
            <Stack.Screen name="AgentsList" component={AgentsListScreen} />
            <Stack.Screen name="Market" component={MarketScreen} />
            <Stack.Screen name="Booking" component={BookingScreen} />
            <Stack.Screen name="Reviews" component={ReviewsScreen} />
            <Stack.Screen name="Hotels" component={HotelsScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
            <Stack.Screen name="Help" component={HelpScreen} />
            <Stack.Screen name="Bookings" component={BookingsListScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            <Stack.Screen name="Terms" component={TermsScreen} />
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <Stack.Screen name="AdminModeration" component={AdminModerationScreen} />
            <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
            <Stack.Screen name="AdminCommissions" component={AdminCommissionsScreen} />
            <Stack.Screen name="AdminPayouts" component={AdminPayoutsScreen} />
            <Stack.Screen name="AdminDisputes" component={AdminDisputesScreen} />
            <Stack.Screen name="AdminPromos" component={AdminPromosScreen} />
          </Stack.Navigator>
        </NavigationContainer>
  );
}
