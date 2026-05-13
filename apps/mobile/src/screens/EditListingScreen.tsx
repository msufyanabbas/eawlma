import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listingsApi } from '../api';
import { useRTL } from '../hooks/useRTL';
import { useTheme } from '../hooks/useTheme';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../theme';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';

const TX_TYPES = [
  { value: 'sale', labelAr: 'للبيع', labelEn: 'Sale' },
  { value: 'rent', labelAr: 'للإيجار', labelEn: 'Rent' },
];

const PROPERTY_TYPES = [
  { value: 'apartment', labelAr: 'شقة', labelEn: 'Apartment' },
  { value: 'villa', labelAr: 'فيلا', labelEn: 'Villa' },
  { value: 'land', labelAr: 'أرض', labelEn: 'Land' },
  { value: 'chalet', labelAr: 'شاليه', labelEn: 'Chalet' },
  { value: 'farm', labelAr: 'مزرعة', labelEn: 'Farm' },
];

export default function EditListingScreen({ navigation, route }: any) {
  const { id } = route.params;
  const { isAr } = useRTL();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingsApi.getById(id),
  });

  const listing: any = data?.data || {};

  const [titleAr, setTitleAr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [propertyType, setPropertyType] = useState('apartment');
  const [transactionType, setTransactionType] = useState('sale');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [area, setArea] = useState('');
  const [descAr, setDescAr] = useState('');

  useEffect(() => {
    if (listing.id) {
      setTitleAr(listing.titleAr || '');
      setTitleEn(listing.titleEn || '');
      setPrice(String(listing.price ?? ''));
      setCity(listing.city || '');
      setDistrict(listing.district || '');
      setPropertyType(listing.propertyType || 'apartment');
      setTransactionType(listing.transactionType || listing.type || 'sale');
      setBedrooms(listing.bedrooms != null ? String(listing.bedrooms) : '');
      setBathrooms(listing.bathrooms != null ? String(listing.bathrooms) : '');
      setArea(listing.area != null ? String(listing.area) : '');
      setDescAr(listing.descriptionAr || '');
    }
  }, [listing.id]);

  const handleSave = async () => {
    if (!titleAr.trim() || !price.trim()) {
      Alert.alert(
        isAr ? 'بيانات ناقصة' : 'Missing fields',
        isAr ? 'يرجى تعبئة الحقول الأساسية' : 'Please fill required fields'
      );
      return;
    }
    setSubmitting(true);
    try {
      await listingsApi.update(id, {
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
      qc.invalidateQueries({ queryKey: ['listing', id] });
      qc.invalidateQueries({ queryKey: ['my-listings'] });
      Alert.alert(
        isAr ? 'تم' : 'Saved',
        isAr ? 'تم تحديث الإعلان' : 'Listing updated',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      Alert.alert(
        isAr ? 'خطأ' : 'Error',
        e.response?.data?.message || (isAr ? 'فشل التحديث' : 'Failed to update')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      isAr ? 'حذف الإعلان' : 'Delete listing',
      isAr ? 'هل أنت متأكد؟ لا يمكن التراجع.' : 'Are you sure? This cannot be undone.',
      [
        { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isAr ? 'حذف' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await listingsApi.delete(id);
              qc.invalidateQueries({ queryKey: ['my-listings'] });
              navigation.goBack();
            } catch {
              Alert.alert(isAr ? 'خطأ' : 'Error', isAr ? 'فشل الحذف' : 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title={isAr ? 'تعديل الإعلان' : 'Edit Listing'} onBack={() => navigation.goBack()} />
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={isAr ? 'تعديل الإعلان' : 'Edit Listing'} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Field label={isAr ? 'العنوان (عربي) *' : 'Title (Arabic) *'} value={titleAr} onChange={setTitleAr} colors={colors} />
          <Field label={isAr ? 'العنوان (إنجليزي)' : 'Title (English)'} value={titleEn} onChange={setTitleEn} colors={colors} />

          <SectionLabel colors={colors}>{isAr ? 'نوع الإعلان' : 'Transaction Type'}</SectionLabel>
          <Chips items={TX_TYPES} value={transactionType} onChange={setTransactionType} isAr={isAr} colors={colors} />

          <SectionLabel colors={colors}>{isAr ? 'نوع العقار' : 'Property Type'}</SectionLabel>
          <Chips items={PROPERTY_TYPES} value={propertyType} onChange={setPropertyType} isAr={isAr} colors={colors} />

          <Field label={isAr ? 'السعر *' : 'Price *'} value={price} onChange={setPrice} keyboard="numeric" colors={colors} />
          <Field label={isAr ? 'المدينة' : 'City'} value={city} onChange={setCity} colors={colors} />
          <Field label={isAr ? 'الحي' : 'District'} value={district} onChange={setDistrict} colors={colors} />

          <View style={styles.row3}>
            <View style={{ flex: 1 }}>
              <Field label={isAr ? 'غرف' : 'Beds'} value={bedrooms} onChange={setBedrooms} keyboard="numeric" colors={colors} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={isAr ? 'حمامات' : 'Baths'} value={bathrooms} onChange={setBathrooms} keyboard="numeric" colors={colors} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={isAr ? 'م²' : 'Area'} value={area} onChange={setArea} keyboard="numeric" colors={colors} />
            </View>
          </View>

          <SectionLabel colors={colors}>{isAr ? 'الوصف' : 'Description'}</SectionLabel>
          <TextInput
            style={[styles.input, styles.textarea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            value={descAr}
            onChangeText={setDescAr}
            multiline
            placeholderTextColor={colors.textLight}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }, submitting && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#FFF" />
              : <Text style={[TYPOGRAPHY.bodyBold, { color: '#FFF' }]}>{isAr ? 'حفظ التغييرات' : 'Save Changes'}</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: colors.error + '60' }]}
            onPress={handleDelete}
          >
            <Text style={[TYPOGRAPHY.bodyBold, { color: colors.error }]}>
              {isAr ? 'حذف الإعلان' : 'Delete Listing'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, value, onChange, keyboard, colors }: any) {
  return (
    <View>
      <SectionLabel colors={colors}>{label}</SectionLabel>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard || 'default'}
        placeholderTextColor={colors.textLight}
      />
    </View>
  );
}

function SectionLabel({ children, colors }: any) {
  return (
    <Text style={[TYPOGRAPHY.bodyBold, { color: colors.text, marginTop: SIZES.md, marginBottom: SIZES.sm }]}>
      {children}
    </Text>
  );
}

function Chips({ items, value, onChange, isAr, colors }: any) {
  return (
    <View style={styles.chipsRow}>
      {items.map((it: any) => {
        const active = value === it.value;
        return (
          <TouchableOpacity
            key={it.value}
            style={[
              styles.chip,
              { borderColor: colors.border, backgroundColor: colors.surface },
              active && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => onChange(it.value)}
          >
            <Text style={[TYPOGRAPHY.small, { color: active ? '#FFF' : colors.text, fontWeight: '600' }]}>
              {isAr ? it.labelAr : it.labelEn}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SIZES.lg, paddingBottom: SIZES.xxxl },
  input: { borderWidth: 1.5, borderRadius: SIZES.borderRadiusLg, padding: SIZES.md, height: 48 },
  textarea: { height: 100 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm },
  chip: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, borderRadius: SIZES.borderRadiusFull, borderWidth: 1.5 },
  row3: { flexDirection: 'row', gap: SIZES.sm },
  submitBtn: { borderRadius: SIZES.borderRadiusLg, height: 54, justifyContent: 'center', alignItems: 'center', marginTop: SIZES.xl, ...SHADOWS.md },
  deleteBtn: { borderRadius: SIZES.borderRadiusLg, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: SIZES.md, borderWidth: 1.5 },
});
