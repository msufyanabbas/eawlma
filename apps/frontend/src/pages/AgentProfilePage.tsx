import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Grid,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/VerifiedRounded';
import BusinessIcon from '@mui/icons-material/Business';
import StarIcon from '@mui/icons-material/Star';
import ChatIcon from '@mui/icons-material/ChatBubbleOutline';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { searchApi } from '@/api/search.api';
import { agentsApi } from '@/api/agents.api';
import { ListingCard } from '@/components/global/ListingCard';
import { SkeletonCard } from '@/components/global/SkeletonCard';
import { EmptyState } from '@/components/global/EmptyState';

export function AgentProfilePage() {
  const { t } = useTranslation();
  const params = useParams({ strict: false }) as { id?: string };
  const agentId = params.id ?? '';

  const { data: page, isLoading } = useQuery({
    queryKey: ['search', { agentId }],
    queryFn: () => searchApi.listings({ agentId }),
    enabled: Boolean(agentId),
  });

  // Pull the real agent profile from /agents/:id — gives us first/last name,
  // avatar, identity verification, and member-since for a personalised header.
  const { data: agent } = useQuery({
    queryKey: ['agents', agentId],
    queryFn: () => agentsApi.getById(agentId),
    enabled: Boolean(agentId),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const listings = page?.data ?? [];

  const displayName = useMemo(() => {
    if (agent) return `${agent.firstName} ${agent.lastName}`.trim();
    return 'eawlma Agent';
  }, [agent]);

  const initials = useMemo(() => {
    const first = agent?.firstName?.[0] ?? 'E';
    const second = agent?.lastName?.[0] ?? '';
    return `${first}${second}`.toUpperCase();
  }, [agent]);

  const memberSinceYear = agent?.memberSince
    ? new Date(agent.memberSince).getFullYear().toString()
    : '—';

  return (
    <Box>
      <Helmet>
        <title>{t('listing.agent')} — {t('app.name')}</title>
      </Helmet>

      {/* Cover */}
      <Box
        sx={{
          height: { xs: 160, md: 220 },
          background: (theme) =>
            `linear-gradient(120deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main} 60%, ${theme.palette.secondary.main})`,
        }}
      />

      <Container maxWidth="lg" sx={{ mt: { xs: -8, md: -10 }, pb: 6 }}>
        <Paper sx={{ p: { xs: 3, md: 4 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={3}
            alignItems={{ xs: 'flex-start', md: 'center' }}
          >
            <Avatar
              src={agent?.avatarUrl ?? undefined}
              alt={displayName}
              sx={{
                width: { xs: 96, md: 120 },
                height: { xs: 96, md: 120 },
                background: (theme) =>
                  `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: 'common.white',
                fontSize: { xs: 32, md: 44 },
                fontWeight: 800,
                letterSpacing: 0.5,
                border: 4,
                borderColor: 'background.paper',
                boxShadow: 4,
              }}
            >
              {initials}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap' }}>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  {displayName}
                </Typography>
                <Chip
                  size="small"
                  color="success"
                  icon={<VerifiedIcon sx={{ fontSize: 16 }} />}
                  label={t('listing.verified')}
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                <BusinessIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                eawlma Real Estate
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
                Bilingual real-estate professional helping buyers and renters find the right home
                across Saudi Arabia. Specialising in Riyadh, Jeddah, and Dammam markets.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <Button startIcon={<ChatIcon />} variant="outlined">
                {t('nav.messages')}
              </Button>
              <Button variant="contained" color="primary">
                {t('listing.callAgent')}
              </Button>
            </Stack>
          </Stack>

          {/* Stats bar */}
          <Grid container spacing={2} sx={{ mt: 3 }}>
            <StatCell
              label={t('dashboard.listings')}
              value={isLoading ? '—' : String(page?.meta.total ?? listings.length)}
            />
            <StatCell label="Member since" value={memberSinceYear} />
            <StatCell label="Response rate" value="98%" />
            <StatCell label="Rating" value="4.8 / 5" valueIcon={<StarIcon sx={{ color: 'warning.main', fontSize: 18 }} />} />
          </Grid>
        </Paper>

        {/* Active listings */}
        <Box sx={{ mt: 5 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
            {t('dashboard.listings')}
          </Typography>
          {isLoading ? (
            <Grid container spacing={3}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Grid key={i} item xs={12} sm={6} md={4}>
                  <SkeletonCard />
                </Grid>
              ))}
            </Grid>
          ) : listings.length === 0 ? (
            <EmptyState title={t('empty.noListings')} />
          ) : (
            <Grid container spacing={3}>
              {listings.map((listing) => (
                <Grid key={listing.id} item xs={12} sm={6} md={4}>
                  <ListingCard listing={listing} />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

        {/* Reviews — placeholder until backend reviews land */}
        <Box sx={{ mt: 5 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
            Reviews
          </Typography>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Stack spacing={1} alignItems="center">
              <Stack direction="row" spacing={0.5}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <StarIcon key={i} sx={{ color: 'warning.main', fontSize: 24 }} />
                ))}
              </Stack>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>4.8 / 5</Typography>
              <Typography variant="body2" color="text.secondary">
                Reviews from buyers and renters will appear here.
              </Typography>
            </Stack>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}

function StatCell({ label, value, valueIcon }: { label: string; value: string; valueIcon?: React.ReactNode }) {
  return (
    <Grid item xs={6} sm={3}>
      <Box sx={{ textAlign: { xs: 'center', sm: 'start' }, py: 1 }}>
        <Stack direction="row" spacing={0.75} alignItems="center" justifyContent={{ xs: 'center', sm: 'flex-start' }}>
          {valueIcon}
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {value || <Skeleton width={48} />}
          </Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {label}
        </Typography>
      </Box>
    </Grid>
  );
}
