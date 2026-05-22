import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Drawer,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';
import LocationIcon from '@mui/icons-material/LocationOnOutlined';
import VrIcon from '@mui/icons-material/ViewInAr';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { type Listing, MediaType } from '@eawlma/shared-types';

import { adminApi } from '@/api/admin.api';
import { AdminLayout } from '@/components/Layout/AdminLayout';
import { PageHeader } from '@/components/global/PageHeader';
import { EmptyState } from '@/components/global/EmptyState';
import { ConfirmDialog } from '@/components/global/ConfirmDialog';

const PAGE_SIZE = 20;
const MAP_LIBS: ('places' | 'drawing' | 'geometry')[] = ['places', 'drawing', 'geometry'];

/**
 * Map an AI moderation score (0-100) to a colour band + label:
 * 0-20 green (clean), 21-50 yellow (minor), 51-80 orange (review),
 * 81-100 red (high risk).
 */
function scoreTone(score: number): {
  color: string;
  bg: string;
  labelKey: string;
  fallback: string;
} {
  if (score <= 20) {
    return { color: '#15803d', bg: 'rgba(34,197,94,0.15)', labelKey: 'moderation.aiClean', fallback: 'Clean' };
  }
  if (score <= 50) {
    return { color: '#a16207', bg: 'rgba(234,179,8,0.18)', labelKey: 'moderation.aiMinor', fallback: 'Minor' };
  }
  if (score <= 80) {
    return { color: '#c2410c', bg: 'rgba(249,115,22,0.18)', labelKey: 'moderation.aiReview', fallback: 'Review' };
  }
  return { color: '#b91c1c', bg: 'rgba(239,68,68,0.18)', labelKey: 'moderation.aiHighRisk', fallback: 'High Risk' };
}

/** Compact coloured pill showing a listing's AI moderation score. */
function ModerationScoreBadge({ score }: { score: number }) {
  const { t } = useTranslation();
  const tone = scoreTone(score);
  return (
    <Chip
      size="small"
      label={`${score} · ${t(tone.labelKey, tone.fallback)}`}
      sx={{ bgcolor: tone.bg, color: tone.color, fontWeight: 700, border: 'none' }}
    />
  );
}

export function ModerationPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false);

  const queueQuery = useQuery({
    queryKey: ['admin', 'pending', page],
    queryFn: () => adminApi.pendingListings({ page, limit: PAGE_SIZE }),
  });
  const items = queueQuery.data?.data ?? [];
  const active = items.find((l) => l.id === activeId) ?? null;

  // ---- mutations ------------------------------------------------
  const approveMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => adminApi.approveListing(id, note),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'pending'] });
      setActiveId(null);
    },
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.rejectListing(id, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'pending'] });
      setActiveId(null);
      setRejectingId(null);
      setRejectReason('');
    },
  });
  const bulkApproveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await adminApi.approveListing(id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'pending'] });
      setSelected(new Set());
      setBulkApproveOpen(false);
    },
  });

  // ---- selection ------------------------------------------------
  const toggleSelected = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const allChecked = items.length > 0 && items.every((l) => selected.has(l.id));
  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(items.map((l) => l.id)));
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>{t('admin.moderationQueue')} — {t('app.name')}</title>
      </Helmet>

      <PageHeader
        title={t('admin.moderationQueue')}
        subtitle={t('moderation.pendingCountSubtitle', { count: queueQuery.data?.meta.total ?? 0 })}
        action={
          selected.size > 0 ? (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckIcon />}
              onClick={() => setBulkApproveOpen(true)}
            >
              {t('moderation.bulkApprove', { count: selected.size })}
            </Button>
          ) : undefined
        }
      />

      <Paper sx={{ overflow: 'hidden' }}>
        {queueQuery.isLoading ? (
          <Stack spacing={1} sx={{ p: 2 }}>
            {[...Array(6)].map((_, i) => <Skeleton key={i} height={48} />)}
          </Stack>
        ) : items.length === 0 ? (
          <EmptyState title={t('moderation.allCaughtUp')} description={t('moderation.queueEmpty')} />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox checked={allChecked} onChange={toggleAll} />
                </TableCell>
                <TableCell />
                <TableCell>{t('moderation.colTitle')}</TableCell>
                <TableCell>{t('moderation.colReference')}</TableCell>
                <TableCell>{t('moderation.colType')}</TableCell>
                <TableCell>{t('moderation.colAiScore', 'AI Score')}</TableCell>
                <TableCell>{t('moderation.colCity')}</TableCell>
                <TableCell align="right">{t('moderation.colPrice')}</TableCell>
                <TableCell>{t('moderation.colSubmitted')}</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((l) => (
                <TableRow
                  key={l.id}
                  hover
                  selected={l.id === activeId}
                  onClick={() => setActiveId(l.id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selected.has(l.id)} onChange={() => toggleSelected(l.id)} />
                  </TableCell>
                  <TableCell sx={{ width: 64 }}>
                    {l.media?.[0] ? (
                      <Box
                        sx={{
                          width: 48,
                          height: 36,
                          borderRadius: 1,
                          backgroundImage: `url(${l.media[0].thumbnailUrl ?? l.media[0].url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                    ) : (
                      <ImageIcon color="disabled" />
                    )}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 320 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{l.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('moderation.ownerLabel', { ownerShort: l.ownerId.slice(0, 8) })}
                    </Typography>
                  </TableCell>
                  <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{l.referenceCode}</Typography></TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{l.propertyType}</TableCell>
                  <TableCell><ModerationScoreBadge score={l.moderationScore ?? 0} /></TableCell>
                  <TableCell>{l.city}{l.district ? ` · ${l.district}` : ''}</TableCell>
                  <TableCell align="right">{Number(l.price).toLocaleString(i18n.language)} {t('listing.currency')}</TableCell>
                  <TableCell>{new Date(l.createdAt).toLocaleDateString(i18n.language)}</TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => approveMutation.mutate({ id: l.id })}
                        aria-label="approve"
                      >
                        <CheckIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setRejectingId(l.id)}
                        aria-label="reject"
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Slide-in preview drawer */}
      <Drawer
        anchor="right"
        open={!!active}
        onClose={() => setActiveId(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 520, md: 640 } } }}
      >
        {active && <ListingPreview listing={active} onApprove={() => approveMutation.mutate({ id: active.id })} onReject={() => setRejectingId(active.id)} onClose={() => setActiveId(null)} />}
      </Drawer>

      {/* Reject dialog */}
      <ConfirmDialog
        open={Boolean(rejectingId)}
        title={t('moderation.rejectTitle')}
        description={(
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {t('moderation.rejectDescription')}
            </Typography>
            <TextField
              label={t('moderation.rejectReasonLabel')}
              fullWidth
              multiline
              minRows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              autoFocus
            />
          </Stack>
        )}
        destructive
        confirmLabel={t('moderation.rejectConfirm')}
        loading={rejectMutation.isPending}
        onConfirm={() => {
          if (!rejectingId) return;
          if (rejectReason.trim().length < 5) return;
          rejectMutation.mutate({ id: rejectingId, reason: rejectReason.trim() });
        }}
        onCancel={() => { setRejectingId(null); setRejectReason(''); }}
      />

      {/* Bulk-approve dialog */}
      <ConfirmDialog
        open={bulkApproveOpen}
        title={t('moderation.bulkApproveTitle', { count: selected.size })}
        description={t('moderation.bulkApproveDescription')}
        confirmLabel={t('moderation.bulkApproveConfirm')}
        loading={bulkApproveMutation.isPending}
        onConfirm={() => bulkApproveMutation.mutate(Array.from(selected))}
        onCancel={() => setBulkApproveOpen(false)}
      />

      {(approveMutation.isError || rejectMutation.isError || bulkApproveMutation.isError) && (
        <Alert severity="error">
          {t('moderation.actionFailed')}
        </Alert>
      )}
    </AdminLayout>
  );
}

function ListingPreview({
  listing,
  onApprove,
  onReject,
  onClose,
}: {
  listing: Listing;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
  // Language-aware loader so the map UI matches the active app language.
  const { isLoaded } = useGoogleMaps({ apiKey, libraries: MAP_LIBS, language: i18n.language });
  const tour = listing.media.find((m) => m.type === MediaType.TOUR_360);
  const images = listing.media.filter((m) => m.type === MediaType.IMAGE);

  return (
    <Box sx={{ p: 3, overflowY: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{listing.referenceCode}</Typography>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Stack>

      {/* Image gallery (up to 6) */}
      {images.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 2 }}>
          {images.slice(0, 6).map((m) => (
            <Box
              key={m.id}
              sx={{
                aspectRatio: '4 / 3',
                borderRadius: 1.5,
                backgroundImage: `url(${m.thumbnailUrl ?? m.url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          ))}
        </Box>
      )}

      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>{listing.title}</Typography>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, color: 'text.secondary' }}>
        <LocationIcon fontSize="small" />
        <Typography variant="body2">{listing.city}{listing.district ? `, ${listing.district}` : ''}</Typography>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
        <Chip size="small" label={listing.type} sx={{ textTransform: 'capitalize' }} />
        <Chip size="small" label={listing.propertyType} sx={{ textTransform: 'capitalize' }} />
        {listing.bedrooms !== null && (
          <Chip size="small" label={t('moderation.preview.bedroomsShort', { count: listing.bedrooms })} />
        )}
        {listing.bathrooms !== null && (
          <Chip size="small" label={t('moderation.preview.bathroomsShort', { count: listing.bathrooms })} />
        )}
        {listing.area !== null && <Chip size="small" label={`${listing.area} ${t('listing.areaUnit')}`} />}
        {tour && (
          <Chip size="small" color="secondary" icon={<VrIcon />} label={t('moderation.preview.vrTourAvailable')} />
        )}
      </Stack>

      <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 800, mb: 1 }}>
        {Number(listing.price).toLocaleString(i18n.language)} {t('listing.currency')}
      </Typography>

      <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: 'text.secondary', mb: 3 }}>
        {listing.description}
      </Typography>

      {tour && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="overline" color="text.secondary">{t('moderation.preview.vrTourSection')}</Typography>
          <Box sx={{ borderRadius: 2, overflow: 'hidden', mt: 0.5 }}>
            <model-viewer
              src={tour.url}
              auto-rotate
              camera-controls
              style={{ width: '100%', height: 280, backgroundColor: '#000' }}
            />
          </Box>
        </Box>
      )}

      <Box sx={{ mb: 3 }}>
        <Typography variant="overline" color="text.secondary">{t('moderation.preview.locationSection')}</Typography>
        {!apiKey || !isLoaded ? (
          <Box sx={{ height: 200, bgcolor: 'grey.100', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="caption" color="text.secondary">{t('moderation.preview.mapUnavailable')}</Typography>
          </Box>
        ) : (
          <Box sx={{ height: 200, borderRadius: 2, overflow: 'hidden', mt: 0.5 }}>
            <GoogleMap
              center={{ lat: Number(listing.lat), lng: Number(listing.lng) }}
              zoom={14}
              mapContainerStyle={{ width: '100%', height: '100%' }}
              options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
            >
              <MarkerF position={{ lat: Number(listing.lat), lng: Number(listing.lng) }} />
            </GoogleMap>
          </Box>
        )}
      </Box>

      {/* AI moderation verdict */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="overline" color="text.secondary">
          {t('moderation.preview.aiSection', 'AI Moderation')}
        </Typography>
        <Box
          sx={{
            mt: 0.5,
            p: 2,
            borderRadius: 2,
            bgcolor: scoreTone(listing.moderationScore ?? 0).bg,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', rowGap: 0.5 }}>
            <ModerationScoreBadge score={listing.moderationScore ?? 0} />
            {listing.moderationCategory && (
              <Chip
                size="small"
                label={listing.moderationCategory}
                sx={{ textTransform: 'capitalize' }}
              />
            )}
            {listing.requiresReview && (
              <Chip size="small" color="warning" label={t('moderation.preview.flaggedForReview', 'Flagged for review')} />
            )}
          </Stack>
          {listing.moderationReasons && listing.moderationReasons.length > 0 ? (
            <Stack component="ul" sx={{ m: 0, pl: 2.5 }} spacing={0.25}>
              {listing.moderationReasons.map((r, i) => (
                <Typography key={i} component="li" variant="body2" color="text.secondary">
                  {r}
                </Typography>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t('moderation.preview.noFlags', 'No issues flagged by AI moderation.')}
            </Typography>
          )}
        </Box>
      </Box>

      <Stack direction="row" spacing={1}>
        <Button fullWidth variant="contained" color="success" startIcon={<CheckIcon />} onClick={onApprove}>
          {t('moderation.preview.approve')}
        </Button>
        <Button fullWidth variant="outlined" color="error" startIcon={<CloseIcon />} onClick={onReject}>
          {t('moderation.preview.reject')}
        </Button>
      </Stack>
    </Box>
  );
}
