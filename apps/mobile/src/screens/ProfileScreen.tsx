// ProfileScreen — the Profile tab. Acts as the settings hub. Authenticated
// users see their identity card + menu rows (dashboard, listings, wallet, etc.)
// plus theme & language controls. Unauthenticated users see a sign-in CTA but
// can still tweak theme/language so their preferences survive sign-in.
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BottomSheet } from '@/components/BottomSheet';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';
import { changeLanguage } from '@/i18n';
import { LOCALE_CODES, type LocaleCode } from '@eawlma/i18n-locales';
import { FONTS, SHADOWS, SIZES, useColors, useIsDark } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

// Native names for the most common locales we ship. Anything outside this map
// falls back to the language code in uppercase.
const LANGUAGE_LABELS: Partial<Record<LocaleCode, string>> = {
  ar: 'العربية',
  en: 'English',
  ur: 'اردو',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  tr: 'Türkçe',
  fa: 'فارسی',
};

const STAFF_ROLES = new Set(['agent', 'admin', 'moderator', 'agency_admin']);

export function ProfileScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const themePref = useUiStore((s) => s.themePref);
  const language = useUiStore((s) => s.language);
  const [languageSheetOpen, setLanguageSheetOpen] = useState(false);

  const isSignedIn = !!token;
  const isStaff = !!user && STAFF_ROLES.has(user.role);

  const currentLanguageLabel = useMemo(() => {
    const code = language as LocaleCode;
    return LANGUAGE_LABELS[code] ?? language.toUpperCase();
  }, [language]);

  const darkModeOn =
    themePref === 'dark' || (themePref === 'system' && isDark);

  const toggleDarkMode = (next: boolean) => {
    useUiStore.getState().setThemePref(next ? 'dark' : 'light');
  };

  const handleSignOut = () => {
    void useAuthStore.getState().clear();
  };

  const handlePickLanguage = (code: LocaleCode) => {
    useUiStore.getState().setLanguage(code);
    void changeLanguage(code);
    setLanguageSheetOpen(false);
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + SIZES.lg, paddingBottom: SIZES.huge },
        ]}
      >
        <Text style={[styles.screenTitle, { color: colors.text }]}>{t('nav.profile')}</Text>

        {isSignedIn && user ? (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={[styles.identityCard, { backgroundColor: colors.surface }, SHADOWS.sm]}
          >
            {user.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={styles.identityAvatar}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <View
                style={[
                  styles.identityAvatar,
                  styles.identityAvatarFallback,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text style={styles.identityAvatarText}>
                  {(user.fullName ?? user.email ?? '?').trim()[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
            <View style={styles.identityBody}>
              <Text numberOfLines={1} style={[styles.identityName, { color: colors.text }]}>
                {user.fullName ?? user.email}
              </Text>
              <Text numberOfLines={1} style={[styles.identityEmail, { color: colors.textSecondary }]}>
                {user.email}
              </Text>
              <View style={[styles.roleChip, { backgroundColor: colors.surfaceMuted }]}>
                <Text style={[styles.roleChipText, { color: colors.primary }]}>
                  {user.role}
                </Text>
              </View>
            </View>
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={[styles.signedOutCard, { backgroundColor: colors.surface }, SHADOWS.sm]}
          >
            <View style={[styles.signedOutIcon, { backgroundColor: '#EEEAFF' }]}>
              <Ionicons name="person-circle-outline" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.signedOutTitle, { color: colors.text }]}>
              {t('wishlist.signInToSync')}
            </Text>
            <Text style={[styles.signedOutBody, { color: colors.textSecondary }]}>
              {t('wishlist.signInDesc')}
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Login')}
              buttonColor={colors.primary}
              style={styles.signedOutBtn}
            >
              {t('auth.signIn')}
            </Button>
            <Button
              mode="text"
              onPress={() => navigation.navigate('Register')}
              textColor={colors.primary}
            >
              {t('auth.createAccount')}
            </Button>
          </Animated.View>
        )}

        <View style={[styles.section, { backgroundColor: colors.surface }, SHADOWS.sm]}>
          {isSignedIn && isStaff ? (
            <MenuRow
              icon="speedometer-outline"
              label={t('nav.dashboard')}
              onPress={() => navigation.navigate('Dashboard')}
              colors={colors}
            />
          ) : null}

          {isSignedIn ? (
            <>
              <MenuRow
                icon="document-text-outline"
                label={t('nav.myListings')}
                onPress={() => navigation.navigate('MyListings')}
                colors={colors}
              />
              <MenuRow
                icon="heart-outline"
                label={t('nav.favorites')}
                onPress={() =>
                  navigation.dispatch(
                    CommonActions.navigate({ name: 'Saved' }),
                  )
                }
                colors={colors}
              />
              <MenuRow
                icon="wallet-outline"
                label={t('wallet.title')}
                onPress={() => navigation.navigate('Wallet')}
                colors={colors}
              />
              <MenuRow
                icon="notifications-outline"
                label={t('nav.notifications')}
                onPress={() => navigation.navigate('Notifications')}
                colors={colors}
              />
            </>
          ) : null}

          <MenuRow
            icon="language-outline"
            label={t('nav.language')}
            value={currentLanguageLabel}
            onPress={() => setLanguageSheetOpen(true)}
            colors={colors}
          />

          <ToggleRow
            icon={darkModeOn ? 'moon' : 'sunny-outline'}
            label={t('nav.darkMode')}
            value={darkModeOn}
            onValueChange={toggleDarkMode}
            colors={colors}
          />

          {isSignedIn ? (
            <MenuRow
              icon="log-out-outline"
              label={t('nav.logout')}
              onPress={handleSignOut}
              colors={colors}
              destructive
              hideChevron
              hideDivider
            />
          ) : null}
        </View>
      </ScrollView>

      <BottomSheet
        open={languageSheetOpen}
        onClose={() => setLanguageSheetOpen(false)}
        heightFraction={0.7}
      >
        <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('nav.language')}</Text>
        <ScrollView style={styles.flex} contentContainerStyle={styles.sheetContent}>
          {LOCALE_CODES.map((code) => {
            const label = LANGUAGE_LABELS[code] ?? code.toUpperCase();
            const active = code === language;
            return (
              <TouchableOpacity
                key={code}
                style={[
                  styles.sheetRow,
                  { borderBottomColor: colors.divider },
                  active && { backgroundColor: colors.surfaceMuted },
                ]}
                onPress={() => handlePickLanguage(code)}
              >
                <View style={styles.sheetRowText}>
                  <Text style={[styles.sheetRowLabel, { color: colors.text }]}>{label}</Text>
                  <Text style={[styles.sheetRowCode, { color: colors.textMuted }]}>{code}</Text>
                </View>
                {active ? (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

interface MenuRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  hideChevron?: boolean;
  hideDivider?: boolean;
  colors: ReturnType<typeof useColors>;
}

function MenuRow({
  icon,
  label,
  value,
  onPress,
  destructive,
  hideChevron,
  hideDivider,
  colors,
}: MenuRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        !hideDivider && { borderBottomColor: colors.divider, borderBottomWidth: StyleSheet.hairlineWidth },
        pressed && { backgroundColor: colors.surfaceMuted },
      ]}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: destructive ? '#FEE2E2' : '#EEEAFF' }]}>
        <Ionicons
          name={icon}
          size={18}
          color={destructive ? colors.error : colors.primary}
        />
      </View>
      <Text
        style={[
          styles.menuLabel,
          { color: destructive ? colors.error : colors.text },
        ]}
      >
        {label}
      </Text>
      {value ? (
        <Text style={[styles.menuValue, { color: colors.textSecondary }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {!hideChevron ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      ) : null}
    </Pressable>
  );
}

interface ToggleRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  colors: ReturnType<typeof useColors>;
}

function ToggleRow({ icon, label, value, onValueChange, colors }: ToggleRowProps) {
  return (
    <View
      style={[
        styles.menuRow,
        { borderBottomColor: colors.divider, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: '#EEEAFF' }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor={value ? colors.primary : colors.surface}
        trackColor={{ false: colors.border, true: colors.primaryLight }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SIZES.lg,
  },
  screenTitle: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.h2,
    marginBottom: SIZES.lg,
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
    padding: SIZES.lg,
    borderRadius: SIZES.borderRadiusLg,
    marginBottom: SIZES.lg,
  },
  identityAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  identityAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityAvatarText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontSize: SIZES.h3,
  },
  identityBody: { flex: 1 },
  identityName: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.subtitle,
  },
  identityEmail: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    marginTop: 2,
  },
  roleChip: {
    marginTop: SIZES.sm,
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: SIZES.borderRadiusFull,
    alignSelf: 'flex-start',
  },
  roleChipText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
    textTransform: 'capitalize',
  },
  signedOutCard: {
    alignItems: 'center',
    padding: SIZES.xl,
    borderRadius: SIZES.borderRadiusLg,
    marginBottom: SIZES.lg,
  },
  signedOutIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.md,
  },
  signedOutTitle: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.subtitle,
    textAlign: 'center',
  },
  signedOutBody: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    textAlign: 'center',
    marginTop: SIZES.sm,
    marginBottom: SIZES.md,
  },
  signedOutBtn: {
    alignSelf: 'stretch',
    borderRadius: SIZES.borderRadius,
  },
  section: {
    borderRadius: SIZES.borderRadiusLg,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
  },
  menuValue: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    marginRight: SIZES.xs,
    maxWidth: 120,
  },
  sheetTitle: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.subtitle,
    marginBottom: SIZES.sm,
  },
  sheetContent: {
    paddingBottom: SIZES.huge,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: SIZES.borderRadius,
  },
  sheetRowText: {
    flex: 1,
  },
  sheetRowLabel: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
  },
  sheetRowCode: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.caption,
    textTransform: 'uppercase',
    marginTop: 1,
  },
});
