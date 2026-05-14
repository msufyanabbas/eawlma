import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useRTL } from '../../hooks/useRTL';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../api';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../../theme';

const ROLES = [
  { value: 'user', labelAr: 'مستخدم', labelEn: 'Buyer' },
  { value: 'agent', labelAr: 'وكيل عقاري', labelEn: 'Agent' },
];

export default function RegisterScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { isAr, textAlign, backIcon } = useRTL();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser, setToken } = useAuthStore();

  const pwStrength = (() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const strengthColor =
    pwStrength <= 1 ? colors.error : pwStrength === 2 ? colors.warning : pwStrength === 3 ? colors.secondary : colors.success;
  const strengthLabel =
    pwStrength <= 1 ? (isAr ? 'ضعيفة' : 'Weak')
    : pwStrength === 2 ? (isAr ? 'متوسطة' : 'Fair')
    : pwStrength === 3 ? (isAr ? 'جيدة' : 'Good')
    : (isAr ? 'قوية' : 'Strong');

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      setError(isAr ? 'يرجى تعبئة جميع الحقول' : 'Please fill all required fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { user, tokens } = await authApi.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
        role,
      });
      setToken(tokens.accessToken);
      setUser(user);
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (e: any) {
      setError(
        e.response?.data?.message ||
        (isAr ? 'فشل التسجيل، حاول مرة أخرى' : 'Registration failed, try again')
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
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name={backIcon} size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.logoSection}>
            <View style={[styles.logo, { backgroundColor: colors.primary }]}>
              <Text style={[TYPOGRAPHY.h2, { color: '#FFF' }]}>عالمة</Text>
            </View>
            <Text style={[TYPOGRAPHY.h2, { color: colors.text }]}>
              {isAr ? 'إنشاء حساب' : 'Create Account'}
            </Text>
            <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary, marginTop: SIZES.sm }]}>
              {isAr ? 'أهلاً بك في عالمة' : 'Join Eawlma today'}
            </Text>
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.error + '12', borderColor: colors.error + '30' }]}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
              <Text style={[TYPOGRAPHY.body, { color: colors.error, flex: 1 }]}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.row}>
              <Field
                flex
                label={isAr ? 'الاسم الأول' : 'First Name'}
                value={firstName}
                onChange={setFirstName}
                placeholder={isAr ? 'أحمد' : 'John'}
                colors={colors}
                textAlign={textAlign}
              />
              <Field
                flex
                label={isAr ? 'اسم العائلة' : 'Last Name'}
                value={lastName}
                onChange={setLastName}
                placeholder={isAr ? 'الأحمد' : 'Doe'}
                colors={colors}
                textAlign={textAlign}
              />
            </View>

            <Field
              label={isAr ? 'البريد الإلكتروني' : 'Email'}
              value={email}
              onChange={setEmail}
              placeholder="example@email.com"
              keyboard="email-address"
              autoCapitalize="none"
              colors={colors}
              textAlign={textAlign}
            />

            <Field
              label={isAr ? 'رقم الجوال' : 'Phone'}
              value={phone}
              onChange={setPhone}
              placeholder="+966 5X XXX XXXX"
              keyboard="phone-pad"
              colors={colors}
              textAlign={textAlign}
            />

            <View>
              <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, marginBottom: SIZES.sm, textAlign }]}>
                {isAr ? 'كلمة المرور' : 'Password'}
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
                {isAr ? 'نوع الحساب' : 'Account Type'}
              </Text>
              <View style={styles.rolesRow}>
                {ROLES.map(r => {
                  const active = role === r.value;
                  return (
                    <TouchableOpacity
                      key={r.value}
                      style={[
                        styles.roleChip,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        active && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setRole(r.value)}
                    >
                      <Text style={[TYPOGRAPHY.bodyBold, { color: active ? '#FFF' : colors.text }]}>
                        {isAr ? r.labelAr : r.labelEn}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={[TYPOGRAPHY.bodyBold, { color: '#FFF', fontSize: SIZES.bodyLg }]}>
                  {isAr ? 'إنشاء الحساب' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('Login')}>
              <Text style={[TYPOGRAPHY.body, { color: colors.primary, fontWeight: '600' }]}>
                {isAr ? 'لديك حساب بالفعل؟ سجل الدخول' : 'Already have an account? Sign in'}
              </Text>
            </TouchableOpacity>
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
  scroll: { flexGrow: 1, padding: SIZES.xl },
  backBtn: { alignSelf: 'flex-start', padding: SIZES.sm, marginBottom: SIZES.lg },
  logoSection: { alignItems: 'center', marginBottom: SIZES.xl },
  logo: { width: 80, height: 80, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: SIZES.lg, ...SHADOWS.lg },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, borderWidth: 1, borderRadius: SIZES.borderRadius, padding: SIZES.md, marginBottom: SIZES.lg },
  form: { gap: SIZES.lg },
  row: { flexDirection: 'row', gap: SIZES.md },
  input: { borderWidth: 1.5, borderRadius: SIZES.borderRadiusLg, padding: SIZES.md, fontSize: SIZES.body, height: 52 },
  passwordBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: SIZES.borderRadiusLg, height: 52, paddingRight: SIZES.sm },
  eyeBtn: { padding: SIZES.sm },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, marginTop: SIZES.sm },
  strengthBar: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  rolesRow: { flexDirection: 'row', gap: SIZES.sm },
  roleChip: { flex: 1, paddingVertical: SIZES.md, borderRadius: SIZES.borderRadiusLg, borderWidth: 1.5, alignItems: 'center' },
  submitBtn: { borderRadius: SIZES.borderRadiusLg, height: 54, justifyContent: 'center', alignItems: 'center', marginTop: SIZES.sm, ...SHADOWS.md },
  linkBtn: { alignItems: 'center', padding: SIZES.md },
});
