import {
  Box, FormControl, InputLabel, Select, MenuItem,
  Stack, Chip,
} from '@mui/material';
import { LocationOn } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { SAUDI_CITIES, getRegionsByCity, getDistrictsByRegion } from '@/data/saudi-locations';

interface LocationPickerProps {
  city?: string;
  region?: string;
  district?: string;
  onCityChange: (city: string) => void;
  onRegionChange: (region: string) => void;
  onDistrictChange: (district: string) => void;
  showLabel?: boolean;
  size?: 'small' | 'medium';
}

/**
 * Cascading City → Region → District selector backed by the static
 * `SAUDI_CITIES` hierarchy. Region/District selects only appear once the
 * level above them has a value; clearing a parent resets its children.
 */
export default function LocationPicker({
  city = '',
  region = '',
  district = '',
  onCityChange,
  onRegionChange,
  onDistrictChange,
  showLabel = true,
  size = 'medium',
}: LocationPickerProps) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const cityId = SAUDI_CITIES.find(c => c.nameAr === city || c.nameEn === city)?.id || '';
  const regions = city ? getRegionsByCity(cityId) : [];

  const regionId = regions.find(r => r.nameAr === region || r.nameEn === region)?.id || '';
  const districts = city && region ? getDistrictsByRegion(cityId, regionId) : [];

  return (
    <Stack spacing={2}>
      {/* City */}
      <FormControl fullWidth size={size}>
        {showLabel && <InputLabel>{isAr ? 'المدينة' : 'City'}</InputLabel>}
        <Select
          value={city}
          label={showLabel ? (isAr ? 'المدينة' : 'City') : undefined}
          onChange={e => {
            onCityChange(e.target.value);
            onRegionChange('');
            onDistrictChange('');
          }}
          startAdornment={<LocationOn sx={{ mr: 1, color: 'text.secondary' }} />}
        >
          <MenuItem value=""><em>{isAr ? 'كل المدن' : 'All Cities'}</em></MenuItem>
          {SAUDI_CITIES.map(c => (
            <MenuItem key={c.id} value={isAr ? c.nameAr : c.nameEn}>
              {isAr ? c.nameAr : c.nameEn}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Region - only show when city selected */}
      {city && regions.length > 0 && (
        <FormControl fullWidth size={size}>
          {showLabel && <InputLabel>{isAr ? 'المنطقة' : 'Region'}</InputLabel>}
          <Select
            value={region}
            label={showLabel ? (isAr ? 'المنطقة' : 'Region') : undefined}
            onChange={e => {
              onRegionChange(e.target.value);
              onDistrictChange('');
            }}
          >
            <MenuItem value=""><em>{isAr ? 'كل المناطق' : 'All Regions'}</em></MenuItem>
            {regions.map(r => (
              <MenuItem key={r.id} value={isAr ? r.nameAr : r.nameEn}>
                {isAr ? r.nameAr : r.nameEn}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* District - only show when region selected */}
      {region && districts.length > 0 && (
        <FormControl fullWidth size={size}>
          {showLabel && <InputLabel>{isAr ? 'الحي' : 'District'}</InputLabel>}
          <Select
            value={district}
            label={showLabel ? (isAr ? 'الحي' : 'District') : undefined}
            onChange={e => onDistrictChange(e.target.value)}
          >
            <MenuItem value=""><em>{isAr ? 'كل الأحياء' : 'All Districts'}</em></MenuItem>
            {districts.map(d => (
              <MenuItem key={d.id} value={isAr ? d.nameAr : d.nameEn}>
                {isAr ? d.nameAr : d.nameEn}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Selected location breadcrumb */}
      {(city || region || district) && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {city && <Chip label={city} size="small" color="primary" variant="outlined" />}
          {region && <Chip label={region} size="small" color="primary" />}
          {district && <Chip label={district} size="small" color="secondary" />}
        </Box>
      )}
    </Stack>
  );
}
