import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { listingsApi } from '../api';
import { useTheme } from '../hooks/useTheme';
import { SIZES, SHADOWS, TYPOGRAPHY } from '../theme';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';

export default function EditListingScreen({ navigation, route }: any) {
  const { id } = route.params;
  const { colors } = useTheme();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const TX_TYPES = [
    { value: 'sale', label: t('wizard.sale') },
    { value: 'rent', label: t('wizard.rent') },
  ];

  const PROPERTY_TYPES = [
    { value: 'apartment', label: t('wizard.apartment') },
    { value: 'villa', label: t('wizard.villa') },
    { value: 'land', label: t('wizard.land') },
    { value: 'chalet', label: t('wizard.chalet') },
    { value: 'farm', label: t('wizard.farm') },
  ];

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
      Alert.alert(t('wizard.missing'), t('wizard.fillBasic'));
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
        t('wizard.savedTitle'),
        t('wizard.savedBody'),
        [{ text: t('wizard.ok'), onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      Alert.alert(
        t('wizard.errorTitle'),
        e.response?.data?.message || t('wizard.updateFailed')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('wizard.deleteTitle'),
      t('wizard.deleteBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('wizard.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await listingsApi.delete(id);
              qc.invalidateQueries({ queryKey: ['my-listings'] });
              navigation.goBack();
            } catch {
              Alert.alert(t('wizard.errorTitle'), t('wizard.deleteFailed'));
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title={t('wizard.editTitle')} onBack={() => navigation.goBack()} />
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={t('wizard.editTitle')} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Field label={t('wizard.titleArEdit')} value={titleAr} onChange={setTitleAr} colors={colors} />
          <Field label={t('wizard.titleEnEdit')} value={titleEn} onChange={setTitleEn} colors={colors} />

          <SectionLabel colors={colors}>{t('wizard.transactionTypeShort')}</SectionLabel>
          <Chips items={TX_TYPES} value={transactionType} onChange={setTransactionType} colors={colors} />

          <SectionLabel colors={colors}>{t('wizard.propertyType')}</SectionLabel>
          <Chips items={PROPERTY_TYPES} value={propertyType} onChange={setPropertyType} colors={colors} />

          <Field label={t('wizard.priceShort')} value={price} onChange={setPrice} keyboard="numeric" colors={colors} />
          <Field label={t('wizard.cityShort')} value={city} onChange={setCity} colors={colors} />
          <Field label={t('wizard.districtShort')} value={district} onChange={setDistrict} colors={colors} />

          <View style={styles.row3}>
            <View style={{ flex: 1 }}>
              <Field label={t('wizard.bedsShort')} value={bedrooms} onChange={setBedrooms} keyboard="numeric" colors={colors} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t('wizard.bathsShort')} value={bathrooms} onChange={setBathrooms} keyboard="numeric" colors={colors} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t('wizard.areaShort')} value={area} onChange={setArea} keyboard="numeric" colors={colors} />
            </View>
          </View>

          <SectionLabel colors={colors}>{t('wizard.description')}</SectionLabel>
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
              : <Text style={[TYPOGRAPHY.bodyBold, { color: '#FFF' }]}>{t('wizard.saveChanges')}</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: colors.error + '60' }]}
            onPress={handleDelete}
          >
            <Text style={[TYPOGRAPHY.bodyBold, { color: colors.error }]}>
              {t('wizard.deleteListing')}
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

function Chips({ items, value, onChange, colors }: any) {
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
              {it.label}
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
