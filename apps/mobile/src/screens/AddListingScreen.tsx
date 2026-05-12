// AddListingScreen — 5-step wizard for creating a new listing. Each step is a
// small subcomponent inside this file; step state lives in a single `form`
// object so the final POST is a single payload + multipart images. The Next
// button is gated by per-step validation predicates so the wizard can't move
// forward with empty required fields.
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { COLORS, FONTS, SHADOWS, SIZES, useColors } from '@/theme';
import { Header } from '@/components/Header';
import { BrandSpinner } from '@/components/LoadingScreen';
import { apiClient, extractErrorMessage } from '@/api';
import type { RootStackParamList } from '@/navigation/types';

type Nav = StackNavigationProp<RootStackParamList, 'AddListing'>;

interface FormState {
  title: string;
  description: string;
  propertyType: string;
  transactionType: 'sale' | 'rent';
  city: string;
  district: string;
  lat?: number;
  lng?: number;
  price: string;
  area: string;
  images: ImagePicker.ImagePickerAsset[];
}

const PROPERTY_TYPES = ['apartment', 'villa', 'office', 'land', 'commercial', 'studio', 'townhouse'];

const STEP_COUNT = 5;

export function AddListingScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const navigation = useNavigation<Nav>();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    propertyType: 'apartment',
    transactionType: 'sale',
    city: '',
    district: '',
    price: '',
    area: '',
    images: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const submit = useMutation({
    mutationFn: async () => {
      const body = new FormData();
      body.append('title', form.title);
      body.append('description', form.description);
      body.append('propertyType', form.propertyType);
      body.append('type', form.transactionType);
      body.append('city', form.city);
      if (form.district) body.append('district', form.district);
      if (form.lat != null) body.append('lat', String(form.lat));
      if (form.lng != null) body.append('lng', String(form.lng));
      body.append('price', form.price);
      if (form.area) body.append('area', form.area);
      form.images.forEach((img, idx) => {
        body.append('images', {
          uri: img.uri,
          name: img.fileName ?? `photo-${idx}.jpg`,
          type: img.mimeType ?? 'image/jpeg',
        } as unknown as Blob);
      });
      const { data } = await apiClient.post('/listings', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      Alert.alert(t('common.confirm'), t('listing.inquirySent'));
      navigation.goBack();
    },
    onError: (err) => Alert.alert(t('common.error'), extractErrorMessage(err)),
  });

  const stepValid = useMemo(() => {
    const next: Record<string, string> = {};
    if (step === 0) {
      if (!form.title.trim()) next.title = t('wizard.validation.titleRequired');
      if (!form.description.trim()) next.description = t('wizard.validation.descriptionRequired');
    }
    if (step === 1) {
      if (!form.city.trim()) next.city = t('wizard.validation.cityRequired');
    }
    if (step === 2) {
      if (!form.price || Number(form.price) <= 0) next.price = t('wizard.validation.priceRequired');
    }
    if (step === 3) {
      if (form.images.length === 0) next.images = t('wizard.validation.imageRequired');
    }
    return next;
  }, [step, form, t]);

  const goNext = () => {
    if (Object.keys(stepValid).length > 0) {
      setErrors(stepValid);
      return;
    }
    setErrors({});
    if (step < STEP_COUNT - 1) setStep((s) => s + 1);
    else submit.mutate();
  };

  const goBack = () => {
    if (step > 0) setStep((s) => s - 1);
    else navigation.goBack();
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header
        title={t('wizard.newListing')}
        subtitle={`${step + 1} / ${STEP_COUNT}`}
      />

      {/* Step indicator */}
      <View style={styles.stepRow}>
        {Array.from({ length: STEP_COUNT }).map((_, idx) => (
          <View
            key={idx}
            style={[
              styles.stepDot,
              {
                backgroundColor: idx <= step ? COLORS.primary : colors.border,
                flex: idx === step ? 2 : 1,
              },
            ]}
          />
        ))}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View key={step}>
            {step === 0 && <BasicInfoStep form={form} update={update} errors={errors} />}
            {step === 1 && <LocationStep form={form} update={update} errors={errors} />}
            {step === 2 && <PricingStep form={form} update={update} errors={errors} />}
            {step === 3 && <PhotosStep form={form} update={update} errors={errors} />}
            {step === 4 && <ReviewStep form={form} />}
          </Animated.View>
        </ScrollView>

        {/* Bottom nav */}
        <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable style={[styles.bottomBtn, styles.btnGhost]} onPress={goBack}>
            <Text style={[styles.btnGhostText, { color: colors.text }]}>
              {step === 0 ? t('common.cancel') : t('common.previous')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.bottomBtn, styles.btnPrimary]}
            onPress={goNext}
            disabled={submit.isPending}
          >
            {submit.isPending ? (
              <BrandSpinner size={20} />
            ) : (
              <Text style={styles.btnPrimaryText}>
                {step === STEP_COUNT - 1 ? t('wizard.submit') : t('common.next')}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// Step 1: Basic info
function BasicInfoStep({
  form,
  update,
  errors,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: Record<string, string>;
}) {
  const { t } = useTranslation();
  const colors = useColors();
  return (
    <View style={styles.stepBody}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>{t('wizard.basicInfo')}</Text>

      <Field
        label={t('wizard.fields.titleEn')}
        value={form.title}
        onChange={(v) => update('title', v)}
        error={errors.title}
      />
      <Field
        label={t('wizard.fields.descriptionEn')}
        value={form.description}
        onChange={(v) => update('description', v)}
        error={errors.description}
        multiline
      />

      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
        {t('wizard.fields.propertyType')}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {PROPERTY_TYPES.map((p) => {
          const active = form.propertyType === p;
          return (
            <Pressable
              key={p}
              onPress={() => update('propertyType', p)}
              style={[
                styles.typeChip,
                {
                  backgroundColor: active ? COLORS.primary : colors.surface,
                  borderColor: active ? COLORS.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[styles.typeChipText, { color: active ? COLORS.white : colors.text }]}
              >
                {t(`propertyTypes.${p}`, { defaultValue: p })}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
        {t('wizard.fields.transactionType')}
      </Text>
      <View style={styles.segmented}>
        {(['sale', 'rent'] as const).map((tx) => {
          const active = form.transactionType === tx;
          return (
            <Pressable
              key={tx}
              onPress={() => update('transactionType', tx)}
              style={[
                styles.segmentBtn,
                {
                  backgroundColor: active ? COLORS.primary : colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={{ color: active ? COLORS.white : colors.text, fontFamily: FONTS.medium }}>
                {t(`wizard.transactionType.${tx}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Step 2: Location
function LocationStep({
  form,
  update,
  errors,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: Record<string, string>;
}) {
  const { t } = useTranslation();
  const colors = useColors();
  const [locating, setLocating] = useState(false);

  const useCurrent = async () => {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert(t('common.error'), 'Permission denied');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      update('lat', pos.coords.latitude);
      update('lng', pos.coords.longitude);
    } catch (e) {
      Alert.alert(t('common.error'), extractErrorMessage(e));
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={styles.stepBody}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>{t('wizard.location')}</Text>

      <Field
        label={t('listing.location')}
        value={form.city}
        onChange={(v) => update('city', v)}
        error={errors.city}
        placeholder="Riyadh"
      />
      <Field
        label={t('wizard.location.street')}
        value={form.district}
        onChange={(v) => update('district', v)}
        placeholder="Al Olaya"
      />

      <Pressable onPress={useCurrent} style={[styles.locateBtn, { borderColor: colors.border }]}>
        {locating ? (
          <BrandSpinner size={18} />
        ) : (
          <Ionicons name="locate-outline" size={20} color={COLORS.primary} />
        )}
        <Text style={[styles.locateText, { color: COLORS.primary }]}>
          {t('wizard.location.pinPrompt')}
        </Text>
      </Pressable>

      {form.lat != null && form.lng != null ? (
        <View style={styles.coordChip}>
          <Ionicons name="pin-outline" size={14} color={COLORS.primary} />
          <Text style={styles.coordText}>
            {form.lat.toFixed(4)}, {form.lng.toFixed(4)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// Step 3: Pricing + AI suggestion
function PricingStep({
  form,
  update,
  errors,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: Record<string, string>;
}) {
  const { t } = useTranslation();
  const colors = useColors();
  const [suggestion, setSuggestion] = useState<{
    recommended: number;
    range: { min: number; max: number };
    perSqm?: number;
    marketAvg?: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const suggest = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.post<{
        recommended: number;
        range: { min: number; max: number };
        perSqm?: number;
        marketAvg?: number;
      }>('/ai/price-suggestion', {
        propertyType: form.propertyType,
        city: form.city,
        area: Number(form.area) || undefined,
        bedrooms: undefined,
      });
      setSuggestion(data);
    } catch (e) {
      Alert.alert(t('common.error'), extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.stepBody}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>{t('wizard.fields.price')}</Text>

      <Field
        label={t('wizard.fields.price')}
        value={form.price}
        onChange={(v) => update('price', v.replace(/[^0-9.]/g, ''))}
        error={errors.price}
        keyboardType="numeric"
      />
      <Field
        label={t('wizard.fields.area')}
        value={form.area}
        onChange={(v) => update('area', v.replace(/[^0-9.]/g, ''))}
        keyboardType="numeric"
      />

      <View style={[styles.aiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.aiHeader}>
          <Ionicons name="sparkles-outline" size={18} color={COLORS.primary} />
          <Text style={[styles.aiTitle, { color: colors.text }]}>{t('ai.priceSuggestion')}</Text>
        </View>
        {suggestion ? (
          <>
            <Text style={[styles.aiPrice, { color: colors.text }]}>
              {suggestion.recommended.toLocaleString()} {t('listing.currency')}
            </Text>
            <Text style={[styles.aiRange, { color: colors.textSecondary }]}>
              {t('ai.range')}: {suggestion.range.min.toLocaleString()} –{' '}
              {suggestion.range.max.toLocaleString()}
            </Text>
            <Pressable
              onPress={() => update('price', String(suggestion.recommended))}
              style={styles.aiUseBtn}
            >
              <Text style={styles.aiUseText}>{t('ai.usePrice')}</Text>
            </Pressable>
          </>
        ) : (
          <Pressable onPress={suggest} disabled={loading} style={styles.aiSuggestBtn}>
            {loading ? (
              <BrandSpinner size={18} />
            ) : (
              <Text style={styles.aiSuggestText}>{t('ai.priceSuggestion')}</Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

// Step 4: Photos
function PhotosStep({
  form,
  update,
  errors,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: Record<string, string>;
}) {
  const { t } = useTranslation();
  const colors = useColors();

  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      update('images', [...form.images, ...result.assets]);
    }
  };

  const remove = (idx: number) => {
    update(
      'images',
      form.images.filter((_, i) => i !== idx),
    );
  };

  return (
    <View style={styles.stepBody}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        {t('wizard.mediaStep.images')}
      </Text>

      <Pressable
        onPress={pick}
        style={[
          styles.pickerBtn,
          {
            borderColor: errors.images ? COLORS.error : colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <Ionicons name="cloud-upload-outline" size={28} color={COLORS.primary} />
        <Text style={[styles.pickerHint, { color: colors.textSecondary }]}>
          {t('wizard.mediaStep.imageDropHint')}
        </Text>
      </Pressable>
      {errors.images ? <Text style={styles.errorText}>{errors.images}</Text> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
        {form.images.map((img, idx) => (
          <View key={`${img.uri}-${idx}`} style={styles.thumbWrap}>
            <Image source={{ uri: img.uri }} style={styles.thumb} contentFit="cover" />
            {idx === 0 ? (
              <View style={styles.coverBadge}>
                <Ionicons name="star" size={10} color={COLORS.white} />
                <Text style={styles.coverText}>{t('wizard.mediaStep.cover')}</Text>
              </View>
            ) : null}
            <Pressable style={styles.thumbRemove} onPress={() => remove(idx)} hitSlop={6}>
              <Ionicons name="close" size={14} color={COLORS.white} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// Step 5: Review
function ReviewStep({ form }: { form: FormState }) {
  const { t } = useTranslation();
  const colors = useColors();
  return (
    <View style={styles.stepBody}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>{t('wizard.review')}</Text>
      <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SummaryRow label={t('wizard.review.titleLabel')} value={form.title} />
        <SummaryRow
          label={t('wizard.fields.propertyType')}
          value={t(`propertyTypes.${form.propertyType}`, { defaultValue: form.propertyType })}
        />
        <SummaryRow
          label={t('wizard.review.type')}
          value={t(`wizard.transactionType.${form.transactionType}`)}
        />
        <SummaryRow
          label={t('wizard.review.cityDistrict')}
          value={`${form.city}${form.district ? `, ${form.district}` : ''}`}
        />
        {form.lat != null && (
          <SummaryRow
            label={t('wizard.review.coordinates')}
            value={`${form.lat?.toFixed(4)}, ${form.lng?.toFixed(4)}`}
          />
        )}
        <SummaryRow
          label={t('wizard.fields.price')}
          value={`${Number(form.price).toLocaleString()} ${t('listing.currency')}`}
        />
        {form.area ? <SummaryRow label={t('wizard.fields.area')} value={`${form.area} m²`} /> : null}
        <SummaryRow label={t('wizard.mediaStep.images')} value={`${form.images.length}`} />
      </View>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: colors.text }]} numberOfLines={2}>
        {value || '—'}
      </Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  multiline,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  multiline?: boolean;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address';
}) {
  const colors = useColors();
  return (
    <View style={{ marginTop: SIZES.md }}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: error ? COLORS.error : colors.border,
          },
        ]}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stepRow: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
  },
  stepDot: { height: 4, borderRadius: 2 },
  scroll: { padding: SIZES.lg, paddingBottom: SIZES.huge },
  stepBody: { gap: SIZES.sm },
  stepTitle: { fontFamily: FONTS.bold, fontSize: SIZES.h3, marginBottom: SIZES.sm },
  fieldLabel: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.small,
    marginTop: SIZES.md,
    marginBottom: SIZES.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: SIZES.borderRadius,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
  },
  inputMultiline: { minHeight: 100, textAlignVertical: 'top' },
  errorText: {
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    marginTop: SIZES.xs,
  },
  chipRow: { gap: SIZES.sm, paddingVertical: SIZES.xs },
  typeChip: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.borderRadiusFull,
    borderWidth: 1,
  },
  typeChipText: { fontFamily: FONTS.medium, fontSize: SIZES.small },
  segmented: { flexDirection: 'row', gap: SIZES.sm, marginTop: SIZES.xs },
  segmentBtn: {
    flex: 1,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    alignItems: 'center',
  },
  locateBtn: {
    marginTop: SIZES.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
    borderWidth: 1,
    borderRadius: SIZES.borderRadius,
    justifyContent: 'center',
  },
  locateText: { fontFamily: FONTS.bold, fontSize: SIZES.body },
  coordChip: {
    marginTop: SIZES.md,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.borderRadiusFull,
    backgroundColor: '#EEEAFF',
  },
  coordText: { fontFamily: FONTS.medium, fontSize: SIZES.small, color: COLORS.primary },
  aiCard: {
    marginTop: SIZES.lg,
    padding: SIZES.lg,
    borderRadius: SIZES.borderRadiusLg,
    borderWidth: 1,
  },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, marginBottom: SIZES.sm },
  aiTitle: { fontFamily: FONTS.bold, fontSize: SIZES.bodyLg },
  aiPrice: { fontFamily: FONTS.bold, fontSize: SIZES.h3, marginTop: SIZES.xs },
  aiRange: { fontFamily: FONTS.regular, fontSize: SIZES.small, marginTop: 2 },
  aiUseBtn: {
    marginTop: SIZES.md,
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadius,
    alignSelf: 'flex-start',
  },
  aiUseText: { fontFamily: FONTS.bold, fontSize: SIZES.small, color: COLORS.white },
  aiSuggestBtn: {
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadius,
    alignItems: 'center',
    marginTop: SIZES.sm,
  },
  aiSuggestText: { fontFamily: FONTS.bold, fontSize: SIZES.body, color: COLORS.white },
  pickerBtn: {
    marginTop: SIZES.md,
    paddingVertical: SIZES.xxl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: SIZES.borderRadiusLg,
    alignItems: 'center',
    gap: SIZES.sm,
  },
  pickerHint: { fontFamily: FONTS.regular, fontSize: SIZES.small, textAlign: 'center', paddingHorizontal: SIZES.lg },
  thumbRow: { gap: SIZES.sm, paddingVertical: SIZES.md },
  thumbWrap: { width: 100, height: 100, borderRadius: SIZES.borderRadius, overflow: 'hidden', position: 'relative' },
  thumb: { width: '100%', height: '100%' },
  coverBadge: {
    position: 'absolute',
    bottom: 4,
    start: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: SIZES.borderRadiusFull,
    backgroundColor: COLORS.primary,
  },
  coverText: { fontFamily: FONTS.bold, fontSize: 9, color: COLORS.white },
  thumbRemove: {
    position: 'absolute',
    top: 4,
    end: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: { padding: SIZES.lg, borderRadius: SIZES.borderRadiusLg, borderWidth: 1, gap: SIZES.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: SIZES.md },
  summaryLabel: { fontFamily: FONTS.regular, fontSize: SIZES.small, flex: 1 },
  summaryValue: { fontFamily: FONTS.bold, fontSize: SIZES.body, flex: 1, textAlign: 'right' },
  bottomBar: {
    flexDirection: 'row',
    padding: SIZES.md,
    gap: SIZES.md,
    borderTopWidth: 1,
  },
  bottomBtn: {
    flex: 1,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhost: { backgroundColor: 'transparent' },
  btnGhostText: { fontFamily: FONTS.medium, fontSize: SIZES.body },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnPrimaryText: { fontFamily: FONTS.bold, fontSize: SIZES.body, color: COLORS.white },
});
