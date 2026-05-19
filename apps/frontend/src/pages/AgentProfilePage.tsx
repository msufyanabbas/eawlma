import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Rating,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/VerifiedRounded';
import BusinessIcon from '@mui/icons-material/Business';
import StarIcon from '@mui/icons-material/Star';
import ChatIcon from '@mui/icons-material/ChatBubbleOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTimeOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { searchApi } from '@/api/search.api';
import { agentsApi } from '@/api/agents.api';
import { reviewsApi } from '@/api/reviews.api';
import { ListingCard } from '@/components/global/ListingCard';
import { SkeletonCard } from '@/components/global/SkeletonCard';
import { EmptyState } from '@/components/global/EmptyState';
import { useAuthStore } from '@/store/auth.store';

export function AgentProfilePage() {
  const { t } = useTranslation();
  const params = useParams({ strict: false }) as { id?: string };
  const agentId = params.id ?? '';
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const handleMessageAgent = () => {
    if (!isAuthenticated) {
      const returnTo = encodeURIComponent(window.location.pathname);
      void navigate({ to: `/login?returnTo=${returnTo}` as never });
      return;
    }
    // Deep-link the dashboard messages page to this agent so it auto-selects
    // the existing thread (or shows a "Start conversation" prompt if none).
    void navigate({ to: `/dashboard/messages?agentId=${agentId}` as never });
  };

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
    return 'Eawlma Agent';
  }, [agent]);

  const initials = useMemo(() => {
    const first = agent?.firstName?.[0] ?? 'E';
    const second = agent?.lastName?.[0] ?? '';
    return `${first}${second}`.toUpperCase();
  }, [agent]);

  const memberSinceYear = agent?.memberSince
    ? new Date(agent.memberSince).getFullYear().toString()
    : '—';

  // ----- Reviews (real, paginated, with rating distribution) ---------
  const qc = useQueryClient();
  const reviewsQuery = useQuery({
    queryKey: ['reviews', agentId],
    queryFn: () => reviewsApi.forAgent(agentId, 1, 50),
    enabled: Boolean(agentId),
  });
  const reviews = reviewsQuery.data?.reviews ?? [];
  const reviewSummary = reviewsQuery.data;

  const [writeOpen, setWriteOpen] = useState(false);
  const [draftRating, setDraftRating] = useState<number>(5);
  const [draftComment, setDraftComment] = useState('');
  const [reviewToast, setReviewToast] = useState<{ open: boolean; ok: boolean; msg: string }>({
    open: false, ok: true, msg: '',
  });

  const createReviewMutation = useMutation({
    mutationFn: () => reviewsApi.create(agentId, { rating: draftRating, comment: draftComment }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reviews', agentId] });
      setReviewToast({ open: true, ok: true, msg: 'Review posted — thank you!' });
      setWriteOpen(false);
      setDraftComment('');
      setDraftRating(5);
    },
    onError: (err) => {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setReviewToast({
        open: true,
        ok: false,
        msg: e.response?.data?.message ?? e.message ?? 'Could not post review',
      });
    },
  });

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

      <Container
        maxWidth={false}
        sx={{
          maxWidth: 1440,
          mx: 'auto',
          px: { xs: 3, sm: 4, md: 6, lg: 8 },
          mt: { xs: -8, md: -10 },
          pb: 6,
        }}
      >
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
                <Chip
                  icon={<AccessTimeIcon />}
                  label="Responds within 2 hours"
                  size="small"
                  sx={{
                    bgcolor: 'success.light',
                    color: 'success.dark',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    '& .MuiChip-icon': { color: 'success.dark' },
                  }}
                />
                {(() => {
                  // PublicAgentDto may be extended with licenseNumber server-side;
                  // accept it via a loose cast so the badge appears as soon as the
                  // backend exposes it without requiring a frontend type bump.
                  const licenseNumber = (agent as unknown as { licenseNumber?: string } | undefined)?.licenseNumber;
                  if (!licenseNumber) return null;
                  return (
                    <Chip
                      icon={<VerifiedIcon sx={{ fontSize: 14 }} />}
                      label={`REGA · ${licenseNumber}`}
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                  );
                })()}
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                <BusinessIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                Eawlma Real Estate
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
                Bilingual real-estate professional helping buyers and renters find the right home
                across Saudi Arabia. Specialising in Riyadh, Jeddah, and Dammam markets.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <Button
                startIcon={<ChatIcon />}
                variant="outlined"
                onClick={handleMessageAgent}
              >
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

        {/* Reviews — real data from /agents/:id/reviews */}
        <Box sx={{ mt: 5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Reviews{' '}
              {reviewSummary && (
                <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '1rem' }}>
                  · {reviewSummary.totalReviews}
                </Box>
              )}
            </Typography>
            {isAuthenticated && (
              <Button variant="outlined" onClick={() => setWriteOpen(true)}>
                Write a review
              </Button>
            )}
          </Stack>

          {reviewsQuery.isLoading ? (
            <Paper sx={{ p: 4 }}>
              <Skeleton width="60%" />
              <Skeleton width="80%" sx={{ mt: 1 }} />
            </Paper>
          ) : (reviewSummary?.totalReviews ?? 0) === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Stack spacing={1} alignItems="center">
                <Rating value={0} readOnly />
                <Typography variant="body2" color="text.secondary">
                  No reviews yet.
                  {isAuthenticated ? ' Be the first to share your experience.' : ''}
                </Typography>
              </Stack>
            </Paper>
          ) : (
            <>
              {/* Rating summary */}
              <Paper sx={{ p: 3, mb: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }}>
                  <Box sx={{ textAlign: 'center', minWidth: 120 }}>
                    <Typography sx={{ fontSize: '2.5rem', fontWeight: 800, color: 'primary.dark', lineHeight: 1 }}>
                      {reviewSummary?.averageRating.toFixed(1)}
                    </Typography>
                    <Rating value={reviewSummary?.averageRating ?? 0} readOnly precision={0.1} />
                    <Typography variant="caption" color="text.secondary">
                      {reviewSummary?.totalReviews} review{(reviewSummary?.totalReviews ?? 0) === 1 ? '' : 's'}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = (reviewSummary?.ratingDistribution[star as 1 | 2 | 3 | 4 | 5] ?? 0);
                      const pct = (reviewSummary?.totalReviews ?? 0) > 0
                        ? (count / (reviewSummary?.totalReviews ?? 1)) * 100
                        : 0;
                      return (
                        <Stack key={star} direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
                          <Typography sx={{ fontSize: '0.85rem', minWidth: 12 }}>{star}</Typography>
                          <StarIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                          <Box sx={{ flex: 1, height: 6, bgcolor: 'action.hover', borderRadius: 1, overflow: 'hidden' }}>
                            <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: 'primary.main' }} />
                          </Box>
                          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', minWidth: 24, textAlign: 'end' }}>
                            {count}
                          </Typography>
                        </Stack>
                      );
                    })}
                  </Box>
                </Stack>
              </Paper>

              {/* Review list */}
              <Stack spacing={1.5}>
                {reviews.map((r) => (
                  <Paper key={r.id} sx={{ p: 3 }}>
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', color: 'common.white', fontWeight: 700 }}>
                        {(r.reviewer?.firstName?.[0] ?? '?').toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
                          <Typography sx={{ fontWeight: 700 }}>
                            {r.reviewer ? `${r.reviewer.firstName} ${r.reviewer.lastName}` : 'Anonymous'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </Typography>
                        </Stack>
                        <Rating value={r.rating} readOnly size="small" sx={{ mt: 0.25 }} />
                        <Typography sx={{ mt: 1, color: 'text.primary', whiteSpace: 'pre-line' }}>
                          {r.comment}
                        </Typography>
                        {r.reply && (
                          <Box sx={{ mt: 1.5, p: 2, bgcolor: 'action.hover', borderRadius: 2, borderInlineStart: 3, borderColor: 'primary.main' }}>
                            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'primary.dark', mb: 0.5 }}>
                              Reply from {agent ? `${agent.firstName} ${agent.lastName}` : 'agent'}
                            </Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                              {r.reply}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </>
          )}
        </Box>
      </Container>

      {/* Write review dialog */}
      <Dialog open={writeOpen} onClose={() => setWriteOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>
          Write a review for {agent ? `${agent.firstName} ${agent.lastName}` : 'this agent'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Box>
              <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', mb: 0.5 }}>
                Your rating
              </Typography>
              <Rating value={draftRating} onChange={(_, v) => setDraftRating(v ?? 5)} size="large" />
            </Box>
            <TextField
              label="Your review"
              multiline
              minRows={4}
              value={draftComment}
              onChange={(e) => setDraftComment(e.target.value)}
              placeholder="Share what was helpful, professional, or could improve…"
              fullWidth
            />
            {createReviewMutation.isError && (
              <Alert severity="error">{reviewToast.msg || t('agentReview.postFailed')}</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setWriteOpen(false)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            disabled={draftComment.trim().length < 10 || createReviewMutation.isPending}
            onClick={() => createReviewMutation.mutate()}
          >
            {createReviewMutation.isPending ? t('agentReview.posting') : t('agentReview.postReview')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={reviewToast.open}
        autoHideDuration={3500}
        onClose={() => setReviewToast((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={reviewToast.ok ? 'success' : 'error'}
          variant="filled"
          onClose={() => setReviewToast((s) => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {reviewToast.msg}
        </Alert>
      </Snackbar>
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
