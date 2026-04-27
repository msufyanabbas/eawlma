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
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { type Listing, MediaType } from '@aqarat/shared-types';

import { adminApi } from '@/api/admin.api';
import { AdminLayout } from '@/components/Layout/AdminLayout';
import { PageHeader } from '@/components/global/PageHeader';
import { EmptyState } from '@/components/global/EmptyState';
import { ConfirmDialog } from '@/components/global/ConfirmDialog';

const PAGE_SIZE = 20;
const MAP_LIBS: ('places')[] = ['places'];

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
        subtitle={`${queueQuery.data?.meta.total ?? 0} pending`}
        action={
          selected.size > 0 ? (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckIcon />}
              onClick={() => setBulkApproveOpen(true)}
            >
              Bulk approve ({selected.size})
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
          <EmptyState title="All caught up! 🎉" description="The moderation queue is empty." />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox checked={allChecked} onChange={toggleAll} />
                </TableCell>
                <TableCell />
                <TableCell>Title</TableCell>
                <TableCell>Reference</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>City</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell>Submitted</TableCell>
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
                      Owner {l.ownerId.slice(0, 8)}
                    </Typography>
                  </TableCell>
                  <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{l.referenceCode}</Typography></TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{l.propertyType}</TableCell>
                  <TableCell>{l.city}{l.district ? ` · ${l.district}` : ''}</TableCell>
                  <TableCell align="right">{Number(l.price).toLocaleString(i18n.language)} SAR</TableCell>
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
        title="Reject listing"
        description={(
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              The reason is sent to the agent in their notification and via email.
            </Typography>
            <TextField
              label="Reason"
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
        confirmLabel="Reject listing"
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
        title={`Approve ${selected.size} listing(s)?`}
        description="They'll go live immediately and the agent will be notified."
        confirmLabel="Approve all"
        loading={bulkApproveMutation.isPending}
        onConfirm={() => bulkApproveMutation.mutate(Array.from(selected))}
        onCancel={() => setBulkApproveOpen(false)}
      />

      {(approveMutation.isError || rejectMutation.isError || bulkApproveMutation.isError) && (
        <Alert severity="error">
          A moderation action failed — try again.
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
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey, libraries: MAP_LIBS });
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
        {listing.bedrooms !== null && <Chip size="small" label={`${listing.bedrooms} BR`} />}
        {listing.bathrooms !== null && <Chip size="small" label={`${listing.bathrooms} BA`} />}
        {listing.area !== null && <Chip size="small" label={`${listing.area} m²`} />}
        {tour && (
          <Chip size="small" color="secondary" icon={<VrIcon />} label="VR tour available" />
        )}
      </Stack>

      <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 800, mb: 1 }}>
        {Number(listing.price).toLocaleString()} SAR
      </Typography>

      <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: 'text.secondary', mb: 3 }}>
        {listing.description}
      </Typography>

      {tour && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="overline" color="text.secondary">VR / 360° tour</Typography>
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
        <Typography variant="overline" color="text.secondary">Location</Typography>
        {!apiKey || !isLoaded ? (
          <Box sx={{ height: 200, bgcolor: 'grey.100', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="caption" color="text.secondary">Map preview unavailable</Typography>
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

      <Stack direction="row" spacing={1}>
        <Button fullWidth variant="contained" color="success" startIcon={<CheckIcon />} onClick={onApprove}>
          Approve
        </Button>
        <Button fullWidth variant="outlined" color="error" startIcon={<CloseIcon />} onClick={onReject}>
          Reject
        </Button>
      </Stack>
    </Box>
  );
}
