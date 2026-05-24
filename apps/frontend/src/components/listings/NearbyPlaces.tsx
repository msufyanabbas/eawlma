import { Box, Chip, Grid, Paper, Skeleton, Typography } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import MosqueIcon from '@mui/icons-material/Mosque';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import StarIcon from '@mui/icons-material/Star';
import type { SvgIconComponent } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNearbyPlaces } from '@/hooks/useNearbyPlaces';

interface Props {
  lat: number;
  lng: number;
}

interface PlaceType {
  type: string;
  labelKey: string;
  fallbackLabel: string;
  Icon: SvgIconComponent;
  color: string;
}

const PLACE_TYPES: PlaceType[] = [
  { type: 'school', labelKey: 'nearby.schools', fallbackLabel: 'Schools', Icon: SchoolIcon, color: '#3B82F6' },
  { type: 'hospital', labelKey: 'nearby.hospitals', fallbackLabel: 'Hospitals', Icon: LocalHospitalIcon, color: '#EF4444' },
  { type: 'shopping_mall', labelKey: 'nearby.malls', fallbackLabel: 'Shopping Malls', Icon: ShoppingBagIcon, color: '#F59E0B' },
  { type: 'mosque', labelKey: 'nearby.mosques', fallbackLabel: 'Mosques', Icon: MosqueIcon, color: '#10B981' },
  { type: 'restaurant', labelKey: 'nearby.restaurants', fallbackLabel: 'Restaurants', Icon: RestaurantIcon, color: '#8B5CF6' },
];

function PlaceSection({ placeType, lat, lng }: { placeType: PlaceType; lat: number; lng: number }) {
  const { type, labelKey, fallbackLabel, Icon, color } = placeType;
  const { places, loading } = useNearbyPlaces(lat, lng, type);
  const { t } = useTranslation();

  // Hide entirely if Google returned nothing — keeps the section dense
  // when a listing is in a sparse area.
  if (!loading && places.length === 0) return null;

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Icon sx={{ color, fontSize: 18 }} />
        <Typography variant="subtitle2" fontWeight={700}>
          {t(labelKey, fallbackLabel)}
        </Typography>
        {!loading && (
          <Chip
            label={places.length}
            size="small"
            sx={{ bgcolor: `${color}20`, color, fontWeight: 700 }}
          />
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={24} />
          ))}
        </Box>
      ) : (
        places.map((place, i) => (
          <Box
            key={place.placeId || `${place.name}-${i}`}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              py: 0.8,
              borderBottom: i < places.length - 1 ? '1px solid' : 'none',
              borderColor: 'divider',
            }}
          >
            <Typography variant="body2" sx={{ flex: 1 }} noWrap>
              {place.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
              {place.rating > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                  <StarIcon sx={{ fontSize: 12, color: '#F59E0B' }} />
                  <Typography variant="caption" color="text.secondary">
                    {place.rating}
                  </Typography>
                </Box>
              )}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  bgcolor: 'grey.100',
                  px: 0.8,
                  py: 0.2,
                  borderRadius: 1,
                }}
              >
                {place.distance}
              </Typography>
            </Box>
          </Box>
        ))
      )}
    </Box>
  );
}

export function NearbyPlaces({ lat, lng }: Props) {
  const { t } = useTranslation();

  return (
    <Paper sx={{ p: 3, borderRadius: 3, mt: 3 }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
        {t('nearby.title', "What's Nearby")}
      </Typography>

      <Grid container spacing={2}>
        {PLACE_TYPES.map((placeType) => (
          <Grid item xs={12} md={6} key={placeType.type}>
            <PlaceSection placeType={placeType} lat={lat} lng={lng} />
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
}
