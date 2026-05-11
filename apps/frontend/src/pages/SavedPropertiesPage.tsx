import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/FavoriteBorder';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import { wishlistsApi, type WishlistSummary } from '@/api/wishlists.api';
import { ListingCard } from '@/components/global/ListingCard';
import { SkeletonCard } from '@/components/global/SkeletonCard';
import { EmptyState } from '@/components/global/EmptyState';
import { PageHeader } from '@/components/global/PageHeader';
import { useAuthStore } from '@/store/auth.store';
import { useSavedStore } from '@/store/saved.store';

export function SavedPropertiesPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isRtl = theme.direction === 'rtl';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const localIds = useSavedStore((s) => s.ids);

  // selectedListId === null means "show all wishlist cards"; once chosen the
  // grid mounts the listings inside that specific wishlist.
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('');
  const [renameTarget, setRenameTarget] = useState<WishlistSummary | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const myQuery = useQuery({
    queryKey: ['wishlists', 'mine'],
    queryFn: wishlistsApi.mine,
    enabled: isAuthenticated,
  });

  const itemsQuery = useQuery({
    queryKey: ['wishlists', 'items', selectedListId],
    queryFn: () => wishlistsApi.items(selectedListId!),
    enabled: isAuthenticated && Boolean(selectedListId),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; emoji?: string }) =>
      wishlistsApi.create(data.name, data.emoji || undefined),
    onSuccess: () => {
      setCreateOpen(false);
      setNewName('');
      setNewEmoji('');
      queryClient.invalidateQueries({ queryKey: ['wishlists', 'mine'] });
    },
  });

  const renameMutation = useMutation({
    mutationFn: (data: { id: string; name: string }) =>
      wishlistsApi.rename(data.id, data.name),
    onSuccess: () => {
      setRenameTarget(null);
      setRenameValue('');
      queryClient.invalidateQueries({ queryKey: ['wishlists', 'mine'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => wishlistsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlists', 'mine'] });
    },
  });

  const lists = myQuery.data ?? [];
  const selectedList = lists.find((l) => l.id === selectedListId) ?? null;
  const listings = itemsQuery.data ?? [];

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createMutation.mutate({ name: trimmed, emoji: newEmoji.trim() });
  };

  const handleRename = () => {
    if (!renameTarget) return;
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    renameMutation.mutate({ id: renameTarget.id, name: trimmed });
  };

  const handleDelete = (list: WishlistSummary) => {
    if (list.isDefault) return;
    const confirmed = window.confirm(
      t('wishlist.confirmDelete', {
        defaultValue: 'Delete this wishlist?',
      }),
    );
    if (confirmed) deleteMutation.mutate(list.id);
  };

  return (
    <Container
      maxWidth={false}
      sx={{
        maxWidth: 1440,
        mx: 'auto',
        px: { xs: 3, sm: 4, md: 6, lg: 8 },
        py: { xs: 3, md: 4 },
      }}
    >
      <Helmet>
        <title>{t('nav.favorites')} — {t('app.name')}</title>
      </Helmet>

      {!isAuthenticated ? (
        <>
          <PageHeader title={t('nav.favorites')} />
          <Box sx={{ mt: 4 }}>
            <EmptyState
              title={
                localIds.length === 0
                  ? t('empty.noFavorites')
                  : t('wishlist.signInToSync', { defaultValue: 'Sign in to sync your favorites' })
              }
              description={
                localIds.length === 0
                  ? t('home.heroSubtitle')
                  : t('wishlist.signInDesc', {
                      defaultValue:
                        'Your saved listings are kept on this device. Sign in to access them across all your devices.',
                    })
              }
              icon={<FavoriteIcon sx={{ fontSize: 32 }} />}
              ctaLabel={localIds.length === 0 ? t('empty.noFavoritesCta') : t('auth.login')}
              onCta={() =>
                navigate({
                  to: localIds.length === 0 ? '/search' : ('/auth/login' as never),
                })
              }
            />
          </Box>
        </>
      ) : selectedList ? (
        // ---- Detail: a single wishlist's listings -------------------------
        <>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <IconButton
              onClick={() => setSelectedListId(null)}
              aria-label="back"
              size="small"
            >
              <ArrowBackIcon sx={{ transform: isRtl ? 'scaleX(-1)' : 'none' }} />
            </IconButton>
            <Typography variant="h4" sx={{ fontWeight: 700, flex: 1 }}>
              {selectedList.emoji ? `${selectedList.emoji} ` : ''}
              {selectedList.name}
            </Typography>
            <Typography color="text.secondary">
              {selectedList.itemCount} {t('wishlist.items', { defaultValue: 'items' })}
            </Typography>
          </Stack>

          {itemsQuery.isLoading ? (
            <Grid container spacing={3}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Grid key={i} item xs={12} sm={6} md={4}>
                  <SkeletonCard />
                </Grid>
              ))}
            </Grid>
          ) : listings.length === 0 ? (
            <EmptyState
              title={t('wishlist.listEmpty', { defaultValue: 'This wishlist is empty' })}
              description={t('wishlist.listEmptyDesc', {
                defaultValue: 'Browse listings and tap the heart to save them here.',
              })}
              icon={<FavoriteIcon sx={{ fontSize: 32 }} />}
              ctaLabel={t('empty.noFavoritesCta')}
              onCta={() => navigate({ to: '/search' })}
            />
          ) : (
            <Grid container spacing={3}>
              {listings.map((listing) => (
                <Grid key={listing.id} item xs={12} sm={6} md={4}>
                  <ListingCard listing={listing} saved />
                </Grid>
              ))}
            </Grid>
          )}
        </>
      ) : (
        // ---- Index: all wishlists as cover-grid cards ---------------------
        <>
          <PageHeader
            title={t('nav.favorites')}
            subtitle={
              lists.length > 0
                ? `${lists.length} ${t('wishlist.lists', { defaultValue: 'wishlists' })}`
                : undefined
            }
            action={
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateOpen(true)}
              >
                {t('wishlist.createNew', { defaultValue: 'Create new wishlist' })}
              </Button>
            }
          />

          <Box sx={{ mt: 4 }}>
            {myQuery.isLoading ? (
              <Grid container spacing={3}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Grid key={i} item xs={12} sm={6} md={4}>
                    <SkeletonCard />
                  </Grid>
                ))}
              </Grid>
            ) : lists.length === 0 ? (
              <EmptyState
                title={t('empty.noFavorites')}
                description={t('home.heroSubtitle')}
                icon={<FavoriteIcon sx={{ fontSize: 32 }} />}
                ctaLabel={t('empty.noFavoritesCta')}
                onCta={() => navigate({ to: '/search' })}
              />
            ) : (
              <Grid container spacing={3}>
                {lists.map((list) => (
                  <Grid key={list.id} item xs={12} sm={6} md={4}>
                    <WishlistCard
                      list={list}
                      onOpen={() => setSelectedListId(list.id)}
                      onRename={() => {
                        setRenameTarget(list);
                        setRenameValue(list.name);
                      }}
                      onDelete={() => handleDelete(list)}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>
          {t('wishlist.createNew', { defaultValue: 'Create new wishlist' })}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t('wishlist.name', { defaultValue: 'Name' })}
              fullWidth
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <TextField
              label={t('wishlist.emoji', { defaultValue: 'Emoji (optional)' })}
              fullWidth
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
              inputProps={{ maxLength: 4 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!newName.trim() || createMutation.isPending}
          >
            {t('common.create', { defaultValue: 'Create' })}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={Boolean(renameTarget)} onClose={() => setRenameTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>
          {t('wishlist.rename', { defaultValue: 'Rename wishlist' })}
        </DialogTitle>
        <DialogContent>
          <TextField
            label={t('wishlist.name', { defaultValue: 'Name' })}
            fullWidth
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameTarget(null)}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            variant="contained"
            onClick={handleRename}
            disabled={!renameValue.trim() || renameMutation.isPending}
          >
            {t('common.save', { defaultValue: 'Save' })}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

// ----- Wishlist card --------------------------------------------------------

interface WishlistCardProps {
  list: WishlistSummary;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}

function WishlistCard({ list, onOpen, onRename, onDelete }: WishlistCardProps) {
  const { t } = useTranslation();
  return (
    <Box
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      sx={{
        cursor: 'pointer',
        borderRadius: 4,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        '&:hover': { boxShadow: '0 12px 28px rgba(108,99,166,0.18)', transform: 'translateY(-2px)' },
      }}
    >
      <Box
        sx={{
          height: 180,
          background:
            'linear-gradient(135deg, rgba(108,99,166,0.18) 0%, rgba(247,184,1,0.18) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 64,
        }}
      >
        {list.emoji ?? '⭐'}
      </Box>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center">
          <Typography sx={{ fontWeight: 700, flex: 1 }} noWrap>
            {list.name}
          </Typography>
          {!list.isDefault && (
            <Stack direction="row" spacing={0.5}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onRename();
                }}
                aria-label="rename"
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                aria-label="delete"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {list.itemCount} {t('wishlist.items', { defaultValue: 'items' })}
          {list.isDefault && (
            <Typography
              component="span"
              variant="caption"
              sx={{
                ml: 1,
                bgcolor: 'primary.main',
                color: 'common.white',
                px: 0.75,
                borderRadius: 1,
                fontWeight: 700,
              }}
            >
              {t('wishlist.default', { defaultValue: 'Default' })}
            </Typography>
          )}
        </Typography>
      </Box>
    </Box>
  );
}
