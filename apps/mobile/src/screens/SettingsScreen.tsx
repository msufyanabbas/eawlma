import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { useAuthStore } from '../store/auth.store';
import { useUIStore } from '../store/ui.store';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../theme';
import Header from '../components/Header';

export default function SettingsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { isAr, isRTL, textAlign } = useRTL();
  const { isDarkMode, toggleDarkMode } = useUIStore();
  const { isAuthenticated, logout } = useAuthStore();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      isAr ? 'تسجيل الخروج' : 'Sign out',
      isAr ? 'هل أنت متأكد؟' : 'Are you sure?',
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isAr ? 'تسجيل الخروج' : 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.navigate('MainTabs');
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={isAr ? 'الإعدادات' : 'Settings'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: SIZES.lg, paddingBottom: SIZES.xxxl }}>
        <SectionLabel colors={colors} textAlign={textAlign}>
          {isAr ? 'المظهر' : 'Appearance'}
        </SectionLabel>
        <SwitchRow
          icon="moon-outline"
          label={isAr ? 'الوضع الليلي' : 'Dark mode'}
          value={isDarkMode}
          onValueChange={toggleDarkMode}
          colors={colors}
          isRTL={isRTL}
          textAlign={textAlign}
        />

        <SectionLabel colors={colors} textAlign={textAlign}>
          {isAr ? 'اللغة والمنطقة' : 'Language & region'}
        </SectionLabel>
        <NavRow
          icon="language-outline"
          label={isAr ? 'اللغة' : 'Language'}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' })}
          colors={colors}
          isRTL={isRTL}
          textAlign={textAlign}
        />

        <SectionLabel colors={colors} textAlign={textAlign}>
          {isAr ? 'الإشعارات' : 'Notifications'}
        </SectionLabel>
        <SwitchRow
          icon="notifications-outline"
          label={isAr ? 'إشعارات الجوال' : 'Push notifications'}
          value={pushEnabled}
          onValueChange={setPushEnabled}
          colors={colors}
          isRTL={isRTL}
          textAlign={textAlign}
        />
        <SwitchRow
          icon="mail-outline"
          label={isAr ? 'البريد الإلكتروني' : 'Email notifications'}
          value={emailEnabled}
          onValueChange={setEmailEnabled}
          colors={colors}
          isRTL={isRTL}
          textAlign={textAlign}
        />

        <SectionLabel colors={colors} textAlign={textAlign}>
          {isAr ? 'الخصوصية والحساب' : 'Privacy & account'}
        </SectionLabel>
        <NavRow
          icon="shield-checkmark-outline"
          label={isAr ? 'سياسة الخصوصية' : 'Privacy policy'}
          onPress={() => navigation.navigate('About')}
          colors={colors}
          isRTL={isRTL}
          textAlign={textAlign}
        />
        <NavRow
          icon="help-circle-outline"
          label={isAr ? 'المساعدة' : 'Help'}
          onPress={() => navigation.navigate('Help')}
          colors={colors}
          isRTL={isRTL}
          textAlign={textAlign}
        />
        <NavRow
          icon="information-circle-outline"
          label={isAr ? 'حول التطبيق' : 'About'}
          onPress={() => navigation.navigate('About')}
          colors={colors}
          isRTL={isRTL}
          textAlign={textAlign}
        />

        {isAuthenticated && (
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
              {isAr ? 'تسجيل الخروج' : 'Sign out'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
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
        marginTop: SIZES.lg,
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

function SwitchRow({ icon, label, value, onValueChange, colors, isRTL, textAlign }: any) {
  return (
    <View style={[
      styles.row,
      { backgroundColor: colors.surface, flexDirection: isRTL ? 'row-reverse' : 'row' },
    ]}>
      <View style={[styles.icon, { backgroundColor: colors.primary + '15' }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={[
        TYPOGRAPHY.bodyBold,
        { color: colors.text, flex: 1, marginHorizontal: SIZES.md, textAlign },
      ]}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFF"
      />
    </View>
  );
}

function NavRow({ icon, label, onPress, colors, isRTL, textAlign }: any) {
  return (
    <TouchableOpacity
      style={[
        styles.row,
        { backgroundColor: colors.surface, flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}
      onPress={onPress}
    >
      <View style={[styles.icon, { backgroundColor: colors.primary + '15' }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={[
        TYPOGRAPHY.bodyBold,
        { color: colors.text, flex: 1, marginHorizontal: SIZES.md, textAlign },
      ]}>
        {label}
      </Text>
      <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', padding: SIZES.lg, borderRadius: SIZES.borderRadiusLg, marginBottom: SIZES.sm, ...SHADOWS.sm },
  icon: { width: 36, height: 36, borderRadius: SIZES.borderRadius, justifyContent: 'center', alignItems: 'center' },
  logoutBtn: { alignItems: 'center', justifyContent: 'center', gap: SIZES.sm, marginTop: SIZES.xl, padding: SIZES.lg, borderRadius: SIZES.borderRadiusLg, borderWidth: 1 },
});
