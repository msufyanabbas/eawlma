// LoginScreen — purple hero banner + white rounded card with email/password
// form. On success we call authStore.setAuth(...); the root navigator swaps
// stacks automatically so we never push/replace 'Main' ourselves.
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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

type Nav = StackNavigationProp<RootStackParamList, 'Login'>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const mutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email.trim(), password),
    onSuccess: async ({ user, accessToken }) => {
      await setAuth(user, accessToken);
    },
    onError: (err) => {
      Alert.alert(t('auth.signIn'), extractErrorMessage(err));
    },
  });

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!email.trim()) next.email = t('validation.required');
    else if (!EMAIL_RE.test(email.trim())) next.email = t('validation.emailInvalid');
    if (!password) next.password = t('validation.required');
    else if (password.length < 8) next.password = t('validation.passwordMin');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = () => {
    if (!validate()) return;
    mutation.mutate({ email, password });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Purple hero banner (custom, not the shared Header — we want a tall logo block) */}
      <View style={[styles.hero, { paddingTop: insets.top + SIZES.xxl }]}>
        <Animated.View>
          <Text style={styles.brand}>Eawlma</Text>
          <Text style={styles.brandTagline}>{t('auth.welcomeBack')}</Text>
          <Text style={styles.brandSubtitle}>{t('auth.signInToContinue')}</Text>
        </Animated.View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[styles.card, { backgroundColor: colors.surface }, SHADOWS.md]}
          >
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
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
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

            <TouchableOpacity
              style={styles.forgotRow}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.forgotText, { color: COLORS.primary }]}>
                {t('auth.forgotPassword')}
              </Text>
            </TouchableOpacity>

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
              {t('auth.signIn')}
            </Button>

            <View style={styles.dividerRow}>
              <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            </View>

            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                {t('auth.noAccount')}{' '}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.footerLink, { color: COLORS.primary }]}>
                  {t('auth.signUp')}
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
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: SIZES.md,
  },
  forgotText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
  },
  button: {
    marginTop: SIZES.xl,
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
