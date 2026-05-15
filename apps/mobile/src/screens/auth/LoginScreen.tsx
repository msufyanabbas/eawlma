import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useRTL } from '../../hooks/useRTL';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../api';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../../theme';

export default function LoginScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { isAr, isRTL, textAlign, backIcon } = useRTL();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser, setToken } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError(t('auth.fillAllFields'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { user, tokens } = await authApi.login(email.trim(), password);
      setToken(tokens.accessToken);
      setUser(user);
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (e: any) {
      setError(
        e.response?.data?.message || t('auth.invalidCredentials'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            style={[styles.backBtn, { alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name={backIcon} size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.logoSection}>
            <View style={[styles.logo, { backgroundColor: colors.primary }]}>
              <Text style={[TYPOGRAPHY.h2, { color: '#FFF' }]}>{isAr ? 'عالمة' : 'Eawlma'}</Text>
            </View>
            <Text style={[TYPOGRAPHY.h2, { color: colors.text }]}>
              {t('auth.login')}
            </Text>
            <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, marginTop: SIZES.sm }]}>
              {t('auth.welcomeBack')}
            </Text>
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.error + '12', borderColor: colors.error + '30' }]}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
              <Text style={[TYPOGRAPHY.body, { color: colors.error, flex: 1 }]}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View>
              <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, marginBottom: SIZES.sm, textAlign }]}>
                {t('auth.email')}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, textAlign }]}
                value={email}
                onChangeText={setEmail}
                placeholder="example@email.com"
                placeholderTextColor={colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
              />
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
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={[TYPOGRAPHY.bodyBold, { color: '#FFF', fontSize: SIZES.bodyLg }]}>
                  {t('auth.loginBtn')}
                </Text>
              )}
            </TouchableOpacity>

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

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: SIZES.xl },
  backBtn: { alignSelf: 'flex-start', padding: SIZES.sm, marginBottom: SIZES.lg },
  logoSection: { alignItems: 'center', marginBottom: SIZES.xxxl },
  logo: { width: 80, height: 80, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: SIZES.lg, ...SHADOWS.lg },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, borderWidth: 1, borderRadius: SIZES.borderRadius, padding: SIZES.md, marginBottom: SIZES.lg },
  form: { gap: SIZES.lg },
  input: { borderWidth: 1.5, borderRadius: SIZES.borderRadiusLg, padding: SIZES.md, fontSize: SIZES.body, height: 52 },
  passwordBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: SIZES.borderRadiusLg, height: 52, paddingRight: SIZES.sm },
  eyeBtn: { padding: SIZES.sm },
  submitBtn: { borderRadius: SIZES.borderRadiusLg, height: 54, justifyContent: 'center', alignItems: 'center', marginTop: SIZES.sm, ...SHADOWS.md },
  linkBtn: { alignItems: 'center', padding: SIZES.md },
});
