import { Box, Typography, Divider, LinearProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/utils/formatters';
import type { NeighborhoodInsight } from '@/data/neighborhood-insights';
import SchoolIcon from '@mui/icons-material/School';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import MosqueIcon from '@mui/icons-material/Mosque';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

interface Props {
  insight: NeighborhoodInsight;
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 8 ? 'success' : score >= 6 ? 'warning' : 'error';
  return (
    <Box sx={{ mb: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="caption" fontWeight={700}>{score}/10</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={score * 10}
        color={color}
        sx={{ height: 6, borderRadius: 3 }}
      />
    </Box>
  );
}

/**
 * Compact insight panel for a neighborhood — rendered inside the map's
 * `InfoWindow` when a neighborhood marker is clicked.
 */
export function NeighborhoodInsightCard({ insight }: Props) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const name = isAr ? insight.nameAr : insight.nameEn;

  const TrendIcon =
    insight.trend === 'up'
      ? TrendingUpIcon
      : insight.trend === 'down'
        ? TrendingDownIcon
        : TrendingFlatIcon;

  const trendColor =
    insight.trend === 'up'
      ? 'success.main'
      : insight.trend === 'down'
        ? 'error.main'
        : 'text.secondary';

  return (
    <Box sx={{ width: 280, p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
      {/* Header — name + price trend */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Typography variant="h6" fontWeight={800} fontSize={15}>
          {name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: trendColor }}>
          <TrendIcon fontSize="small" />
          <Typography variant="caption" fontWeight={700} color={trendColor}>
            {insight.trendPercent > 0 ? '+' : ''}
            {insight.trendPercent}%
          </Typography>
        </Box>
      </Box>

      {/* Prices */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 1,
          mb: 1.5,
          p: 1.5,
          bgcolor: 'grey.50',
          borderRadius: 1.5,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" display="block">
            {t('neighborhood.avgPrice', { defaultValue: 'Avg Price/m²' })}
          </Typography>
          <Typography variant="body2" fontWeight={800} color="primary.main">
            {formatNumber(insight.avgPricePerSqm)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('listing.currency', { defaultValue: 'SAR' })}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" display="block">
            {t('neighborhood.avgRent', { defaultValue: 'Avg Rent/mo' })}
          </Typography>
          <Typography variant="body2" fontWeight={800} color="secondary.main">
            {formatNumber(insight.avgRentPerMonth)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('listing.currency', { defaultValue: 'SAR' })}
          </Typography>
        </Box>
      </Box>

      {/* Amenity counts */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <SchoolIcon fontSize="small" color="primary" />
          <Typography variant="caption">
            {insight.schools} {t('neighborhood.schools', { defaultValue: 'Schools' })}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <LocalHospitalIcon fontSize="small" color="error" />
          <Typography variant="caption">
            {insight.hospitals} {t('neighborhood.hospitals', { defaultValue: 'Hospitals' })}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ShoppingBagIcon fontSize="small" color="warning" />
          <Typography variant="caption">
            {insight.malls} {t('neighborhood.malls', { defaultValue: 'Malls' })}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <MosqueIcon fontSize="small" color="success" />
          <Typography variant="caption">
            {insight.mosques} {t('neighborhood.mosques', { defaultValue: 'Mosques' })}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 1.5 }} />

      {/* Livability scores */}
      <ScoreBar label={t('neighborhood.transport', { defaultValue: 'Transport' })} score={insight.transport} />
      <ScoreBar label={t('neighborhood.safety', { defaultValue: 'Safety' })} score={insight.safety} />
      <ScoreBar label={t('neighborhood.amenities', { defaultValue: 'Amenities' })} score={insight.amenities} />
    </Box>
  );
}
