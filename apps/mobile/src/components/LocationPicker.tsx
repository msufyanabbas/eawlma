import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList,
  StyleSheet, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useRTL } from '../hooks/useRTL';
import { SAUDI_CITIES, getRegionsByCity, getDistrictsByRegion } from '../data/saudi-locations';
import { SIZES } from '../theme';

interface LocationPickerProps {
  city?: string;
  region?: string;
  district?: string;
  onCityChange: (city: string) => void;
  onRegionChange: (region: string) => void;
  onDistrictChange: (district: string) => void;
}

/**
 * Mobile cascading City → Region → District selector. Each level opens a
 * searchable modal sheet; selecting a value clears the levels below it.
 */
export default function LocationPicker({
  city, region, district,
  onCityChange, onRegionChange, onDistrictChange,
}: LocationPickerProps) {
  const { colors } = useTheme();
  const { isAr, textAlign } = useRTL();
  const [showModal, setShowModal] = useState<'city' | 'region' | 'district' | null>(null);
  const [search, setSearch] = useState('');

  const cityObj = SAUDI_CITIES.find(c => c.nameAr === city || c.nameEn === city);
  const regions = cityObj ? getRegionsByCity(cityObj.id) : [];
  const regionObj = regions.find(r => r.nameAr === region || r.nameEn === region);
  const districts = cityObj && regionObj
    ? getDistrictsByRegion(cityObj.id, regionObj.id)
    : [];

  const getName = (item: any) => (isAr ? item.nameAr : item.nameEn);

  const SelectButton = ({ label, value, onPress, disabled = false }: any) => (
    <TouchableOpacity
      style={[styles.selectBtn, { backgroundColor: colors.surface, borderColor: colors.border }, disabled && { opacity: 0.5 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name="location-outline" size={18} color={colors.primary} />
      <Text style={[styles.selectBtnText, { color: value ? colors.text : colors.textSecondary, textAlign }]}>
        {value || label}
      </Text>
      <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  const ListModal = ({ title, items, onSelect, onClose }: any) => {
    const filtered = items.filter((item: any) =>
      getName(item).toLowerCase().includes(search.toLowerCase())
    );
    return (
      <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.searchInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder={isAr ? 'بحث...' : 'Search...'}
            placeholderTextColor={colors.textSecondary}
          />
          <FlatList
            data={filtered}
            keyExtractor={(item: any) => item.id}
            renderItem={({ item }: any) => (
              <TouchableOpacity
                style={[styles.modalItem, { borderBottomColor: colors.divider }]}
                onPress={() => { onSelect(getName(item)); setSearch(''); onClose(); }}
              >
                <Text style={[styles.modalItemText, { color: colors.text, textAlign }]}>
                  {getName(item)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <SelectButton
        label={isAr ? 'اختر المدينة' : 'Select City'}
        value={city}
        onPress={() => setShowModal('city')}
      />

      {city ? (
        <SelectButton
          label={isAr ? 'اختر المنطقة' : 'Select Region'}
          value={region}
          onPress={() => setShowModal('region')}
          disabled={regions.length === 0}
        />
      ) : null}

      {region ? (
        <SelectButton
          label={isAr ? 'اختر الحي' : 'Select District'}
          value={district}
          onPress={() => setShowModal('district')}
          disabled={districts.length === 0}
        />
      ) : null}

      {showModal === 'city' && (
        <ListModal
          title={isAr ? 'اختر المدينة' : 'Select City'}
          items={SAUDI_CITIES}
          onSelect={(v: string) => { onCityChange(v); onRegionChange(''); onDistrictChange(''); }}
          onClose={() => setShowModal(null)}
        />
      )}
      {showModal === 'region' && (
        <ListModal
          title={isAr ? 'اختر المنطقة' : 'Select Region'}
          items={regions}
          onSelect={(v: string) => { onRegionChange(v); onDistrictChange(''); }}
          onClose={() => setShowModal(null)}
        />
      )}
      {showModal === 'district' && (
        <ListModal
          title={isAr ? 'اختر الحي' : 'Select District'}
          items={districts}
          onSelect={onDistrictChange}
          onClose={() => setShowModal(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SIZES.sm },
  selectBtn: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, padding: SIZES.md, borderRadius: SIZES.borderRadiusLg, borderWidth: 1.5 },
  selectBtnText: { flex: 1, fontSize: SIZES.body },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SIZES.xl, borderBottomWidth: 1 },
  modalTitle: { fontSize: SIZES.h3, fontWeight: '800' },
  searchInput: { margin: SIZES.lg, padding: SIZES.md, borderRadius: SIZES.borderRadiusLg, borderWidth: 1.5, fontSize: SIZES.body },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SIZES.lg, borderBottomWidth: 1 },
  modalItemText: { fontSize: SIZES.bodyLg, fontWeight: '600', flex: 1 },
});
