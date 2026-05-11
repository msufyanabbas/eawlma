import {
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/CheckCircle';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { wishlistsApi, type WishlistSummary } from '@/api/wishlists.api';
import { GA } from '@/utils/analytics';

interface Props {
  listingId: string;
  /** Tooltip override for the trigger icon. */
  tooltipSaved?: string;
  tooltipSave?: string;
  /** Size override forwarded to MUI IconButton. */
  size?: 'small' | 'medium' | 'large';
}

/**
 * Heart-icon trigger + Airbnb-style popover listing the user's wishlists. The
 * `saved` state is derived from whether *any* wishlist contains the listing;
 * the same listing can belong to multiple lists (the popover shows a check
 * next to each list it sits in).
 */
export function SaveToWishlistButton({
  listingId,
  tooltipSave,
  tooltipSaved,
  size = 'small',
}: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [creatingName, setCreatingName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const query = useQuery({
    queryKey: ['wishlists', 'mine'],
    queryFn: wishlistsApi.mine,
  });

  const lists = query.data ?? [];
  const containingLists = lists.filter((l) => l.listingIds.includes(listingId));
  const isSaved = containingLists.length > 0;

  const addMutation = useMutation({
    mutationFn: (wishlistId: string) => {
      GA.saveListing(listingId);
      return wishlistsApi.addItem(wishlistId, listingId);
    },
    onMutate: async (wishlistId) => {
      await queryClient.cancelQueries({ queryKey: ['wishlists', 'mine'] });
      const previous = queryClient.getQueryData<WishlistSummary[]>(['wishlists', 'mine']);
      if (previous) {
        queryClient.setQueryData<WishlistSummary[]>(
          ['wishlists', 'mine'],
          previous.map((l) =>
            l.id === wishlistId && !l.listingIds.includes(listingId)
              ? { ...l, listingIds: [...l.listingIds, listingId], itemCount: l.itemCount + 1 }
              : l,
          ),
        );
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['wishlists', 'mine'], ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlists', 'mine'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (wishlistId: string) => wishlistsApi.removeItem(wishlistId, listingId),
    onMutate: async (wishlistId) => {
      await queryClient.cancelQueries({ queryKey: ['wishlists', 'mine'] });
      const previous = queryClient.getQueryData<WishlistSummary[]>(['wishlists', 'mine']);
      if (previous) {
        queryClient.setQueryData<WishlistSummary[]>(
          ['wishlists', 'mine'],
          previous.map((l) =>
            l.id === wishlistId
              ? {
                  ...l,
                  listingIds: l.listingIds.filter((id) => id !== listingId),
                  itemCount: Math.max(0, l.itemCount - 1),
                }
              : l,
          ),
        );
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['wishlists', 'mine'], ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlists', 'mine'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const created = await wishlistsApi.create(name);
      await wishlistsApi.addItem(created.id, listingId);
      return created;
    },
    onSuccess: () => {
      setCreatingName('');
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['wishlists', 'mine'] });
    },
  });

  const handleTrigger = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    e.preventDefault();
    setAnchorEl(e.currentTarget);
  };

  const close = () => {
    setAnchorEl(null);
    setShowCreate(false);
    setCreatingName('');
  };

  const toggleList = (list: WishlistSummary) => {
    const inIt = list.listingIds.includes(listingId);
    if (inIt) removeMutation.mutate(list.id);
    else addMutation.mutate(list.id);
  };

  const handleCreate = () => {
    const name = creatingName.trim();
    if (!name) return;
    createMutation.mutate(name);
  };

  return (
    <>
      <Tooltip title={isSaved ? (tooltipSaved ?? t('listing.saved')) : (tooltipSave ?? t('listing.save'))}>
        <IconButton
          onClick={handleTrigger}
          size={size}
          data-action="save"
          sx={{
            bgcolor: 'rgba(255,255,255,0.95)',
            '&:hover': { bgcolor: 'common.white' },
          }}
          aria-label="save listing"
        >
          {isSaved ? (
            <FavoriteIcon fontSize={size} color="error" />
          ) : (
            <FavoriteBorderIcon fontSize={size} />
          )}
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 280, p: 1.5, borderRadius: 3 } } }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1, px: 1 }}>
          {t('wishlist.saveTo', { defaultValue: 'Save to wishlist' })}
        </Typography>

        {query.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={20} />
          </Box>
        ) : (
          <List dense sx={{ py: 0, maxHeight: 240, overflowY: 'auto' }}>
            {lists.map((l) => {
              const inIt = l.listingIds.includes(listingId);
              return (
                <ListItemButton
                  key={l.id}
                  onClick={() => toggleList(l)}
                  sx={{ borderRadius: 1.5, px: 1, py: 0.75 }}
                  disabled={addMutation.isPending || removeMutation.isPending}
                >
                  <Box sx={{ width: 24, fontSize: 18, mr: 1 }}>{l.emoji ?? '📁'}</Box>
                  <ListItemText
                    primary={l.name}
                    secondary={`${l.itemCount} ${t('wishlist.items', { defaultValue: 'items' })}`}
                    primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                    secondaryTypographyProps={{ fontSize: 12 }}
                  />
                  {inIt && <CheckIcon fontSize="small" color="success" />}
                </ListItemButton>
              );
            })}
            {lists.length === 0 && (
              <Typography sx={{ px: 1, py: 1, fontSize: 13, color: 'text.secondary' }}>
                {t('wishlist.empty', { defaultValue: 'No wishlists yet — create one below.' })}
              </Typography>
            )}
          </List>
        )}

        <Divider sx={{ my: 1 }} />

        {showCreate ? (
          <Stack direction="row" spacing={1} sx={{ px: 1 }}>
            <TextField
              size="small"
              fullWidth
              autoFocus
              value={creatingName}
              onChange={(e) => setCreatingName(e.target.value)}
              placeholder={t('wishlist.namePlaceholder', { defaultValue: 'List name' })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') {
                  setShowCreate(false);
                  setCreatingName('');
                }
              }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={handleCreate}
              disabled={createMutation.isPending || !creatingName.trim()}
            >
              {t('common.save', { defaultValue: 'Save' })}
            </Button>
          </Stack>
        ) : (
          <Button
            fullWidth
            startIcon={<AddIcon />}
            onClick={() => setShowCreate(true)}
            sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 600 }}
          >
            {t('wishlist.createNew', { defaultValue: 'Create new wishlist' })}
          </Button>
        )}
      </Popover>
    </>
  );
}
