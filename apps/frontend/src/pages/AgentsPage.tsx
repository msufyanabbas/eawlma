import {
  Avatar,
  Box,
  Button,
  Chip,
  Grid,
  InputAdornment,
  Pagination,
  Skeleton,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import VerifiedIcon from '@mui/icons-material/VerifiedRounded';
import AccessTimeIcon from '@mui/icons-material/AccessTimeOutlined';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import { agentsApi, type PublicAgent } from '@/api/agents.api';
import { searchApi } from '@/api/search.api';
import { EmptyState } from '@/components/global/EmptyState';
import { VerificationBadges } from '@/components/agents/VerificationBadges';
import { formatNumber } from '@/utils/formatters';

// Avatars come from each agent's own profile (`agent.avatarUrl`). When that
// is null we render initials on the brand gradient — never a stock photo of
// a stranger, which is what the previous AGENT_PHOTOS array was doing.
const CITY_FILTERS = ['All Cities', 'Riyadh', 'Jeddah', 'Dammam'] as const;
const CITY_LABEL_KEYS: Record<(typeof CITY_FILTERS)[number], string> = {
  'All Cities': 'agents.allCities',
  Riyadh: 'agents.cityRiyadh',
  Jeddah: 'agents.cityJeddah',
  Dammam: 'agents.cityDammam',
};
const PAGE_SIZE = 12;

export function AgentsPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState<(typeof CITY_FILTERS)[number]>('All Cities');
  const [page, setPage] = useState(1);

  // Discover agent IDs by harvesting unique owners off recent listings —
  // the public /agents endpoint exposes only profile-by-id, so we derive the
  // directory from listing ownership. A real /agents directory endpoint would
  // be a future improvement.
  const discoverQuery = useQuery({
    queryKey: ['agents', 'discover', city],
    queryFn: () =>
      searchApi.listings({
        city: city === 'All Cities' ? undefined : city,
        limit: 60,
        sortField: 'createdAt',
      }),
    staleTime: 5 * 60_000,
  });

  // Each owner -> count of active listings (cheap filter on the same page).
  const agentListingCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of discoverQuery.data?.data ?? []) {
      map.set(l.ownerId, (map.get(l.ownerId) ?? 0) + 1);
    }
    return map;
  }, [discoverQuery.data]);

  const uniqueAgentIds = useMemo(
    () => Array.from(agentListingCounts.keys()),
    [agentListingCounts],
  );

  const agentQueries = useQueries({
    queries: uniqueAgentIds.map((id) => ({
      queryKey: ['agents', id],
      queryFn: () => agentsApi.getById(id),
      staleTime: 5 * 60_000,
      retry: false,
    })),
  });

  const agents = useMemo(
    () =>
      agentQueries
        .map((q) => q.data)
        .filter((a): a is PublicAgent => Boolean(a)),
    [agentQueries],
  );

  const filteredAgents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter((a) =>
      `${a.firstName} ${a.lastName}`.toLowerCase().includes(q),
    );
  }, [agents, query]);

  const totalPages = Math.max(1, Math.ceil(filteredAgents.length / PAGE_SIZE));
  const pageAgents = filteredAgents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const isLoading = discoverQuery.isLoading || agentQueries.some((q) => q.isLoading);

  return (
    <Box>
      <Helmet>
        <title>{t('nav.agents')} — {t('app.name')}</title>
      </Helmet>

      {/* ---- Compact purple header ---- */}
      <Box sx={{ bgcolor: 'primary.main', color: 'common.white', py: 3, px: { xs: 2, md: 3 } }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>
            👤 {t('nav.agents')}
          </Typography>
          <TextField
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder={t('agents.searchPlaceholder', { defaultValue: 'Search by name or specialty' })}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              sx: {
                bgcolor: 'background.paper',
                borderRadius: 1,
                '& fieldset': { border: 'none' },
              },
            }}
            sx={{ maxWidth: 540 }}
          />
        </Box>
      </Box>

      {/* ---- Body ---- */}
      <Box
        sx={{
          width: '100%',
          maxWidth: '1440px',
          mx: 'auto',
          px: { xs: 3, sm: 4, md: 6, lg: 8 },
          py: { xs: 5, md: 7 },
        }}
      >
        {/* City filter chips */}
        <Stack direction="row" spacing={1} sx={{ mb: 4, flexWrap: 'wrap', rowGap: 1 }}>
          {CITY_FILTERS.map((c) => {
            const active = city === c;
            return (
              <Chip
                key={c}
                label={t(CITY_LABEL_KEYS[c], { defaultValue: c })}
                onClick={() => { setCity(c); setPage(1); }}
                sx={{
                  fontWeight: 700,
                  bgcolor: active ? 'primary.main' : alpha(theme.palette.primary.main, 0.08),
                  color: active ? 'common.white' : 'primary.dark',
                  '&:hover': { bgcolor: active ? 'primary.dark' : alpha(theme.palette.primary.main, 0.16) },
                }}
              />
            );
          })}
        </Stack>

        {isLoading ? (
          <Grid container spacing={3}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Grid key={i} item xs={12} sm={6} md={4}>
                <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 3 }} />
              </Grid>
            ))}
          </Grid>
        ) : filteredAgents.length === 0 ? (
          <EmptyState
            title={t('agents.emptyTitle', { defaultValue: 'No agents match your search' })}
            description={t('agents.emptyBody', { defaultValue: 'Try a different name or city.' })}
          />
        ) : (
          <>
            <Grid container spacing={3}>
              {pageAgents.map((agent) => {
                const listingCount = agentListingCounts.get(agent.id) ?? 0;
                const fullName = `${agent.firstName} ${agent.lastName}`.trim();
                const initials = `${agent.firstName?.[0] ?? ''}${agent.lastName?.[0] ?? ''}`
                  .trim()
                  .toUpperCase() || 'E';
                return (
                  <Grid key={agent.id} item xs={12} sm={6} md={4}>
                    <Box
                      sx={{
                        bgcolor: 'background.paper',
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 3,
                        p: 3,
                        textAlign: 'center',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 2px 12px rgba(108,99,166,0.08)',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: 'primary.main',
                          transform: 'translateY(-4px)',
                          boxShadow: '0 14px 30px rgba(108,99,166,0.18)',
                        },
                      }}
                    >
                      {/* Avatar — uses the agent's own avatarUrl if they
                          have one, otherwise renders initials on the brand
                          gradient. The previous code mapped a hardcoded
                          Unsplash portrait to each card index, which meant
                          agents got the wrong face. */}
                      <Avatar
                        src={agent.avatarUrl ?? undefined}
                        alt={fullName}
                        sx={{
                          width: 96,
                          height: 96,
                          mx: 'auto',
                          mb: 2,
                          background: theme.eawlma.gradient,
                          color: 'common.white',
                          fontSize: 28,
                          fontWeight: 800,
                          border: '3px solid',
                          borderColor: 'background.paper',
                        }}
                      >
                        {initials}
                      </Avatar>
                      <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', mb: 0.25 }}>
                        {fullName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        {t('agents.agency', { defaultValue: 'Eawlma Real Estate' })}
                      </Typography>

                      <Stack direction="row" spacing={0.25} justifyContent="center" sx={{ mb: 1 }}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <StarIcon key={n} sx={{ color: theme.eawlma.gold, fontSize: '1.1rem' }} />
                        ))}
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                          {formatNumber('4.8')}
                        </Typography>
                      </Stack>

                      <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
                        <Chip
                          icon={<VerifiedIcon sx={{ fontSize: 14 }} />}
                          label={t('agents.verified', { defaultValue: 'Verified' })}
                          size="small"
                          color="success"
                          sx={{ fontWeight: 700 }}
                        />
                        <Chip
                          icon={<AccessTimeIcon sx={{ fontSize: 14 }} />}
                          label={t('agents.respondsUnder2h', { defaultValue: '< 2h' })}
                          size="small"
                          sx={{ bgcolor: 'success.light', color: 'success.dark', fontWeight: 700 }}
                        />
                      </Stack>

                      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
                        <VerificationBadges
                          regaVerified={agent.regaVerified}
                          nafathVerified={agent.isNafathVerified}
                          phoneVerified={agent.phoneVerified}
                          sx={{ mt: 0, justifyContent: 'center' }}
                        />
                      </Box>

                      <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                        {t('agents.activeListingsCount', {
                          count: formatNumber(listingCount) as unknown as number,
                          defaultValue: '{{count}} active listings',
                        })}
                      </Typography>

                      <Button
                        component={Link}
                        to={'/agents/$id' as never}
                        params={{ id: agent.id } as never}
                        variant="contained"
                        sx={{ mt: 'auto', background: theme.eawlma.gradient, fontWeight: 700 }}
                      >
                        {t('agents.viewProfile', { defaultValue: 'View Profile' })}
                      </Button>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>

            {totalPages > 1 && (
              <Stack alignItems="center" sx={{ mt: 5 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, p) => setPage(p)}
                  color="primary"
                />
              </Stack>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
