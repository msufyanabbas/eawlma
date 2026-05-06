import { Box, Button, IconButton, Stack, Typography, alpha, useTheme } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { useQueries } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { listingsApi } from '@/api/listings.api';
import { useCompareStore } from '@/store/compare.store';
import { listingCoverUrl } from '@/utils/listingImages';

/** Sticky bottom bar surfaced once 2+ listings are in the compare set.
 *  Renders thumbnails + a CTA into the dedicated /compare page. */
export function CompareBar() {
  const theme = useTheme();
  const navigate = useNavigate();
  const ids = useCompareStore((s) => s.ids);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);

  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['listings', id],
      queryFn: () => listingsApi.getById(id),
      staleTime: 5 * 60_000,
      retry: false,
    })),
  });
  const listings = queries.map((q) => q.data).filter((l): l is NonNullable<typeof l> => Boolean(l));

  if (ids.length < 2) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        insetInline: 0,
        zIndex: 1200,
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        boxShadow: '0 -8px 24px rgba(26,26,46,0.12)',
        py: 1.25,
        px: { xs: 2, md: 3 },
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems="center"
        sx={{ maxWidth: 1440, mx: 'auto' }}
      >
        <Typography sx={{ fontWeight: 700, color: 'primary.dark', whiteSpace: 'nowrap' }}>
          Comparing {ids.length} listings
        </Typography>

        <Stack direction="row" spacing={1} sx={{ flex: 1, overflowX: 'auto', minWidth: 0 }}>
          {listings.map((l) => (
            <Box
              key={l.id}
              sx={{
                position: 'relative',
                width: 100,
                height: 56,
                flexShrink: 0,
                borderRadius: 1.5,
                overflow: 'hidden',
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Box
                component="img"
                src={listingCoverUrl(l)}
                alt={l.referenceCode}
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <IconButton
                onClick={() => remove(l.id)}
                size="small"
                sx={{
                  position: 'absolute',
                  top: 2,
                  insetInlineEnd: 2,
                  bgcolor: alpha(theme.palette.common.black, 0.55),
                  color: 'common.white',
                  width: 18,
                  height: 18,
                  '&:hover': { bgcolor: alpha(theme.palette.common.black, 0.75) },
                }}
                aria-label="remove from compare"
              >
                <CloseIcon sx={{ fontSize: 12 }} />
              </IconButton>
            </Box>
          ))}
        </Stack>

        <Stack direction="row" spacing={1.25}>
          <Button onClick={clear} size="small" color="inherit">
            Clear
          </Button>
          <Button
            onClick={() => void navigate({ to: '/compare' as never })}
            startIcon={<CompareArrowsIcon />}
            variant="contained"
            sx={{ background: theme.eawlma.gradient, fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            Compare now
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
