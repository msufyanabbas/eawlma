import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useRTL } from '../../hooks/useRTL';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../api';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../../theme';
import { capture } from '../../lib/posthog';

export default function RegisterScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { isAr, isRTL, textAlign, backIcon } = useRTL();
  const { t } = useTranslation();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  // OTP login forwards a verified email here when no account existed yet.
  const [email, setEmail] = useState(route?.params?.email ?? '');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'user' | 'agent'>('user');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser, setToken } = useAuthStore();

  const ROLES = [
    { value: 'user' as const, icon: '🏠', label: t('auth.roleBuyer'), desc: t('auth.roleBuyerDesc') },
    { value: 'agent' as const, icon: '👔', label: t('auth.roleAgent'), desc: t('auth.roleAgentDesc') },
  ];

  const pwStrength = (() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const strengthColor =
    pwStrength <= 1 ? colors.error
    : pwStrength === 2 ? colors.warning
    : pwStrength === 3 ? colors.secondary
    : colors.success;
  const strengthLabel =
    pwStrength <= 1 ? t('auth.strengthWeak')
    : pwStrength === 2 ? t('auth.strengthFair')
    : pwStrength === 3 ? t('auth.strengthGood')
    : t('auth.strengthStrong');

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      setError(t('auth.fillAllFields'));
      return;
    }
    if (!agreed) {
      setError(t('auth.mustAgreeTerms'));
      return;
    }
    const fullPhone = `+966${phone.replace(/\D/g, '')}`;
    setLoading(true);
    setError('');
    try {
      const { user, tokens } = await authApi.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: fullPhone,
        password,
        role,
      });
      setToken(tokens.accessToken);
      setUser(user);
      capture('user_registered', { role, platform: 'mobile' });
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (e: any) {
      setError(e.response?.data?.message || t('auth.registerFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <LinearGradient colors={['#6C63A6', '#4A3F8F'] as const} style={styles.header}>
            <TouchableOpacity
              style={[styles.backBtn, { alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name={backIcon} size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.logo}>{isAr ? 'عولمة' : 'Eawlma'}</Text>
            <Text style={styles.tagline}>{t('auth.registerSubtitle')}</Text>
          </LinearGradient>

          <View style={styles.body}>
            <Text style={[TYPOGRAPHY.h2, { color: colors.text, textAlign }]}>
              {t('auth.createAccount')} ✨
            </Text>
            <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, marginTop: SIZES.xs, marginBottom: SIZES.lg, textAlign }]}>
              {t('auth.joinEawlma')}
            </Text>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.error + '12', borderColor: colors.error + '30' }]}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
                <Text style={[TYPOGRAPHY.body, { color: colors.error, flex: 1 }]}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.form}>
              <View style={styles.row}>
                <Field flex label={t('auth.firstName')} value={firstName} onChange={setFirstName}
                  placeholder={t('auth.firstNamePlaceholder')} colors={colors} textAlign={textAlign} />
                <Field flex label={t('auth.lastName')} value={lastName} onChange={setLastName}
                  placeholder={t('auth.lastNamePlaceholder')} colors={colors} textAlign={textAlign} />
              </View>

              <Field label={t('auth.email')} value={email} onChange={setEmail}
                placeholder="example@email.com" keyboard="email-address" autoCapitalize="none"
                colors={colors} textAlign={textAlign} />

              <View>
                <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, marginBottom: SIZES.sm, textAlign }]}>
                  {t('auth.phone')}
                </Text>
                <View style={[styles.phoneBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[TYPOGRAPHY.bodyBold, { color: colors.textSecondary, paddingHorizontal: SIZES.md }]}>
                    +966
                  </Text>
                  <TextInput
                    style={[styles.input, { flex: 1, borderWidth: 0, color: colors.text, textAlign }]}
                    value={phone}
                    onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 9))}
                    placeholder="5XXXXXXXX"
                    placeholderTextColor={colors.textLight}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View>
                <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, marginBottom: SIZES.sm, textAlign }]}>
                  {t('auth.password')}
                </Text>
                <View style={[styles.passwordBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.input, { flex: 1, borderWidth: 0, color: colors.text, textAlign }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textLight}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                {password.length > 0 && (
                  <View style={styles.strengthRow}>
                    <View style={[styles.strengthBar, { backgroundColor: colors.border }]}>
                      <View style={{ height: 4, backgroundColor: strengthColor, width: `${(pwStrength / 4) * 100}%` }} />
                    </View>
                    <Text style={[TYPOGRAPHY.caption, { color: strengthColor, fontWeight: '700' }]}>
                      {strengthLabel}
                    </Text>
                  </View>
                )}
              </View>

              <View>
                <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, marginBottom: SIZES.sm, textAlign }]}>
                  {t('auth.iAmA')}
                </Text>
                <View style={styles.rolesRow}>
                  {ROLES.map((r) => {
                    const active = role === r.value;
                    return (
                      <TouchableOpacity
                        key={r.value}
                        style={[
                          styles.roleCard,
                          { backgroundColor: colors.surface, borderColor: colors.border },
                          active && { borderColor: colors.primary, backgroundColor: colors.primary + '12' },
                        ]}
                        onPress={() => setRole(r.value)}
                      >
                        <Text style={styles.roleIcon}>{r.icon}</Text>
                        <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text }]}>{r.label}</Text>
                        <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
                          {r.desc}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => setAgreed(!agreed)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.checkbox,
                  { borderColor: agreed ? colors.primary : colors.border, backgroundColor: agreed ? colors.primary : 'transparent' },
                ]}>
                  {agreed && <Ionicons name="checkmark" size={14} color="#FFF" />}
                </View>
                <Text style={[TYPOGRAPHY.small, { color: colors.textSecondary, flex: 1, textAlign }]}>
                  {t('auth.agreeToTerms')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={[TYPOGRAPHY.bodyBold, { color: '#FFF', fontSize: SIZES.bodyLg }]}>
                    {t('auth.registerBtn')}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('Login')}>
                <Text style={[TYPOGRAPHY.body, { color: colors.primary, fontWeight: '600' }]}>
                  {t('auth.alreadyHaveAccount')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange, placeholder, keyboard, autoCapitalize, flex, colors, textAlign }: any) {
  return (
    <View style={flex ? { flex: 1 } : undefined}>
      <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, marginBottom: SIZES.sm, textAlign }]}>
        {label}
      </Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, textAlign }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
        keyboardType={keyboard || 'default'}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  header: {
    paddingTop: SIZES.xl,
    paddingBottom: SIZES.xxl,
    paddingHorizontal: SIZES.xl,
    borderBottomLeftRadius: SIZES.borderRadiusXl,
    borderBottomRightRadius: SIZES.borderRadiusXl,
    alignItems: 'center',
  },
  backBtn: { padding: SIZES.sm, marginBottom: SIZES.sm },
  logo: { fontSize: 40, fontFamily: 'Tajawal_800ExtraBold', color: '#FFF' },
  tagline: { fontSize: SIZES.body, fontFamily: 'Tajawal_400Regular', color: 'rgba(255,255,255,0.85)', marginTop: SIZES.xs, textAlign: 'center' },
  body: { padding: SIZES.xl },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, borderWidth: 1, borderRadius: SIZES.borderRadius, padding: SIZES.md, marginBottom: SIZES.lg },
  form: { gap: SIZES.lg },
  row: { flexDirection: 'row', gap: SIZES.md },
  input: { borderWidth: 1.5, borderRadius: SIZES.borderRadiusLg, padding: SIZES.md, fontSize: SIZES.body, height: 52 },
  phoneBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: SIZES.borderRadiusLg, height: 52 },
  passwordBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: SIZES.borderRadiusLg, height: 52, paddingRight: SIZES.sm },
  eyeBtn: { padding: SIZES.sm },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, marginTop: SIZES.sm },
  strengthBar: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  rolesRow: { flexDirection: 'row', gap: SIZES.md },
  roleCard: { flex: 1, paddingVertical: SIZES.lg, paddingHorizontal: SIZES.sm, borderRadius: SIZES.borderRadiusLg, borderWidth: 2, alignItems: 'center', gap: SIZES.xs },
  roleIcon: { fontSize: 28 },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  checkbox: { width: 22, height: 22, borderRadius: SIZES.xs, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  submitBtn: { borderRadius: SIZES.borderRadiusLg, height: 54, justifyContent: 'center', alignItems: 'center', ...SHADOWS.md },
  linkBtn: { alignItems: 'center', padding: SIZES.md },
});
