import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth.store';
import { useUIStore } from '../store/ui.store';
import { authApi } from '../api';
import { changeLanguage } from '../i18n';
import { COLORS, SIZES, SHADOWS } from '../theme';

const LANGUAGES = [
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ur', name: 'اردو', flag: '🇵🇰' },
];

export default function ProfileScreen({ navigation }: any) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { user, isAuthenticated, logout } = useAuthStore();
  const { isDarkMode, toggleDarkMode } = useUIStore();
  const [showLangPicker, setShowLangPicker] = useState(false);

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.getMe(),
    enabled: isAuthenticated,
  });

  const currentUser = meData || user;

  const handleLogout = async () => {
    await logout();
  };

  const handleLanguageChange = async (code: string) => {
    await changeLanguage(code);
    setShowLangPicker(false);
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{isAr ? 'حسابي' : 'Profile'}</Text>
        </View>
        <ScrollView>
          <View style={styles.guestBox}>
            <View style={styles.guestIcon}>
              <Ionicons name="person-circle-outline" size={80} color={COLORS.border} />
            </View>
            <Text style={styles.guestTitle}>
              {isAr ? 'مرحباً بك في عالمة' : 'Welcome to Eawlma'}
            </Text>
            <Text style={styles.guestSubtitle}>
              {isAr ? 'سجل دخولك للوصول إلى حسابك' : 'Sign in to access your account'}
            </Text>
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.loginBtnText}>
                {isAr ? 'تسجيل الدخول' : 'Sign In'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.registerBtn}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.registerBtnText}>
                {isAr ? 'إنشاء حساب جديد' : 'Create Account'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>
              {isAr ? 'الإعدادات' : 'Settings'}
            </Text>
            <SettingRow
              icon="language-outline"
              label={isAr ? 'اللغة' : 'Language'}
              value={LANGUAGES.find(l => l.code === i18n.language)?.name}
              onPress={() => setShowLangPicker(true)}
            />
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="moon-outline" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.settingLabel}>
                  {isAr ? 'الوضع الليلي' : 'Dark Mode'}
                </Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={toggleDarkMode}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor="#FFF"
              />
            </View>
          </View>
        </ScrollView>
        <LangPickerModal
          visible={showLangPicker}
          onClose={() => setShowLangPicker(false)}
          onSelect={handleLanguageChange}
          currentLang={i18n.language}
          isAr={isAr}
        />
      </SafeAreaView>
    );
  }

  const isAgent = currentUser?.role === 'agent' || currentUser?.role === 'agency_owner';
  const isAdmin = currentUser?.role === 'admin';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{isAr ? 'حسابي' : 'My Account'}</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {currentUser?.firstName} {currentUser?.lastName}
            </Text>
            <Text style={styles.profileEmail}>{currentUser?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {isAdmin ? (isAr ? 'مدير النظام' : 'Admin') :
                 isAgent ? (isAr ? 'وكيل عقاري' : 'Agent') :
                 (isAr ? 'عضو' : 'Member')}
              </Text>
            </View>
          </View>
        </View>

        {isAgent && (
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>
              {isAr ? 'لوحة الوكيل' : 'Agent Dashboard'}
            </Text>
            <SettingRow icon="home-outline" label={isAr ? 'إعلاناتي' : 'My Listings'} onPress={() => navigation.navigate('MyListings')} />
            <SettingRow icon="add-circle-outline" label={isAr ? 'إضافة إعلان' : 'Add Listing'} onPress={() => navigation.navigate('AddListing')} />
            <SettingRow icon="wallet-outline" label={isAr ? 'المحفظة' : 'Wallet'} onPress={() => navigation.navigate('Wallet')} />
            <SettingRow icon="receipt-outline" label={isAr ? 'العمولات' : 'Commissions'} onPress={() => navigation.navigate('Commissions')} />
          </View>
        )}

        {isAdmin && (
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>
              {isAr ? 'لوحة الإدارة' : 'Admin Panel'}
            </Text>
            <SettingRow icon="stats-chart-outline" label={isAr ? 'الإحصائيات' : 'Statistics'} onPress={() => {}} />
            <SettingRow icon="people-outline" label={isAr ? 'المستخدمون' : 'Users'} onPress={() => {}} />
          </View>
        )}

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>
            {isAr ? 'الحساب' : 'Account'}
          </Text>
          <SettingRow icon="notifications-outline" label={isAr ? 'الإشعارات' : 'Notifications'} onPress={() => navigation.navigate('Notifications')} />
          <SettingRow icon="language-outline" label={isAr ? 'اللغة' : 'Language'} value={LANGUAGES.find(l => l.code === i18n.language)?.name} onPress={() => setShowLangPicker(true)} />
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons name="moon-outline" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.settingLabel}>
                {isAr ? 'الوضع الليلي' : 'Dark Mode'}
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>
            {isAr ? 'تسجيل الخروج' : 'Sign Out'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: SIZES.xxxl }} />
      </ScrollView>

      <LangPickerModal
        visible={showLangPicker}
        onClose={() => setShowLangPicker(false)}
        onSelect={handleLanguageChange}
        currentLang={i18n.language}
        isAr={isAr}
      />
    </SafeAreaView>
  );
}

function SettingRow({ icon, label, value, onPress }: any) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Ionicons name={icon} size={20} color={COLORS.primary} />
        </View>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <View style={styles.settingRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

function LangPickerModal({ visible, onClose, onSelect, currentLang, isAr }: any) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {isAr ? 'اختر اللغة' : 'Choose Language'}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={LANGUAGES}
          keyExtractor={item => item.code}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.langRow, currentLang === item.code && styles.langRowActive]}
              onPress={() => onSelect(item.code)}
            >
              <Text style={styles.langFlag}>{item.flag}</Text>
              <Text style={styles.langName}>{item.name}</Text>
              {currentLang === item.code && (
                <Ionicons name="checkmark" size={20} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, padding: SIZES.lg },
  headerTitle: { fontSize: SIZES.h3, fontWeight: '800', color: '#FFF' },
  guestBox: { alignItems: 'center', padding: SIZES.xxxl },
  guestIcon: { marginBottom: SIZES.lg },
  guestTitle: { fontSize: SIZES.h3, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  guestSubtitle: { fontSize: SIZES.body, color: COLORS.textSecondary, textAlign: 'center', marginTop: SIZES.sm, marginBottom: SIZES.xl },
  loginBtn: { backgroundColor: COLORS.primary, borderRadius: SIZES.borderRadiusLg, paddingVertical: SIZES.md, width: '100%', alignItems: 'center', marginBottom: SIZES.sm, ...SHADOWS.md },
  loginBtnText: { fontSize: SIZES.bodyLg, fontWeight: '800', color: '#FFF' },
  registerBtn: { borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: SIZES.borderRadiusLg, paddingVertical: SIZES.md, width: '100%', alignItems: 'center' },
  registerBtnText: { fontSize: SIZES.bodyLg, fontWeight: '700', color: COLORS.primary },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, margin: SIZES.lg, padding: SIZES.lg, borderRadius: SIZES.borderRadiusXl, ...SHADOWS.sm },
  profileAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: SIZES.lg },
  profileAvatarText: { fontSize: SIZES.h2, fontWeight: '900', color: '#FFF' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: SIZES.subtitle, fontWeight: '800', color: COLORS.text, textAlign: 'right' },
  profileEmail: { fontSize: SIZES.small, color: COLORS.textSecondary, textAlign: 'right', marginTop: 2 },
  roleBadge: { alignSelf: 'flex-end', marginTop: SIZES.sm, backgroundColor: COLORS.primary + '15', paddingHorizontal: SIZES.sm, paddingVertical: 3, borderRadius: SIZES.borderRadiusFull },
  roleBadgeText: { fontSize: SIZES.small, color: COLORS.primary, fontWeight: '700' },
  menuSection: { marginHorizontal: SIZES.lg, marginBottom: SIZES.lg },
  sectionTitle: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SIZES.sm, paddingHorizontal: SIZES.sm },
  settingsSection: { margin: SIZES.lg },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, padding: SIZES.lg, borderRadius: SIZES.borderRadiusLg, marginBottom: SIZES.sm, ...SHADOWS.sm },
  settingLeft: { flexDirection: 'row', alignItems: 'center' },
  settingIcon: { width: 36, height: 36, borderRadius: SIZES.borderRadius, backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: SIZES.md },
  settingLabel: { fontSize: SIZES.bodyLg, fontWeight: '600', color: COLORS.text },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  settingValue: { fontSize: SIZES.body, color: COLORS.textSecondary },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SIZES.sm, margin: SIZES.lg, padding: SIZES.lg, borderRadius: SIZES.borderRadiusLg, borderWidth: 1, borderColor: COLORS.error + '40', backgroundColor: COLORS.error + '08' },
  logoutText: { fontSize: SIZES.bodyLg, fontWeight: '700', color: COLORS.error },
  modalContainer: { flex: 1, backgroundColor: COLORS.surface },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SIZES.xl, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: SIZES.h3, fontWeight: '800', color: COLORS.text },
  langRow: { flexDirection: 'row', alignItems: 'center', padding: SIZES.lg, gap: SIZES.md, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  langRowActive: { backgroundColor: COLORS.primary + '08' },
  langFlag: { fontSize: 28 },
  langName: { flex: 1, fontSize: SIZES.bodyLg, fontWeight: '600', color: COLORS.text },
});
