import { Box, Chip, Tooltip } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import BadgeIcon from '@mui/icons-material/Badge';
import PhoneIcon from '@mui/icons-material/PhoneAndroid';
import { useTranslation } from 'react-i18next';

interface Props {
  regaVerified?: boolean | null;
  nafathVerified?: boolean | null;
  phoneVerified?: boolean | null;
  size?: 'small' | 'medium';
  /** Override the default top-margin. Useful inside dense cards. */
  sx?: object;
}

/**
 * Stacks the trust chips an agent has earned: REGA broker licence (admin
 * verified), Nafath identity (Saudi national ID), and phone-verified. Returns
 * null when the agent has earned nothing, so callers can drop it in without
 * adding their own guard.
 */
export function VerificationBadges({
  regaVerified,
  nafathVerified,
  phoneVerified,
  size = 'small',
  sx,
}: Props) {
  const { t } = useTranslation();

  if (!regaVerified && !nafathVerified && !phoneVerified) return null;

  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5, ...sx }}>
      {regaVerified && (
        <Tooltip
          title={t(
            'agent.regaVerifiedDesc',
            'Licensed by REGA - General Authority for Real Estate',
          )}
        >
          <Chip
            icon={<VerifiedIcon />}
            label={t('agent.regaVerified', 'REGA')}
            size={size}
            sx={{
              bgcolor: '#10B981',
              color: 'white',
              fontWeight: 700,
              '& .MuiChip-icon': { color: 'white' },
            }}
          />
        </Tooltip>
      )}

      {nafathVerified && (
        <Tooltip
          title={t(
            'agent.nafathVerifiedDesc',
            'Identity verified via Nafath - Saudi National ID System',
          )}
        >
          <Chip
            icon={<BadgeIcon />}
            label={t('agent.nafathBadge', 'Verified')}
            size={size}
            sx={{
              bgcolor: '#006C35',
              color: 'white',
              fontWeight: 700,
              '& .MuiChip-icon': { color: 'white' },
            }}
          />
        </Tooltip>
      )}

      {phoneVerified && (
        <Tooltip title={t('agent.phoneVerifiedDesc', 'Phone number verified')}>
          <Chip
            icon={<PhoneIcon />}
            label={t('agent.phoneVerified', 'Phone')}
            size={size}
            color="info"
            sx={{ fontWeight: 700 }}
          />
        </Tooltip>
      )}
    </Box>
  );
}
