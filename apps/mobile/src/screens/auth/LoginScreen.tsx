import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../api';
import { COLORS, SIZES, SHADOWS } from '../../theme';

export default function LoginScreen({ navigation }: any) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser, setToken } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError(isAr ? 'يرجى تعبئة جميع الحقول' : 'Please fill all fields');
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
        e.response?.data?.message ||
        (isAr ? 'بيانات الدخول غير صحيحة' : 'Invalid credentials')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons
              name={isAr ? 'arrow-forward' : 'arrow-back'}
              size={24}
              color={COLORS.text}
            />
          </TouchableOpacity>

          <View style={styles.logoSection}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>عالمة</Text>
            </View>
            <Text style={styles.title}>
              {isAr ? 'تسجيل الدخول' : 'Sign In'}
            </Text>
            <Text style={styles.subtitle}>
              {isAr ? 'أهلاً بعودتك!' : 'Welcome back!'}
            </Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>
                {isAr ? 'البريد الإلكتروني' : 'Email'}
              </Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="example@email.com"
                placeholderTextColor={COLORS.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                textAlign={isAr ? 'right' : 'left'}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>
                {isAr ? 'كلمة المرور' : 'Password'}
              </Text>
              <View style={styles.passwordBox}>
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textLight}
                  secureTextEntry={!showPassword}
                  textAlign={isAr ? 'right' : 'left'}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {isAr ? 'دخول' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.linkBtnText}>
                {isAr
                  ? 'ليس لديك حساب؟ سجل الآن'
                  : "Don't have an account? Register"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, padding: SIZES.xl },
  backBtn: { alignSelf: 'flex-start', padding: SIZES.sm, marginBottom: SIZES.lg },
  logoSection: { alignItems: 'center', marginBottom: SIZES.xxxl },
  logo: { width: 80, height: 80, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: SIZES.lg, ...SHADOWS.lg },
  logoText: { fontSize: SIZES.h2, fontWeight: '900', color: '#FFF' },
  title: { fontSize: SIZES.h2, fontWeight: '900', color: COLORS.text },
  subtitle: { fontSize: SIZES.body, color: COLORS.textSecondary, marginTop: SIZES.sm },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, backgroundColor: COLORS.error + '12', borderWidth: 1, borderColor: COLORS.error + '30', borderRadius: SIZES.borderRadius, padding: SIZES.md, marginBottom: SIZES.lg },
  errorText: { flex: 1, fontSize: SIZES.body, color: COLORS.error },
  form: { gap: SIZES.lg },
  field: {},
  fieldLabel: { fontSize: SIZES.body, fontWeight: '700', color: COLORS.text, marginBottom: SIZES.sm, textAlign: 'right' },
  input: { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: SIZES.borderRadiusLg, padding: SIZES.md, fontSize: SIZES.body, color: COLORS.text, height: 52 },
  passwordBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: SIZES.borderRadiusLg, height: 52, paddingRight: SIZES.sm },
  eyeBtn: { padding: SIZES.sm },
  submitBtn: { backgroundColor: COLORS.primary, borderRadius: SIZES.borderRadiusLg, height: 54, justifyContent: 'center', alignItems: 'center', marginTop: SIZES.sm, ...SHADOWS.md },
  submitBtnText: { fontSize: SIZES.bodyLg, fontWeight: '800', color: '#FFF' },
  linkBtn: { alignItems: 'center', padding: SIZES.md },
  linkBtnText: { fontSize: SIZES.body, color: COLORS.primary, fontWeight: '600' },
});
