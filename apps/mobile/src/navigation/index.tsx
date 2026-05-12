// Root navigation. Two stacks:
//   • An auth-time Stack that drops you into Login/Register if you're not
//     signed in, or into MainTabs if you are.
//   • The MainTabs bottom navigator (Home / Search / Saved / Messages / Profile)
//     which itself contains the five tab screens.
// Push targets like ListingDetail / Chat / Wallet are siblings of MainTabs
// in the root stack so they slide over the tab bar instead of being nested
// inside one tab.
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '../store/auth.store';
import { useUiStore } from '../store/ui.store';
import { LIGHT_COLORS, DARK_COLORS, FONTS, SIZES } from '../theme';
import { useColorScheme } from 'react-native';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { SavedScreen } from '../screens/SavedScreen';
import { MessagesScreen } from '../screens/MessagesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ListingDetailScreen } from '../screens/ListingDetailScreen';
import { AgentProfileScreen } from '../screens/AgentProfileScreen';
import { BookingScreen } from '../screens/BookingScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { MyListingsScreen } from '../screens/MyListingsScreen';
import { AddListingScreen } from '../screens/AddListingScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';

import type { RootStackParamList, TabsParamList } from './types';

const Tab = createBottomTabNavigator<TabsParamList>();
const RootStack = createStackNavigator<RootStackParamList>();

function MainTabs() {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  const unread = useUiStore((s) => s.unreadMessages);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: SIZES.tabBarHeight,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: FONTS.medium,
          fontSize: SIZES.caption,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('nav.home'),
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: t('nav.search'),
          tabBarIcon: ({ color }) => <Ionicons name="search" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Saved"
        component={SavedScreen}
        options={{
          tabBarLabel: t('nav.favorites'),
          tabBarIcon: ({ color }) => <Ionicons name="heart" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarLabel: t('nav.messages'),
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarIcon: ({ color }) => <Ionicons name="chatbubbles" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: t('nav.profile'),
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const scheme = useColorScheme();
  const token = useAuthStore((s) => s.token);
  const navTheme = scheme === 'dark'
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, primary: DARK_COLORS.primary, background: DARK_COLORS.background, card: DARK_COLORS.surface, text: DARK_COLORS.text, border: DARK_COLORS.border } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: LIGHT_COLORS.primary, background: LIGHT_COLORS.background, card: LIGHT_COLORS.surface, text: LIGHT_COLORS.text, border: LIGHT_COLORS.border } };

  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          <>
            <RootStack.Screen name="Main" component={MainTabs} />
            <RootStack.Screen name="ListingDetail" component={ListingDetailScreen} />
            <RootStack.Screen name="AgentProfile" component={AgentProfileScreen} />
            <RootStack.Screen name="Booking" component={BookingScreen} />
            <RootStack.Screen name="Chat" component={ChatScreen} />
            <RootStack.Screen name="Dashboard" component={DashboardScreen} />
            <RootStack.Screen name="MyListings" component={MyListingsScreen} />
            <RootStack.Screen name="AddListing" component={AddListingScreen} />
            <RootStack.Screen name="Wallet" component={WalletScreen} />
            <RootStack.Screen name="Notifications" component={NotificationsScreen} />
          </>
        ) : (
          <>
            <RootStack.Screen name="Login" component={LoginScreen} />
            <RootStack.Screen name="Register" component={RegisterScreen} />
            {/* Unauthenticated users can still browse the tab structure so
                they can see listings without signing in. The auth-gated push
                targets (Booking, Chat, Wallet, etc.) prompt for sign-in
                themselves. */}
            <RootStack.Screen name="Main" component={MainTabs} />
            <RootStack.Screen name="ListingDetail" component={ListingDetailScreen} />
            <RootStack.Screen name="AgentProfile" component={AgentProfileScreen} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
