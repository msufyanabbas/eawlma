// RegisterScreen — same hero + card layout as Login, but with a fuller form:
// name (split into first/last), email, optional phone, password w/ visibility
// toggle, confirm password, and a two-button role selector (seeker / agent).
// On success: setAuth(...); the root navigator handles the redirect.
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { COLORS, FONTS, SIZES, SHADOWS, useColors } from '@/theme';
import { authApi } from '@/api';
import { extractErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';
import type { RootStackParamList } from '@/navigation/types';

type Nav = StackNavigationProp<RootStackParamList, 'Register'>;
type Role = 'user' | 'agent';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function RegisterScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [role, setRole] = useState<Role>('user');
  const [errors, setErrors] = useState<FormErrors>({});

  const mutation = useMutation({
    mutationFn: async () =>
      authApi.register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
        phone: phone.trim() || undefined,
      }),
    onSuccess: async ({ user, accessToken }) => {
      await setAuth(user, accessToken);
    },
    onError: (err) => {
      Alert.alert(t('auth.signUp'), extractErrorMessage(err));
    },
  });

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!firstName.trim()) next.firstName = t('validation.required');
    if (!lastName.trim()) next.lastName = t('validation.required');
    if (!email.trim()) next.email = t('validation.required');
    else if (!EMAIL_RE.test(email.trim())) next.email = t('validation.emailInvalid');
    if (!password) next.password = t('validation.required');
    else if (password.length < 8) next.password = t('validation.passwordMin');
    if (!confirmPassword) next.confirmPassword = t('validation.required');
    else if (confirmPassword !== password)
      next.confirmPassword = t('validation.passwordsMismatch');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = () => {
    if (!validate()) return;
    mutation.mutate();
  };

  const RolePill = ({ value, label }: { value: Role; label: string }) => {
    const active = role === value;
    return (
      <Pressable
        onPress={() => setRole(value)}
        style={[
          styles.rolePill,
          {
            backgroundColor: active ? COLORS.primary : colors.surfaceMuted,
            borderColor: active ? COLORS.primary : colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.rolePillText,
            { color: active ? COLORS.white : colors.textSecondary },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.hero, { paddingTop: insets.top + SIZES.xxl }]}>
        <Animated.View>
          <Text style={styles.brand}>Eawlma</Text>
          <Text style={styles.brandTagline}>{t('auth.joinEawlma')}</Text>
          <Text style={styles.brandSubtitle}>{t('auth.signUp')}</Text>
        </Animated.View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[styles.card, { backgroundColor: colors.surface }, SHADOWS.md]}
          >
            {/* Role selector */}
            <View style={styles.roleRow}>
              <RolePill value="user" label={t('auth.propertySeeker')} />
              <RolePill value="agent" label={t('auth.realEstateAgent')} />
            </View>

            {/* Name row */}
            <View style={styles.nameRow}>
              <View style={styles.nameCol}>
                <TextInput
                  mode="outlined"
                  label={t('auth.firstName')}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  error={!!errors.firstName}
                  outlineColor={colors.border}
                  activeOutlineColor={COLORS.primary}
                  style={styles.input}
                />
                {errors.firstName ? (
                  <Text style={styles.fieldError}>{errors.firstName}</Text>
                ) : null}
              </View>
              <View style={styles.nameCol}>
                <TextInput
                  mode="outlined"
                  label={t('auth.lastName')}
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  error={!!errors.lastName}
                  outlineColor={colors.border}
                  activeOutlineColor={COLORS.primary}
                  style={styles.input}
                />
                {errors.lastName ? (
                  <Text style={styles.fieldError}>{errors.lastName}</Text>
                ) : null}
              </View>
            </View>

            <TextInput
              mode="outlined"
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              error={!!errors.email}
              outlineColor={colors.border}
              activeOutlineColor={COLORS.primary}
              style={styles.input}
            />
            {errors.email ? (
              <Text style={styles.fieldError}>{errors.email}</Text>
            ) : null}

            <TextInput
              mode="outlined"
              label={t('auth.phone')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              outlineColor={colors.border}
              activeOutlineColor={COLORS.primary}
              style={styles.input}
            />

            <TextInput
              mode="outlined"
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password-new"
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword((v) => !v)}
                  forceTextInputFocus={false}
                />
              }
              error={!!errors.password}
              outlineColor={colors.border}
              activeOutlineColor={COLORS.primary}
              style={styles.input}
            />
            {errors.password ? (
              <Text style={styles.fieldError}>{errors.password}</Text>
            ) : null}

            <TextInput
              mode="outlined"
              label={t('auth.confirmPassword')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              right={
                <TextInput.Icon
                  icon={showConfirm ? 'eye-off' : 'eye'}
                  onPress={() => setShowConfirm((v) => !v)}
                  forceTextInputFocus={false}
                />
              }
              error={!!errors.confirmPassword}
              outlineColor={colors.border}
              activeOutlineColor={COLORS.primary}
              style={styles.input}
            />
            {errors.confirmPassword ? (
              <Text style={styles.fieldError}>{errors.confirmPassword}</Text>
            ) : null}

            <Text style={[styles.termsText, { color: colors.textMuted }]}>
              {t('auth.agreeTerms')}
            </Text>

            <Button
              mode="contained"
              buttonColor={COLORS.primary}
              textColor={COLORS.white}
              onPress={onSubmit}
              loading={mutation.isPending}
              disabled={mutation.isPending}
              contentStyle={styles.buttonContent}
              style={styles.button}
              labelStyle={styles.buttonLabel}
            >
              {t('auth.signUp')}
            </Button>

            <View style={styles.dividerRow}>
              <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            </View>

            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                {t('auth.alreadyHaveAccount')}{' '}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.footerLink, { color: COLORS.primary }]}>
                  {t('auth.signIn')}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  hero: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.xl,
    paddingBottom: SIZES.huge,
    alignItems: 'center',
  },
  brand: {
    fontFamily: FONTS.extraBold,
    fontSize: 44,
    color: COLORS.white,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  brandTagline: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.h3,
    color: COLORS.white,
    textAlign: 'center',
    marginTop: SIZES.md,
  },
  brandSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: SIZES.xs,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.xxl,
  },
  card: {
    marginTop: -SIZES.xxl,
    borderRadius: SIZES.borderRadiusXl,
    padding: SIZES.xl,
  },
  roleRow: {
    flexDirection: 'row',
    gap: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  rolePill: {
    flex: 1,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.md,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rolePillText: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.body,
    textAlign: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  nameCol: {
    flex: 1,
  },
  input: {
    marginTop: SIZES.md,
    backgroundColor: 'transparent',
  },
  fieldError: {
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    marginTop: SIZES.xs,
    marginStart: SIZES.xs,
  },
  termsText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    marginTop: SIZES.lg,
    textAlign: 'center',
  },
  button: {
    marginTop: SIZES.lg,
    borderRadius: SIZES.borderRadius,
  },
  buttonContent: {
    paddingVertical: SIZES.xs,
  },
  buttonLabel: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.bodyLg,
  },
  dividerRow: {
    marginTop: SIZES.xl,
    marginBottom: SIZES.md,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
  },
  footerLink: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.body,
  },
});
