import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { listingsApi } from '../api';
import { SIZES, SHADOWS } from '../theme';

const STEPS = [
  { titleAr: 'نوع العقار', titleEn: 'Property Type' },
  { titleAr: 'التفاصيل', titleEn: 'Details' },
  { titleAr: 'الموقع', titleEn: 'Location' },
  { titleAr: 'المواصفات', titleEn: 'Specs' },
  { titleAr: 'المراجعة', titleEn: 'Review' },
];

const TRANSACTION_TYPES = [
  { labelAr: 'للبيع', labelEn: 'For Sale', value: 'sale' },
  { labelAr: 'للإيجار', labelEn: 'For Rent', value: 'rent' },
];

const PROPERTY_TYPES = [
  { labelAr: 'شقة', labelEn: 'Apartment', value: 'apartment', icon: '🏢' },
  { labelAr: 'فيلا', labelEn: 'Villa', value: 'villa', icon: '🏡' },
  { labelAr: 'أرض', labelEn: 'Land', value: 'land', icon: '🏗️' },
  { labelAr: 'شاليه', labelEn: 'Chalet', value: 'chalet', icon: '🏖️' },
  { labelAr: 'مزرعة', labelEn: 'Farm', value: 'farm', icon: '🌾' },
  { labelAr: 'استراحة', labelEn: 'Rest House', value: 'rest_house', icon: '🛖' },
  { labelAr: 'مكتب', labelEn: 'Office', value: 'office', icon: '🏬' },
  { labelAr: 'محل', labelEn: 'Shop', value: 'shop', icon: '🏪' },
];

const CITIES = ['الرياض', 'جدة', 'الدمام', 'مكة المكرمة', 'المدينة المنورة', 'الطائف', 'تبوك', 'أبها'];

export default function AddListingScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { isAr, textAlign, backIcon } = useRTL();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    transactionType: 'sale',
    propertyType: 'apartment',
    titleAr: '',
    titleEn: '',
    price: '',
    area: '',
    city: '',
    district: '',
    bedrooms: '',
    bathrooms: '',
    descriptionAr: '',
    descriptionEn: '',
  });

  const update = (key: string, value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  const goNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
  };

  const goBack = () => {
    if (step > 0) setStep(s => s - 1);
    else navigation.goBack();
  };

  const handleSubmit = async () => {
    if (!form.titleAr || !form.price || !form.city) {
      Alert.alert(
        isAr ? 'خطأ' : 'Error',
        isAr ? 'يرجى تعبئة الحقول المطلوبة' : 'Please fill required fields'
      );
      return;
    }
    setLoading(true);
    try {
      await listingsApi.create({
        ...form,
        price: Number(form.price),
        area: Number(form.area),
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        lat: 24.7136,
        lng: 46.6753,
      });
      Alert.alert(
        isAr ? 'تم' : 'Success',
        isAr ? 'تم إضافة الإعلان بنجاح' : 'Listing added successfully',
        [{ text: isAr ? 'موافق' : 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      Alert.alert(
        isAr ? 'خطأ' : 'Error',
        e.response?.data?.message || (isAr ? 'حدث خطأ' : 'Something went wrong')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name={backIcon as any} size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isAr ? 'إضافة إعلان' : 'Add Listing'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.progressContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View style={[
            styles.progressFill,
            {
              backgroundColor: colors.primary,
              width: `${((step + 1) / STEPS.length) * 100}%` as any,
            }
          ]} />
        </View>
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
          {isAr
            ? `الخطوة ${step + 1} من ${STEPS.length}: ${STEPS[step].titleAr}`
            : `Step ${step + 1} of ${STEPS.length}: ${STEPS[step].titleEn}`}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {step === 0 && (
          <View>
            <Text style={[styles.stepTitle, { color: colors.text, textAlign }]}>
              {isAr ? 'نوع المعاملة' : 'Transaction Type'}
            </Text>
            <View style={styles.typeRow}>
              {TRANSACTION_TYPES.map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[
                    styles.typeBtn,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    form.transactionType === t.value && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primary + '15',
                    }
                  ]}
                  onPress={() => update('transactionType', t.value)}
                >
                  <Text style={[
                    styles.typeBtnText,
                    { color: colors.textSecondary },
                    form.transactionType === t.value && { color: colors.primary }
                  ]}>
                    {isAr ? t.labelAr : t.labelEn}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.stepTitle, { color: colors.text, textAlign, marginTop: SIZES.xl }]}>
              {isAr ? 'نوع العقار' : 'Property Type'}
            </Text>
            <View style={styles.propTypeGrid}>
              {PROPERTY_TYPES.map(p => (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.propTypeBtn,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    form.propertyType === p.value && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primary + '15',
                    }
                  ]}
                  onPress={() => update('propertyType', p.value)}
                >
                  <Text style={styles.propTypeIcon}>{p.icon}</Text>
                  <Text style={[
                    styles.propTypeText,
                    { color: colors.textSecondary },
                    form.propertyType === p.value && { color: colors.primary }
                  ]}>
                    {isAr ? p.labelAr : p.labelEn}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={{ gap: SIZES.lg }}>
            <FormField
              label={isAr ? 'العنوان بالعربية *' : 'Arabic Title *'}
              value={form.titleAr}
              onChangeText={(v: string) => update('titleAr', v)}
              placeholder="مثال: شقة فاخرة في الرياض"
              colors={colors}
              textAlign="right"
            />
            <FormField
              label={isAr ? 'العنوان بالإنجليزية' : 'English Title'}
              value={form.titleEn}
              onChangeText={(v: string) => update('titleEn', v)}
              placeholder="e.g. Luxury apartment in Riyadh"
              colors={colors}
              textAlign="left"
            />
            <FormField
              label={isAr ? 'السعر (ريال) *' : 'Price (SAR) *'}
              value={form.price}
              onChangeText={(v: string) => update('price', v)}
              placeholder="750000"
              keyboardType="numeric"
              colors={colors}
              textAlign={textAlign}
            />
            <FormField
              label={isAr ? 'المساحة (م²)' : 'Area (m²)'}
              value={form.area}
              onChangeText={(v: string) => update('area', v)}
              placeholder="150"
              keyboardType="numeric"
              colors={colors}
              textAlign={textAlign}
            />
            <FormField
              label={isAr ? 'الوصف بالعربية' : 'Arabic Description'}
              value={form.descriptionAr}
              onChangeText={(v: string) => update('descriptionAr', v)}
              placeholder="وصف تفصيلي للعقار..."
              multiline
              colors={colors}
              textAlign="right"
            />
          </View>
        )}

        {step === 2 && (
          <View style={{ gap: SIZES.lg }}>
            <Text style={[styles.stepTitle, { color: colors.text, textAlign }]}>
              {isAr ? 'المدينة *' : 'City *'}
            </Text>
            <View style={styles.citiesGrid}>
              {CITIES.map(city => (
                <TouchableOpacity
                  key={city}
                  style={[
                    styles.cityBtn,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    form.city === city && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primary + '15',
                    }
                  ]}
                  onPress={() => update('city', city)}
                >
                  <Text style={[
                    styles.cityBtnText,
                    { color: colors.text },
                    form.city === city && { color: colors.primary, fontWeight: '700' }
                  ]}>
                    {city}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <FormField
              label={isAr ? 'الحي *' : 'District *'}
              value={form.district}
              onChangeText={(v: string) => update('district', v)}
              placeholder={isAr ? 'مثال: العليا' : 'e.g. Al Olaya'}
              colors={colors}
              textAlign={textAlign}
            />
          </View>
        )}

        {step === 3 && (
          <View style={{ gap: SIZES.lg }}>
            <View style={styles.specsRow}>
              <View style={{ flex: 1 }}>
                <FormField
                  label={isAr ? 'غرف النوم' : 'Bedrooms'}
                  value={form.bedrooms}
                  onChangeText={(v: string) => update('bedrooms', v)}
                  placeholder="3"
                  keyboardType="numeric"
                  colors={colors}
                  textAlign="center"
                />
              </View>
              <View style={{ flex: 1 }}>
                <FormField
                  label={isAr ? 'دورات المياه' : 'Bathrooms'}
                  value={form.bathrooms}
                  onChangeText={(v: string) => update('bathrooms', v)}
                  placeholder="2"
                  keyboardType="numeric"
                  colors={colors}
                  textAlign="center"
                />
              </View>
            </View>
          </View>
        )}

        {step === 4 && (
          <View style={[styles.reviewCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.reviewTitle, { color: colors.text }]}>
              {isAr ? 'مراجعة الإعلان' : 'Review Listing'}
            </Text>
            {[
              { label: isAr ? 'نوع المعاملة' : 'Transaction', value: form.transactionType },
              { label: isAr ? 'نوع العقار' : 'Property Type', value: form.propertyType },
              { label: isAr ? 'العنوان' : 'Title', value: form.titleAr || form.titleEn },
              { label: isAr ? 'السعر' : 'Price', value: form.price ? `${Number(form.price).toLocaleString()} ر.س` : '-' },
              { label: isAr ? 'المدينة' : 'City', value: form.city },
              { label: isAr ? 'الحي' : 'District', value: form.district },
              { label: isAr ? 'الغرف' : 'Bedrooms', value: form.bedrooms },
            ].map(row => (
              <View key={row.label} style={[styles.reviewRow, { borderBottomColor: colors.divider }]}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>{row.label}</Text>
                <Text style={[styles.reviewValue, { color: colors.text }]}>{row.value || '-'}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, {
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
      }]}>
        {step > 0 && (
          <TouchableOpacity
            style={[styles.prevBtn, { borderColor: colors.primary }]}
            onPress={goBack}
          >
            <Text style={[styles.prevBtnText, { color: colors.primary }]}>
              {isAr ? 'السابق' : 'Back'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: colors.primary }]}
          onPress={step === STEPS.length - 1 ? handleSubmit : goNext}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.nextBtnText}>
              {step === STEPS.length - 1
                ? (isAr ? 'نشر الإعلان' : 'Publish Listing')
                : (isAr ? 'التالي' : 'Next')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function FormField({
  label, value, onChangeText, placeholder,
  keyboardType, multiline, colors, textAlign,
}: any) {
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: colors.text, textAlign }]}>
        {label}
      </Text>
      <TextInput
        style={[
          styles.fieldInput,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.text,
            textAlign,
            height: multiline ? 100 : 52,
            textAlignVertical: multiline ? 'top' : 'center',
          }
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SIZES.lg, paddingTop: SIZES.xl },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: SIZES.title, fontWeight: '800', color: '#FFF' },
  progressContainer: { padding: SIZES.lg, borderBottomWidth: 1 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: SIZES.sm },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: SIZES.small, textAlign: 'center' },
  content: { padding: SIZES.xl, paddingBottom: 100 },
  stepTitle: { fontSize: SIZES.subtitle, fontWeight: '700', marginBottom: SIZES.md },
  typeRow: { flexDirection: 'row', gap: SIZES.md },
  typeBtn: { flex: 1, padding: SIZES.lg, borderRadius: SIZES.borderRadiusLg, borderWidth: 2, alignItems: 'center' },
  typeBtnText: { fontSize: SIZES.bodyLg, fontWeight: '700' },
  propTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm },
  propTypeBtn: { width: '22%', aspectRatio: 1, borderRadius: SIZES.borderRadiusLg, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  propTypeIcon: { fontSize: 24, marginBottom: 4 },
  propTypeText: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  citiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm },
  cityBtn: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, borderRadius: SIZES.borderRadiusFull, borderWidth: 1.5 },
  cityBtnText: { fontSize: SIZES.body },
  specsRow: { flexDirection: 'row', gap: SIZES.md },
  reviewCard: { borderRadius: SIZES.borderRadiusXl, padding: SIZES.xl, ...SHADOWS.sm },
  reviewTitle: { fontSize: SIZES.h3, fontWeight: '800', marginBottom: SIZES.xl },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SIZES.md, borderBottomWidth: 1 },
  reviewLabel: { fontSize: SIZES.body },
  reviewValue: { fontSize: SIZES.body, fontWeight: '600' },
  bottomBar: { flexDirection: 'row', gap: SIZES.md, padding: SIZES.lg, borderTopWidth: 1 },
  prevBtn: { flex: 1, height: 52, justifyContent: 'center', alignItems: 'center', borderRadius: SIZES.borderRadiusLg, borderWidth: 2 },
  prevBtnText: { fontSize: SIZES.bodyLg, fontWeight: '700' },
  nextBtn: { flex: 2, height: 52, justifyContent: 'center', alignItems: 'center', borderRadius: SIZES.borderRadiusLg, ...SHADOWS.md },
  nextBtnText: { fontSize: SIZES.bodyLg, fontWeight: '800', color: '#FFF' },
  fieldLabel: { fontSize: SIZES.body, fontWeight: '700', marginBottom: SIZES.sm },
  fieldInput: { borderWidth: 1.5, borderRadius: SIZES.borderRadiusLg, padding: SIZES.md, fontSize: SIZES.body },
});
