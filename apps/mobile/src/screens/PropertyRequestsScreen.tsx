import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { useAuthStore } from '../store/auth.store';
import { api } from '../api';
import { SHADOWS, SIZES } from '../theme';

// Property type choices match the values the backend accepts (free-form
// string up to 32 chars on CreatePropertyRequestDto.propertyType).
const PROPERTY_TYPES = [
  { value: 'apartment', ar: 'شقة',  en: 'Apartment' },
  { value: 'villa',     ar: 'فيلا', en: 'Villa' },
  { value: 'land',      ar: 'أرض',  en: 'Land' },
  { value: 'office',    ar: 'مكتب', en: 'Office' },
] as const;

const CITIES = [
  'الرياض', 'جدة', 'الدمام', 'مكة المكرمة',
  'المدينة المنورة', 'تبوك', 'أبها', 'القصيم',
];

type Status = 'open' | 'matched' | 'closed' | string;

interface RequestItem {
  id: string;
  propertyType: string;
  city: string;
  minBudget: number | null;
  maxBudget: number | null;
  bedrooms: number | null;
  message: string | null;
  contactPhone: string;
  status: Status;
  createdAt: string;
}

interface FormState {
  propertyType: string;
  city: string;
  minBudget: string;
  maxBudget: string;
  bedrooms: string;
  message: string;
  contactPhone: string;
  contactEmail: string;
}

const EMPTY_FORM: FormState = {
  propertyType: 'apartment',
  city: '',
  minBudget: '',
  maxBudget: '',
  bedrooms: '',
  message: '',
  contactPhone: '',
  contactEmail: '',
};

export default function PropertyRequestsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { isAr, isRTL, textAlign, backIcon } = useRTL();
  const { user, isAuthenticated } = useAuthStore();
  const qc = useQueryClient();
  const isAgent = user?.role === 'agent' || user?.role === 'agency_owner';

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Authenticated users see their own submitted requests. The "browse open
  // requests" agent flow is handled on the web admin page today — adding it
  // here would need a new backend endpoint (currently only /mine and /admin
  // exist), which is out of scope.
  const { data, isLoading, refetch } = useQuery<RequestItem[]>({
    queryKey: ['property-requests', 'mine'],
    queryFn: async () => {
      const res = await api.get('/property-requests/mine');
      // apiClient response body is `{ data: T, timestamp }` on backend
      // success; the mobile client doesn't unwrap, so we do it here.
      return res.data?.data ?? res.data ?? [];
    },
    enabled: isAuthenticated,
  });

  const requests = data ?? [];

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/property-requests', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['property-requests'] });
      setShowForm(false);
      setForm(EMPTY_FORM);
      Alert.alert(
        isAr ? 'تم' : 'Success',
        isAr ? 'تم إرسال طلبك بنجاح' : 'Request submitted successfully',
      );
    },
    onError: () => {
      Alert.alert(
        isAr ? 'خطأ' : 'Error',
        isAr ? 'حدث خطأ، حاول مجدداً' : 'Something went wrong, please try again',
      );
    },
  });

  const handleSubmit = () => {
    if (!form.city.trim() || !form.contactPhone.trim()) {
      Alert.alert(
        isAr ? 'خطأ' : 'Error',
        isAr ? 'يرجى تعبئة المدينة ورقم الهاتف' : 'Please fill city and phone number',
      );
      return;
    }
    createMutation.mutate({
      propertyType: form.propertyType || 'apartment',
      city: form.city.trim(),
      minBudget: form.minBudget ? Number(form.minBudget) : undefined,
      maxBudget: form.maxBudget ? Number(form.maxBudget) : undefined,
      bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
      message: form.message.trim() || undefined,
      contactPhone: form.contactPhone.trim(),
      contactEmail: form.contactEmail.trim() || undefined,
    });
  };

  const statusColor = (status: Status): string => {
    switch (status) {
      case 'open':    return colors.success;
      case 'matched': return colors.primary;
      case 'closed':  return colors.textSecondary;
      default:        return colors.primary;
    }
  };

  const statusLabel = (status: Status): string => {
    if (status === 'open')    return isAr ? 'مفتوح'      : 'Open';
    if (status === 'matched') return isAr ? 'تم التطابق' : 'Matched';
    if (status === 'closed')  return isAr ? 'مغلق'      : 'Closed';
    return status;
  };

  const typeLabel = (value: string): string => {
    const found = PROPERTY_TYPES.find((p) => p.value === value);
    if (!found) return value;
    return isAr ? found.ar : found.en;
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.primary, flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name={backIcon as any} size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isAr ? 'طلبات العقارات' : 'Property Requests'}
        </Text>
        {isAuthenticated ? (
          <TouchableOpacity onPress={() => setShowForm((v) => !v)}>
            <Ionicons
              name={showForm ? 'close-circle-outline' : 'add-circle-outline'}
              size={28}
              color="#FFF"
            />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 28 }} />
        )}
      </View>

      {/* Create form */}
      {showForm && (
        <ScrollView
          style={[
            styles.formContainer,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
          ]}
        >
          <Text style={[styles.formTitle, { color: colors.text, textAlign }]}>
            {isAr ? 'إضافة طلب عقار' : 'Add Property Request'}
          </Text>

          <Text style={[styles.fieldLabel, { color: colors.text, textAlign }]}>
            {isAr ? 'نوع العقار' : 'Property Type'}
          </Text>
          <View style={[styles.chipsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {PROPERTY_TYPES.map((p) => {
              const active = form.propertyType === p.value;
              return (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.chip,
                    { borderColor: colors.border, backgroundColor: colors.background },
                    active && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primary + '15',
                    },
                  ]}
                  onPress={() => setForm((f) => ({ ...f, propertyType: p.value }))}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    {isAr ? p.ar : p.en}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.text, textAlign }]}>
            {isAr ? 'المدينة *' : 'City *'}
          </Text>
          <View style={[styles.chipsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {CITIES.map((city) => {
              const active = form.city === city;
              return (
                <TouchableOpacity
                  key={city}
                  style={[
                    styles.chip,
                    { borderColor: colors.border, backgroundColor: colors.background },
                    active && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primary + '15',
                    },
                  ]}
                  onPress={() => setForm((f) => ({ ...f, city }))}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? colors.primary : colors.text },
                    ]}
                  >
                    {city}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.text, textAlign }]}>
                {isAr ? 'الحد الأدنى' : 'Min Budget'}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                    textAlign,
                  },
                ]}
                value={form.minBudget}
                onChangeText={(v) => setForm((f) => ({ ...f, minBudget: v.replace(/\D/g, '') }))}
                placeholder="500000"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
            <View style={{ width: SIZES.md }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.text, textAlign }]}>
                {isAr ? 'الحد الأقصى' : 'Max Budget'}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                    textAlign,
                  },
                ]}
                value={form.maxBudget}
                onChangeText={(v) => setForm((f) => ({ ...f, maxBudget: v.replace(/\D/g, '') }))}
                placeholder="1000000"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.text, textAlign }]}>
            {isAr ? 'رقم الهاتف *' : 'Phone Number *'}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text,
                textAlign,
              },
            ]}
            value={form.contactPhone}
            onChangeText={(v) => setForm((f) => ({ ...f, contactPhone: v }))}
            placeholder="+9665XXXXXXXX"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
          />

          <Text style={[styles.fieldLabel, { color: colors.text, textAlign }]}>
            {isAr ? 'تفاصيل إضافية' : 'Additional Details'}
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.textarea,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text,
                textAlign,
              },
            ]}
            value={form.message}
            onChangeText={(v) => setForm((f) => ({ ...f, message: v }))}
            placeholder={isAr ? 'أي تفاصيل إضافية...' : 'Any additional details...'}
            placeholderTextColor={colors.textSecondary}
            multiline
          />

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {isAr ? 'إرسال الطلب' : 'Submit Request'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={{ height: SIZES.xl }} />
        </ScrollView>
      )}

      {/* List */}
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshing={isLoading}
          onRefresh={() => void refetch()}
          ListHeaderComponent={
            <View
              style={[styles.listHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            >
              <Text style={[styles.listHeaderText, { color: colors.text }]}>
                {isAr
                  ? `${requests.length} طلب`
                  : `${requests.length} request${requests.length === 1 ? '' : 's'}`}
              </Text>
              {!isAuthenticated && (
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={[styles.loginLink, { color: colors.primary }]}>
                    {isAr ? 'سجل دخولك لإضافة طلب' : 'Login to add a request'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.typeChip, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.typeChipText, { color: colors.primary }]}>
                    {typeLabel(item.propertyType)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusChip,
                    { backgroundColor: statusColor(item.status) + '20' },
                  ]}
                >
                  <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
                    {statusLabel(item.status)}
                  </Text>
                </View>
              </View>

              <View style={[styles.cardRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.cityText, { color: colors.text }]}>{item.city}</Text>
              </View>

              {(item.minBudget != null || item.maxBudget != null) && (
                <View style={[styles.cardRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.budgetText, { color: colors.primary }]}>
                    {item.minBudget != null ? Number(item.minBudget).toLocaleString() : '0'}
                    {' - '}
                    {item.maxBudget != null ? Number(item.maxBudget).toLocaleString() : '∞'}
                    {'  '}
                    {isAr ? 'ر.س' : 'SAR'}
                  </Text>
                </View>
              )}

              {item.message ? (
                <Text
                  style={[styles.message, { color: colors.textSecondary, textAlign }]}
                  numberOfLines={2}
                >
                  {item.message}
                </Text>
              ) : null}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="home-outline" size={64} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {isAr ? 'لا توجد طلبات' : 'No property requests'}
              </Text>
              {isAuthenticated && !isAgent && (
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setShowForm(true)}
                >
                  <Text style={styles.addBtnText}>
                    {isAr ? 'أضف طلبك الأول' : 'Add your first request'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.lg,
  },
  headerTitle: { fontSize: SIZES.title, fontWeight: '800', color: '#FFF' },
  formContainer: { maxHeight: 520, borderBottomWidth: 1 },
  formTitle: { fontSize: SIZES.subtitle, fontWeight: '800', margin: SIZES.lg },
  fieldLabel: {
    fontSize: SIZES.body,
    fontWeight: '700',
    marginBottom: SIZES.sm,
    marginHorizontal: SIZES.lg,
  },
  chipsRow: {
    paddingHorizontal: SIZES.lg,
    flexWrap: 'wrap',
    gap: SIZES.sm,
    marginBottom: SIZES.md,
  },
  chip: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.borderRadiusFull,
    borderWidth: 1.5,
  },
  chipText: { fontSize: SIZES.small, fontWeight: '600' },
  row: { paddingHorizontal: SIZES.lg, marginBottom: SIZES.md },
  input: {
    borderWidth: 1.5,
    borderRadius: SIZES.borderRadiusLg,
    padding: SIZES.md,
    fontSize: SIZES.body,
    marginHorizontal: SIZES.lg,
    marginBottom: SIZES.md,
    height: 52,
  },
  textarea: { height: 100, textAlignVertical: 'top' },
  submitBtn: {
    marginHorizontal: SIZES.lg,
    padding: SIZES.md,
    borderRadius: SIZES.borderRadiusLg,
    alignItems: 'center',
  },
  submitBtnText: { color: '#FFF', fontWeight: '800', fontSize: SIZES.bodyLg },
  list: { padding: SIZES.md, paddingBottom: SIZES.xxxl },
  listHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
    paddingHorizontal: SIZES.sm,
  },
  listHeaderText: { fontSize: SIZES.body, fontWeight: '700' },
  loginLink: { fontSize: SIZES.body, fontWeight: '600' },
  card: {
    borderRadius: SIZES.borderRadiusLg,
    padding: SIZES.lg,
    marginBottom: SIZES.sm,
    ...SHADOWS.sm,
  },
  cardHeader: {
    justifyContent: 'space-between',
    marginBottom: SIZES.sm,
  },
  typeChip: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 3,
    borderRadius: SIZES.borderRadiusFull,
  },
  typeChipText: { fontSize: SIZES.small, fontWeight: '700' },
  statusChip: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 3,
    borderRadius: SIZES.borderRadiusFull,
  },
  statusText: { fontSize: SIZES.small, fontWeight: '700' },
  cardRow: {
    alignItems: 'center',
    gap: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  cityText: { fontSize: SIZES.body, fontWeight: '600' },
  budgetText: { fontSize: SIZES.body, fontWeight: '700' },
  message: { fontSize: SIZES.small, lineHeight: 20, marginTop: SIZES.xs },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: {
    fontSize: SIZES.subtitle,
    fontWeight: '700',
    marginTop: SIZES.lg,
  },
  addBtn: {
    marginTop: SIZES.xl,
    paddingHorizontal: SIZES.xxxl,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.borderRadiusLg,
  },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: SIZES.bodyLg },
});
