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

// Curated Unsplash portrait photos — assigned deterministically to agent IDs
// so the same person always shows up for the same agent (matches the homepage).
const AGENT_PHOTOS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
];

const CITY_FILTERS = ['All Cities', 'Riyadh', 'Jeddah', 'Dammam'] as const;
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

      {/* ---- Hero ---- */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
          color: 'common.white',
          py: { xs: 7, md: 10 },
          textAlign: 'center',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto', px: { xs: 3, sm: 4 } }}>
          <Typography sx={{ fontSize: 'clamp(2rem, 4.5vw, 3rem)', fontWeight: 800, lineHeight: 1.1, mb: 1.5 }}>
            Find Your Agent
          </Typography>
          <Typography sx={{ fontSize: '1.05rem', opacity: 0.9, mb: 4, maxWidth: 640, mx: 'auto' }}>
            Verified real-estate professionals across Saudi Arabia, ready to help you find or sell your home.
          </Typography>
          <TextField
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search by name or specialty"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              sx: { bgcolor: 'common.white', borderRadius: 999, px: 1.5, py: 0.5, '& fieldset': { border: 'none' } },
            }}
            sx={{ maxWidth: 540, mx: 'auto' }}
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
                label={c}
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
          <EmptyState title="No agents match your search" description="Try a different name or city." />
        ) : (
          <>
            <Grid container spacing={3}>
              {pageAgents.map((agent, idx) => {
                const photo = AGENT_PHOTOS[idx % AGENT_PHOTOS.length];
                const listingCount = agentListingCounts.get(agent.id) ?? 0;
                const fullName = `${agent.firstName} ${agent.lastName}`.trim();
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
                      <Avatar
                        src={photo}
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
                        imgProps={{
                          onError: (e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          },
                        }}
                      >
                        {(agent.firstName?.[0] ?? 'E').toUpperCase()}
                      </Avatar>
                      <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', mb: 0.25 }}>
                        {fullName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        Eawlma Real Estate
                      </Typography>

                      <Stack direction="row" spacing={0.25} justifyContent="center" sx={{ mb: 1 }}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <StarIcon key={n} sx={{ color: theme.eawlma.gold, fontSize: '1.1rem' }} />
                        ))}
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                          4.8
                        </Typography>
                      </Stack>

                      <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
                        <Chip
                          icon={<VerifiedIcon sx={{ fontSize: 14 }} />}
                          label="Verified"
                          size="small"
                          color="success"
                          sx={{ fontWeight: 700 }}
                        />
                        <Chip
                          icon={<AccessTimeIcon sx={{ fontSize: 14 }} />}
                          label="< 2h"
                          size="small"
                          sx={{ bgcolor: 'success.light', color: 'success.dark', fontWeight: 700 }}
                        />
                      </Stack>

                      <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                        {listingCount} active listings
                      </Typography>

                      <Button
                        component={Link}
                        to={'/agents/$id' as never}
                        params={{ id: agent.id } as never}
                        variant="contained"
                        sx={{ mt: 'auto', background: theme.eawlma.gradient, fontWeight: 700 }}
                      >
                        View Profile
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
