import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Modal, FlatList, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { useAuthStore } from '../store/auth.store';
import { useUIStore } from '../store/ui.store';
import { authApi } from '../api';
import { changeLanguage } from '../i18n';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../theme';

type LangEntry = { code: string; name: string; flag: string; popular?: boolean };

// Full list of the 38 locales the shared i18n package ships with.
const ALL_LANGUAGES: LangEntry[] = [
  { code: 'ar', name: 'العربية',          flag: '🇸🇦', popular: true },
  { code: 'en', name: 'English',           flag: '🇬🇧', popular: true },
  { code: 'ur', name: 'اردو',              flag: '🇵🇰', popular: true },
  { code: 'fr', name: 'Français',          flag: '🇫🇷', popular: true },
  { code: 'zh', name: '中文',              flag: '🇨🇳', popular: true },
  { code: 'hi', name: 'हिन्दी',             flag: '🇮🇳', popular: true },
  { code: 'es', name: 'Español',           flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch',           flag: '🇩🇪' },
  { code: 'tr', name: 'Türkçe',            flag: '🇹🇷' },
  { code: 'ru', name: 'Русский',           flag: '🇷🇺' },
  { code: 'id', name: 'Bahasa Indonesia',  flag: '🇮🇩' },
  { code: 'ms', name: 'Bahasa Melayu',     flag: '🇲🇾' },
  { code: 'bn', name: 'বাংলা',             flag: '🇧🇩' },
  { code: 'tl', name: 'Filipino',          flag: '🇵🇭' },
  { code: 'vi', name: 'Tiếng Việt',        flag: '🇻🇳' },
  { code: 'th', name: 'ไทย',               flag: '🇹🇭' },
  { code: 'ko', name: '한국어',            flag: '🇰🇷' },
  { code: 'ja', name: '日本語',            flag: '🇯🇵' },
  { code: 'fa', name: 'فارسی',             flag: '🇮🇷' },
  { code: 'he', name: 'עברית',             flag: '🇮🇱' },
  { code: 'sw', name: 'Kiswahili',         flag: '🇰🇪' },
  { code: 'am', name: 'አማርኛ',              flag: '🇪🇹' },
  { code: 'ne', name: 'नेपाली',             flag: '🇳🇵' },
  { code: 'si', name: 'සිංහල',             flag: '🇱🇰' },
  { code: 'ta', name: 'தமிழ்',             flag: '🇮🇳' },
  { code: 'te', name: 'తెలుగు',             flag: '🇮🇳' },
  { code: 'gu', name: 'ગુજરાતી',            flag: '🇮🇳' },
  { code: 'mr', name: 'मराठी',              flag: '🇮🇳' },
  { code: 'pt', name: 'Português',         flag: '🇧🇷' },
  { code: 'it', name: 'Italiano',          flag: '🇮🇹' },
  { code: 'nl', name: 'Nederlands',        flag: '🇳🇱' },
  { code: 'pl', name: 'Polski',            flag: '🇵🇱' },
  { code: 'ro', name: 'Română',            flag: '🇷🇴' },
  { code: 'sv', name: 'Svenska',           flag: '🇸🇪' },
  { code: 'da', name: 'Dansk',             flag: '🇩🇰' },
  { code: 'fi', name: 'Suomi',             flag: '🇫🇮' },
  { code: 'no', name: 'Norsk',             flag: '🇳🇴' },
  { code: 'af', name: 'Afrikaans',         flag: '🇿🇦' },
];

export default function ProfileScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { isAr, isRTL, textAlign, lang } = useRTL();
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { isDarkMode, toggleDarkMode } = useUIStore();
  const [showLangPicker, setShowLangPicker] = useState(false);

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.getMe(),
    enabled: isAuthenticated,
  });

  const currentUser: any = meData || user;

  const handleLogout = async () => {
    await logout();
  };

  const handleLanguageChange = async (code: string) => {
    await changeLanguage(code);
    setShowLangPicker(false);
  };

  const currentLangName = ALL_LANGUAGES.find(l => l.code === lang)?.name;

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Text style={[TYPOGRAPHY.h3, { color: '#FFF' }]}>{t('profile.title')}</Text>
        </View>
        <ScrollView>
          <View style={styles.guestBox}>
            <Ionicons name="person-circle-outline" size={80} color={colors.border} />
            <Text style={[TYPOGRAPHY.h3, { color: colors.text, marginTop: SIZES.lg, textAlign: 'center' }]}>
              {t('profile.welcome')}
            </Text>
            <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, textAlign: 'center', marginTop: SIZES.sm, marginBottom: SIZES.xl }]}>
              {t('profile.signInPrompt')}
            </Text>
            <TouchableOpacity
              style={[styles.loginBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={[TYPOGRAPHY.bodyBold, { color: '#FFF', fontSize: SIZES.bodyLg }]}>
                {t('profile.signIn')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.registerBtn, { borderColor: colors.primary }]}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={[TYPOGRAPHY.bodyBold, { color: colors.primary, fontSize: SIZES.bodyLg }]}>
                {t('profile.createAccount')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.settingsSection}>
            <SectionLabel colors={colors} textAlign={textAlign}>{t('profile.settings')}</SectionLabel>
            <SettingRow
              icon="language-outline"
              label={t('profile.language')}
              value={currentLangName}
              onPress={() => setShowLangPicker(true)}
              colors={colors}
              isRTL={isRTL}
              textAlign={textAlign}
            />
            <DarkModeRow isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} colors={colors} darkModeLabel={t('profile.darkMode')} isRTL={isRTL} textAlign={textAlign} />
          </View>
        </ScrollView>
        <LangPickerModal
          visible={showLangPicker}
          onClose={() => setShowLangPicker(false)}
          onSelect={handleLanguageChange}
          currentLang={lang}
          t={t}
          isRTL={isRTL}
          textAlign={textAlign}
          colors={colors}
        />
      </SafeAreaView>
    );
  }

  const isAgent = currentUser?.role === 'agent' || currentUser?.role === 'agency_owner';
  const isAdmin = currentUser?.role === 'admin';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={[TYPOGRAPHY.h3, { color: '#FFF' }]}>{t('profile.title')}</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[
          styles.profileCard,
          { backgroundColor: colors.surface, flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}>
          <View style={[
            styles.profileAvatar,
            {
              backgroundColor: colors.primary,
              marginRight: isRTL ? 0 : SIZES.lg,
              marginLeft: isRTL ? SIZES.lg : 0,
            },
          ]}>
            <Text style={[TYPOGRAPHY.h2, { color: '#FFF' }]}>
              {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[TYPOGRAPHY.h4, { color: colors.text, textAlign }]}>
              {currentUser?.firstName} {currentUser?.lastName}
            </Text>
            <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary, textAlign, marginTop: 2 }]}>
              {currentUser?.email}
            </Text>
            <View style={[
              styles.roleBadge,
              {
                backgroundColor: colors.primary + '15',
                alignSelf: isRTL ? 'flex-start' : 'flex-end',
              },
            ]}>
              <Text style={[TYPOGRAPHY.small, { color: colors.primary, fontWeight: '700' }]}>
                {isAdmin ? t('profile.admin') : isAgent ? t('profile.agentRole') : t('profile.member')}
              </Text>
            </View>
          </View>
        </View>

        {isAgent && (
          <View style={styles.menuSection}>
            <SectionLabel colors={colors} textAlign={textAlign}>{t('profile.agentDashboard')}</SectionLabel>
            <SettingRow icon="home-outline" label={t('profile.myListings')} onPress={() => navigation.navigate('MyListings')} colors={colors} isRTL={isRTL} textAlign={textAlign} />
            <SettingRow icon="add-circle-outline" label={t('profile.addListing')} onPress={() => navigation.navigate('AddListing')} colors={colors} isRTL={isRTL} textAlign={textAlign} />
            <SettingRow icon="mail-unread-outline" label={t('profile.inquiries')} onPress={() => navigation.navigate('Inquiries')} colors={colors} isRTL={isRTL} textAlign={textAlign} />
            <SettingRow icon="wallet-outline" label={t('profile.wallet')} onPress={() => navigation.navigate('Wallet')} colors={colors} isRTL={isRTL} textAlign={textAlign} />
            <SettingRow icon="receipt-outline" label={t('profile.commissions')} onPress={() => navigation.navigate('Commissions')} colors={colors} isRTL={isRTL} textAlign={textAlign} />
          </View>
        )}

        <View style={styles.menuSection}>
          <SectionLabel colors={colors} textAlign={textAlign}>{t('profile.account')}</SectionLabel>
          {!isAgent && (
            <SettingRow icon="mail-unread-outline" label={t('profile.myInquiries')} onPress={() => navigation.navigate('Inquiries')} colors={colors} isRTL={isRTL} textAlign={textAlign} />
          )}
          <SettingRow icon="calendar-outline" label={t('profile.myBookings')} onPress={() => navigation.navigate('Bookings')} colors={colors} isRTL={isRTL} textAlign={textAlign} />
          <SettingRow icon="notifications-outline" label={t('profile.notifications')} onPress={() => navigation.navigate('Notifications')} colors={colors} isRTL={isRTL} textAlign={textAlign} />
          <SettingRow icon="language-outline" label={t('profile.language')} value={currentLangName} onPress={() => setShowLangPicker(true)} colors={colors} isRTL={isRTL} textAlign={textAlign} />
          <DarkModeRow isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} colors={colors} darkModeLabel={t('profile.darkMode')} isRTL={isRTL} textAlign={textAlign} />
        </View>

        <View style={styles.menuSection}>
          <SectionLabel colors={colors} textAlign={textAlign}>{t('profile.support')}</SectionLabel>
          <SettingRow icon="settings-outline" label={t('profile.settings')} onPress={() => navigation.navigate('Settings')} colors={colors} isRTL={isRTL} textAlign={textAlign} />
          <SettingRow icon="help-circle-outline" label={t('profile.help')} onPress={() => navigation.navigate('Help')} colors={colors} isRTL={isRTL} textAlign={textAlign} />
          <SettingRow icon="information-circle-outline" label={t('profile.about')} onPress={() => navigation.navigate('About')} colors={colors} isRTL={isRTL} textAlign={textAlign} />
        </View>

        <TouchableOpacity
          style={[
            styles.logoutBtn,
            {
              borderColor: colors.error + '40',
              backgroundColor: colors.error + '08',
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={[TYPOGRAPHY.bodyBold, { color: colors.error, fontSize: SIZES.bodyLg }]}>
            {t('profile.signOut')}
          </Text>
        </TouchableOpacity>

        <View style={{ height: SIZES.xxxl }} />
      </ScrollView>

      <LangPickerModal
        visible={showLangPicker}
        onClose={() => setShowLangPicker(false)}
        onSelect={handleLanguageChange}
        currentLang={lang}
        t={t}
        isRTL={isRTL}
        textAlign={textAlign}
        colors={colors}
      />
    </SafeAreaView>
  );
}

function SectionLabel({ children, colors, textAlign }: any) {
  return (
    <Text style={[
      TYPOGRAPHY.small,
      {
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: SIZES.sm,
        paddingHorizontal: SIZES.sm,
        fontWeight: '700',
        textAlign,
      },
    ]}>
      {children}
    </Text>
  );
}

function SettingRow({ icon, label, value, onPress, colors, isRTL, textAlign }: any) {
  return (
    <TouchableOpacity
      style={[
        styles.settingRow,
        {
          backgroundColor: colors.surface,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
      onPress={onPress}
    >
      <View style={[styles.settingLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[
          styles.settingIcon,
          {
            backgroundColor: colors.primary + '15',
            marginRight: isRTL ? 0 : SIZES.md,
            marginLeft: isRTL ? SIZES.md : 0,
          },
        ]}>
          <Ionicons name={icon} size={20} color={colors.primary} />
        </View>
        <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, textAlign }]}>{label}</Text>
      </View>
      <View style={[styles.settingRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {value ? (
          <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary }]}>{value}</Text>
        ) : null}
        <Ionicons
          name={isRTL ? 'chevron-back' : 'chevron-forward'}
          size={16}
          color={colors.textSecondary}
        />
      </View>
    </TouchableOpacity>
  );
}

function DarkModeRow({ isDarkMode, toggleDarkMode, colors, darkModeLabel, isRTL, textAlign }: any) {
  return (
    <View style={[
      styles.settingRow,
      {
        backgroundColor: colors.surface,
        flexDirection: isRTL ? 'row-reverse' : 'row',
      },
    ]}>
      <View style={[styles.settingLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[
          styles.settingIcon,
          {
            backgroundColor: colors.primary + '15',
            marginRight: isRTL ? 0 : SIZES.md,
            marginLeft: isRTL ? SIZES.md : 0,
          },
        ]}>
          <Ionicons name="moon-outline" size={20} color={colors.primary} />
        </View>
        <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, textAlign }]}>
          {darkModeLabel}
        </Text>
      </View>
      <Switch
        value={isDarkMode}
        onValueChange={toggleDarkMode}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFF"
      />
    </View>
  );
}

function LangPickerModal({ visible, onClose, onSelect, currentLang, t, isRTL, textAlign, colors }: any) {
  const [search, setSearch] = useState('');

  const { popular, others } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = (l: LangEntry) =>
      !q || l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q);
    return {
      popular: ALL_LANGUAGES.filter(l => l.popular && matches(l)),
      others: ALL_LANGUAGES.filter(l => !l.popular && matches(l)),
    };
  }, [search]);

  const renderRow = (item: LangEntry) => {
    const active = currentLang === item.code;
    return (
      <TouchableOpacity
        key={item.code}
        style={[
          styles.langRow,
          {
            borderBottomColor: colors.divider,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
          active && { backgroundColor: colors.primary + '08' },
        ]}
        onPress={() => onSelect(item.code)}
      >
        <Text style={{ fontSize: 28 }}>{item.flag}</Text>
        <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, flex: 1, textAlign, marginHorizontal: SIZES.md }]}>
          {item.name}
        </Text>
        {active && (
          <Ionicons name="checkmark" size={20} color={colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <View style={[
          styles.modalHeader,
          {
            borderBottomColor: colors.border,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}>
          <Text style={[TYPOGRAPHY.h3, { color: colors.text }]}>
            {t('profile.chooseLanguage')}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={[
          styles.searchBox,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('profile.searchLanguage')}
            placeholderTextColor={colors.textSecondary}
            style={[
              { flex: 1, color: colors.text, fontSize: SIZES.body, textAlign, marginHorizontal: SIZES.sm },
            ]}
          />
        </View>

        <FlatList
          data={[]}
          renderItem={null as any}
          keyExtractor={(_, i) => String(i)}
          ListHeaderComponent={
            <View>
              {popular.length > 0 && (
                <>
                  <Text style={[styles.groupLabel, { color: colors.textSecondary, textAlign }]}>
                    {t('profile.popular')}
                  </Text>
                  {popular.map(renderRow)}
                </>
              )}
              {others.length > 0 && (
                <>
                  <Text style={[styles.groupLabel, { color: colors.textSecondary, textAlign, marginTop: SIZES.md }]}>
                    {t('profile.allLanguages')}
                  </Text>
                  {others.map(renderRow)}
                </>
              )}
              {popular.length === 0 && others.length === 0 && (
                <Text style={[
                  TYPOGRAPHY.body,
                  { color: colors.textSecondary, textAlign: 'center', padding: SIZES.xl },
                ]}>
                  {t('profile.noLanguageMatch')}
                </Text>
              )}
            </View>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { padding: SIZES.lg },
  guestBox: { alignItems: 'center', padding: SIZES.xxxl },
  loginBtn: { borderRadius: SIZES.borderRadiusLg, paddingVertical: SIZES.md, width: '100%', alignItems: 'center', marginBottom: SIZES.sm, ...SHADOWS.md },
  registerBtn: { borderWidth: 1.5, borderRadius: SIZES.borderRadiusLg, paddingVertical: SIZES.md, width: '100%', alignItems: 'center' },
  profileCard: { alignItems: 'center', margin: SIZES.lg, padding: SIZES.lg, borderRadius: SIZES.borderRadiusXl, ...SHADOWS.sm },
  profileAvatar: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  profileInfo: { flex: 1 },
  roleBadge: { marginTop: SIZES.sm, paddingHorizontal: SIZES.sm, paddingVertical: 3, borderRadius: SIZES.borderRadiusFull },
  menuSection: { marginHorizontal: SIZES.lg, marginBottom: SIZES.lg },
  settingsSection: { margin: SIZES.lg },
  settingRow: { alignItems: 'center', justifyContent: 'space-between', padding: SIZES.lg, borderRadius: SIZES.borderRadiusLg, marginBottom: SIZES.sm, ...SHADOWS.sm },
  settingLeft: { alignItems: 'center', flex: 1 },
  settingIcon: { width: 36, height: 36, borderRadius: SIZES.borderRadius, justifyContent: 'center', alignItems: 'center' },
  settingRight: { alignItems: 'center', gap: SIZES.sm },
  logoutBtn: { alignItems: 'center', justifyContent: 'center', gap: SIZES.sm, margin: SIZES.lg, padding: SIZES.lg, borderRadius: SIZES.borderRadiusLg, borderWidth: 1 },
  modalHeader: { justifyContent: 'space-between', alignItems: 'center', padding: SIZES.xl, borderBottomWidth: 1 },
  searchBox: { alignItems: 'center', marginHorizontal: SIZES.lg, marginTop: SIZES.md, paddingHorizontal: SIZES.md, height: 44, borderRadius: SIZES.borderRadius, borderWidth: 1 },
  langRow: { alignItems: 'center', paddingHorizontal: SIZES.lg, paddingVertical: SIZES.md, borderBottomWidth: 1 },
  groupLabel: { textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 11, fontWeight: '700', paddingHorizontal: SIZES.lg, paddingTop: SIZES.md, paddingBottom: SIZES.xs },
});
