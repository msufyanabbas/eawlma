import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { listingsApi } from '../api';
import { COLORS, SIZES, SHADOWS } from '../theme';

const PROPERTY_TYPES = [
  { value: 'apartment', labelAr: 'شقة', labelEn: 'Apartment' },
  { value: 'villa', labelAr: 'فيلا', labelEn: 'Villa' },
  { value: 'land', labelAr: 'أرض', labelEn: 'Land' },
  { value: 'chalet', labelAr: 'شاليه', labelEn: 'Chalet' },
  { value: 'farm', labelAr: 'مزرعة', labelEn: 'Farm' },
];

const TX_TYPES = [
  { value: 'sale', labelAr: 'للبيع', labelEn: 'Sale' },
  { value: 'rent', labelAr: 'للإيجار', labelEn: 'Rent' },
];

export default function AddListingScreen({ navigation }: any) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [titleAr, setTitleAr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [descAr, setDescAr] = useState('');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [propertyType, setPropertyType] = useState('apartment');
  const [transactionType, setTransactionType] = useState('sale');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [area, setArea] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!titleAr.trim() || !price.trim() || !city.trim()) {
      Alert.alert(
        isAr ? 'بيانات ناقصة' : 'Missing fields',
        isAr ? 'يرجى تعبئة الحقول الأساسية' : 'Please fill required fields',
      );
      return;
    }
    setSubmitting(true);
    try {
      await listingsApi.create({
        titleAr: titleAr.trim(),
        titleEn: titleEn.trim() || titleAr.trim(),
        descriptionAr: descAr.trim(),
        price: Number(price),
        city: city.trim(),
        district: district.trim(),
        propertyType,
        transactionType,
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
        bathrooms: bathrooms ? Number(bathrooms) : undefined,
        area: area ? Number(area) : undefined,
      });
      Alert.alert(
        isAr ? 'تم' : 'Success',
        isAr ? 'تم إنشاء الإعلان' : 'Listing created',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      Alert.alert(
        isAr ? 'خطأ' : 'Error',
        e.response?.data?.message || (isAr ? 'فشل الإنشاء' : 'Failed to create')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons
            name={isAr ? 'arrow-forward' : 'arrow-back'}
            size={22}
            color="#FFF"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isAr ? 'إضافة إعلان' : 'Add Listing'}</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Field label={isAr ? 'العنوان (عربي) *' : 'Title (Arabic) *'} value={titleAr} onChange={setTitleAr} />
          <Field label={isAr ? 'العنوان (إنجليزي)' : 'Title (English)'} value={titleEn} onChange={setTitleEn} />

          <Text style={styles.fieldLabel}>{isAr ? 'نوع الإعلان' : 'Transaction Type'}</Text>
          <View style={styles.chipsRow}>
            {TX_TYPES.map(t => (
              <TouchableOpacity
                key={t.value}
                style={[styles.chip, transactionType === t.value && styles.chipActive]}
                onPress={() => setTransactionType(t.value)}
              >
                <Text style={[styles.chipText, transactionType === t.value && styles.chipTextActive]}>
                  {isAr ? t.labelAr : t.labelEn}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>{isAr ? 'نوع العقار' : 'Property Type'}</Text>
          <View style={styles.chipsRow}>
            {PROPERTY_TYPES.map(p => (
              <TouchableOpacity
                key={p.value}
                style={[styles.chip, propertyType === p.value && styles.chipActive]}
                onPress={() => setPropertyType(p.value)}
              >
                <Text style={[styles.chipText, propertyType === p.value && styles.chipTextActive]}>
                  {isAr ? p.labelAr : p.labelEn}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Field label={isAr ? 'السعر *' : 'Price *'} value={price} onChange={setPrice} keyboard="numeric" />
          <Field label={isAr ? 'المدينة *' : 'City *'} value={city} onChange={setCity} />
          <Field label={isAr ? 'الحي' : 'District'} value={district} onChange={setDistrict} />

          <View style={styles.row3}>
            <View style={{ flex: 1 }}>
              <Field label={isAr ? 'غرف' : 'Beds'} value={bedrooms} onChange={setBedrooms} keyboard="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={isAr ? 'حمامات' : 'Baths'} value={bathrooms} onChange={setBathrooms} keyboard="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={isAr ? 'مساحة م²' : 'Area m²'} value={area} onChange={setArea} keyboard="numeric" />
            </View>
          </View>

          <Text style={styles.fieldLabel}>{isAr ? 'الوصف' : 'Description'}</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={descAr}
            onChangeText={setDescAr}
            multiline
            placeholder={isAr ? 'وصف العقار...' : 'Describe the property...'}
            placeholderTextColor={COLORS.textLight}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {isAr ? 'نشر الإعلان' : 'Publish Listing'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange, keyboard }: any) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard || 'default'}
        placeholderTextColor={COLORS.textLight}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.primary, padding: SIZES.lg },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: SIZES.subtitle, fontWeight: '800', color: '#FFF' },
  scroll: { padding: SIZES.lg, gap: SIZES.md, paddingBottom: SIZES.xxxl },
  fieldLabel: { fontSize: SIZES.body, fontWeight: '700', color: COLORS.text, marginTop: SIZES.sm, marginBottom: SIZES.sm },
  input: { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: SIZES.borderRadiusLg, padding: SIZES.md, fontSize: SIZES.body, color: COLORS.text, height: 48 },
  textarea: { height: 100, paddingTop: SIZES.md },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm },
  chip: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, borderRadius: SIZES.borderRadiusFull, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: SIZES.small, color: COLORS.text, fontWeight: '600' },
  chipTextActive: { color: '#FFF' },
  row3: { flexDirection: 'row', gap: SIZES.sm },
  submitBtn: { backgroundColor: COLORS.primary, borderRadius: SIZES.borderRadiusLg, height: 54, justifyContent: 'center', alignItems: 'center', marginTop: SIZES.xl, ...SHADOWS.md },
  submitBtnText: { fontSize: SIZES.bodyLg, fontWeight: '800', color: '#FFF' },
});
