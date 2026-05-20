import React, { useEffect, useState } from 'react';
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
import { useUIStore } from '../../store/ui.store';
import { authApi } from '../../api';
import { changeLanguage } from '../../i18n';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../../theme';

type LoginMode = 'otp' | 'password';
type OtpStep = 'email' | 'code';

/** Six individual digit boxes backed by one hidden, full-width text input. */
function OtpInput({ value, onChange, colors }: any) {
  return (
    <View style={styles.otpContainer}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={[
            styles.otpBox,
            { backgroundColor: colors.surface, borderColor: colors.border },
            value[i] ? { borderColor: colors.primary } : null,
          ]}
        >
          <Text style={[styles.otpDigit, { color: colors.text }]}>{value[i] || ''}</Text>
        </View>
      ))}
      <TextInput
        style={styles.otpHiddenInput}
        value={value}
        onChangeText={(v: string) => onChange(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
        caretHidden
      />
    </View>
  );
}

export default function LoginScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { isAr, isRTL, textAlign, backIcon } = useRTL();
  const { t } = useTranslation();

  const [mode, setMode] = useState<LoginMode>('otp');
  const [otpStep, setOtpStep] = useState<OtpStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const { setUser, setToken } = useAuthStore();
  const loadPreferencesFromBackend = useUIStore((s) => s.loadFromBackend);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  const finishLogin = async (user: any, tokens: any) => {
    setToken(tokens.accessToken);
    setUser(user);
    const beforeLang = useUIStore.getState().language;
    await loadPreferencesFromBackend();
    const afterLang = useUIStore.getState().language;
    if (afterLang && afterLang !== beforeLang) {
      await changeLanguage(afterLang);
    }
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  const handleSendOtp = async () => {
    if (!email.trim()) {
      setError(t('auth.emailRequired'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authApi.sendOtp(email.trim());
      setOtpStep('code');
      setCountdown(60);
    } catch (e: any) {
      setError(e.response?.data?.message || t('auth.sendOtpError'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError(t('auth.invalidOtp'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await authApi.verifyOtp(email.trim(), otp.trim());
      if ('needsRegistration' in result) {
        navigation.navigate('Register', { email: result.email });
        return;
      }
      await finishLogin(result.user, result.tokens);
    } catch (e: any) {
      setError(e.response?.data?.message || t('auth.invalidOtp'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError(t('auth.fillAllFields'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { user, tokens } = await authApi.login(email.trim(), password);
      await finishLogin(user, tokens);
    } catch (e: any) {
      setError(e.response?.data?.message || t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: LoginMode) => {
    setMode(next);
    setError('');
    setOtpStep('email');
    setOtp('');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Gradient branding header */}
          <LinearGradient
            colors={['#6C63A6', '#4A3F8F'] as const}
            style={styles.header}
          >
            <TouchableOpacity
              style={[styles.backBtn, { alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name={backIcon} size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.logo}>{isAr ? 'عولمة' : 'Eawlma'}</Text>
            <Text style={styles.tagline}>{t('auth.heroSubtitle')}</Text>
          </LinearGradient>

          <View style={styles.body}>
            <Text style={[TYPOGRAPHY.h2, { color: colors.text, textAlign }]}>
              {t('auth.welcomeBack')} 👋
            </Text>
            <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, marginTop: SIZES.xs, marginBottom: SIZES.lg, textAlign }]}>
              {t('auth.loginSubtitle')}
            </Text>

            {/* Mode tabs */}
            <View style={[styles.tabs, { backgroundColor: colors.surfaceVariant }]}>
              {(['otp', 'password'] as LoginMode[]).map((m) => {
                const active = mode === m;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[styles.tab, active && { backgroundColor: colors.surface, ...SHADOWS.sm }]}
                    onPress={() => switchMode(m)}
                  >
                    <Ionicons
                      name={m === 'otp' ? 'mail-outline' : 'lock-closed-outline'}
                      size={16}
                      color={active ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[TYPOGRAPHY.bodyBold, { color: active ? colors.primary : colors.textSecondary }]}>
                      {m === 'otp' ? t('auth.emailCode') : t('auth.password')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.error + '12', borderColor: colors.error + '30' }]}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
                <Text style={[TYPOGRAPHY.body, { color: colors.error, flex: 1 }]}>{error}</Text>
              </View>
            ) : null}

            {/* OTP mode */}
            {mode === 'otp' && otpStep === 'email' && (
              <View style={styles.form}>
                <FieldLabel colors={colors} textAlign={textAlign}>{t('auth.email')}</FieldLabel>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, textAlign }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="example@email.com"
                  placeholderTextColor={colors.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <PrimaryButton colors={colors} loading={loading} onPress={handleSendOtp}>
                  {t('auth.sendCode')}
                </PrimaryButton>
              </View>
            )}

            {mode === 'otp' && otpStep === 'code' && (
              <View style={styles.form}>
                <View style={[styles.successBox, { backgroundColor: colors.success + '12', borderColor: colors.success + '30' }]}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
                  <Text style={[TYPOGRAPHY.body, { color: colors.text, flex: 1 }]}>
                    {t('auth.otpSentTo')} {email}
                  </Text>
                </View>
                <FieldLabel colors={colors} textAlign={textAlign}>{t('auth.enterCode')}</FieldLabel>
                <OtpInput value={otp} onChange={setOtp} colors={colors} />
                <PrimaryButton
                  colors={colors}
                  loading={loading}
                  disabled={otp.length !== 6}
                  onPress={handleVerifyOtp}
                >
                  {t('auth.verifyCode')}
                </PrimaryButton>
                <View style={styles.otpActions}>
                  <TouchableOpacity onPress={() => { setOtpStep('email'); setOtp(''); setError(''); }}>
                    <Text style={[TYPOGRAPHY.bodyBold, { color: colors.textSecondary }]}>
                      {t('common.back')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity disabled={countdown > 0 || loading} onPress={handleSendOtp}>
                    <Text style={[TYPOGRAPHY.bodyBold, { color: countdown > 0 ? colors.textLight : colors.primary }]}>
                      {countdown > 0 ? `${t('auth.resendIn')} ${countdown}s` : t('auth.resendCode')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Password mode */}
            {mode === 'password' && (
              <View style={styles.form}>
                <FieldLabel colors={colors} textAlign={textAlign}>{t('auth.email')}</FieldLabel>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, textAlign }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="example@email.com"
                  placeholderTextColor={colors.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <FieldLabel colors={colors} textAlign={textAlign}>{t('auth.password')}</FieldLabel>
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
                <PrimaryButton colors={colors} loading={loading} onPress={handlePasswordLogin}>
                  {t('auth.loginBtn')}
                </PrimaryButton>
              </View>
            )}

            <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('Register')}>
              <Text style={[TYPOGRAPHY.body, { color: colors.primary, fontWeight: '600' }]}>
                {t('auth.noAccount')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldLabel({ children, colors, textAlign }: any) {
  return (
    <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, marginBottom: SIZES.sm, textAlign }]}>
      {children}
    </Text>
  );
}

function PrimaryButton({ children, colors, loading, disabled, onPress }: any) {
  return (
    <TouchableOpacity
      style={[
        styles.submitBtn,
        { backgroundColor: colors.primary },
        (loading || disabled) && { opacity: 0.6 },
      ]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      {loading ? (
        <ActivityIndicator color="#FFF" />
      ) : (
        <Text style={[TYPOGRAPHY.bodyBold, { color: '#FFF', fontSize: SIZES.bodyLg }]}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  header: {
    paddingTop: SIZES.xl,
    paddingBottom: SIZES.xxxl,
    paddingHorizontal: SIZES.xl,
    borderBottomLeftRadius: SIZES.borderRadiusXl,
    borderBottomRightRadius: SIZES.borderRadiusXl,
    alignItems: 'center',
  },
  backBtn: { padding: SIZES.sm, marginBottom: SIZES.md },
  logo: { fontSize: 40, fontFamily: 'Tajawal_800ExtraBold', color: '#FFF' },
  tagline: { fontSize: SIZES.body, fontFamily: 'Tajawal_400Regular', color: 'rgba(255,255,255,0.85)', marginTop: SIZES.xs, textAlign: 'center' },
  body: { padding: SIZES.xl },
  tabs: { flexDirection: 'row', padding: SIZES.xs, borderRadius: SIZES.borderRadiusLg, marginBottom: SIZES.lg },
  tab: { flex: 1, flexDirection: 'row', gap: SIZES.xs, alignItems: 'center', justifyContent: 'center', paddingVertical: SIZES.md, borderRadius: SIZES.borderRadius },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, borderWidth: 1, borderRadius: SIZES.borderRadius, padding: SIZES.md, marginBottom: SIZES.lg },
  successBox: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, borderWidth: 1, borderRadius: SIZES.borderRadius, padding: SIZES.md },
  form: { gap: SIZES.lg },
  input: { borderWidth: 1.5, borderRadius: SIZES.borderRadiusLg, padding: SIZES.md, fontSize: SIZES.body, height: 52 },
  passwordBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: SIZES.borderRadiusLg, height: 52, paddingRight: SIZES.sm },
  eyeBtn: { padding: SIZES.sm },
  submitBtn: { borderRadius: SIZES.borderRadiusLg, height: 54, justifyContent: 'center', alignItems: 'center', ...SHADOWS.md },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', position: 'relative' },
  otpBox: { width: 48, height: 56, borderWidth: 2, borderRadius: SIZES.borderRadiusLg, justifyContent: 'center', alignItems: 'center' },
  otpDigit: { fontSize: 24, fontFamily: 'Tajawal_800ExtraBold' },
  otpHiddenInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0 },
  otpActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linkBtn: { alignItems: 'center', padding: SIZES.lg },
});
