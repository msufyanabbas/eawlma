import {
  Box,
  Button,
  Dialog,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  /** Ordered list of photo URLs; the first one is used as the hero. */
  photos: string[];
  alt?: string;
}

/**
 * Airbnb-style listing photo gallery:
 *   - Desktop: 60% wide hero on the left + 2×2 grid of four secondary
 *     thumbnails on the right. Clicking any photo opens the fullscreen
 *     modal at that photo's index.
 *   - Mobile: a single full-width hero with a "Show all photos" CTA.
 *
 * Fullscreen modal supports:
 *   - Left / right arrow buttons (disabled at the edges)
 *   - Keyboard navigation: ←, →, Esc
 *   - 1/N counter pill at the top
 *   - Click-to-jump thumbnail strip at the bottom
 */
export function PhotoGallery({ photos, alt }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const total = photos?.length ?? 0;

  const open = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, total - 1)));
    setGalleryOpen(true);
  }, [total]);
  const close = useCallback(() => setGalleryOpen(false), []);
  const goNext = useCallback(
    () => setCurrentIndex((i) => Math.min(i + 1, total - 1)),
    [total],
  );
  const goPrev = useCallback(
    () => setCurrentIndex((i) => Math.max(i - 1, 0)),
    [],
  );

  // Keyboard navigation — only when the modal is open.
  useEffect(() => {
    if (!galleryOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [galleryOpen, goNext, goPrev, close]);

  if (!photos || total === 0) return null;
  const hero = photos[0];
  const thumbs = photos.slice(1, 5);

  return (
    <>
      <Box sx={{ position: 'relative', width: '100%', mb: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: isDesktop ? '1.5fr 1fr' : '1fr',
            gridTemplateRows: isDesktop ? '1fr 1fr' : '1fr',
            gap: 1,
            height: { xs: 320, md: 480 },
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          {/* Hero */}
          <Box
            sx={{
              gridRow: isDesktop ? '1 / span 2' : '1 / span 1',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
            }}
            onClick={() => open(0)}
          >
            <Box
              component="img"
              src={hero}
              alt={alt}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                transition: 'transform 350ms ease',
                '&:hover': { transform: 'scale(1.02)' },
              }}
            />
          </Box>

          {/* 4 thumbnails — each opens the modal at its own index. */}
          {isDesktop &&
            thumbs.map((photo, i) => (
              <Box
                key={photo + i}
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: 0,
                  cursor: 'pointer',
                }}
                onClick={() => open(i + 1)}
              >
                <Box
                  component="img"
                  src={photo}
                  alt={`${alt ?? 'photo'} ${i + 2}`}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    transition: 'transform 350ms ease',
                    '&:hover': { transform: 'scale(1.04)' },
                  }}
                />
              </Box>
            ))}
        </Box>

        <Button
          variant="contained"
          startIcon={<PhotoCameraIcon />}
          onClick={(e) => {
            e.stopPropagation();
            open(0);
          }}
          sx={{
            position: 'absolute',
            bottom: 16,
            insetInlineEnd: 16,
            bgcolor: 'rgba(255,255,255,0.95)',
            color: 'text.primary',
            fontWeight: 700,
            textTransform: 'none',
            boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
            '&:hover': { bgcolor: 'common.white' },
          }}
        >
          {t('booking.showAllPhotos', { defaultValue: 'Show all photos' })} ({total})
        </Button>
      </Box>

      <Dialog
        fullScreen
        open={galleryOpen}
        onClose={close}
        PaperProps={{ sx: { bgcolor: 'rgba(0,0,0,0.95)' } }}
      >
        <Box sx={{ bgcolor: 'rgba(0,0,0,0.95)', minHeight: '100vh', position: 'relative' }}>
          {/* Close — trailing-edge corner so it flips to the left in RTL. */}
          <IconButton
            onClick={close}
            aria-label="Close"
            sx={{
              position: 'absolute',
              top: 16,
              insetInlineEnd: 16,
              zIndex: 10,
              color: 'common.white',
              bgcolor: 'rgba(0,0,0,0.5)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
            }}
          >
            <CloseIcon />
          </IconButton>

          {/* Counter pill */}
          <Typography
            sx={{
              position: 'absolute',
              top: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'common.white',
              zIndex: 10,
              bgcolor: 'rgba(0,0,0,0.5)',
              px: 2,
              py: 0.5,
              borderRadius: 10,
              fontWeight: 600,
            }}
          >
            {currentIndex + 1} / {total}
          </Typography>

          {/* Previous — anchored at inline-start (left in LTR, right in RTL).
           *  The chevron itself is flipped under RTL so it always points
           *  toward the start edge of the viewport. */}
          <IconButton
            onClick={goPrev}
            disabled={currentIndex === 0}
            aria-label="Previous photo"
            sx={{
              position: 'absolute',
              insetInlineStart: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              color: 'common.white',
              bgcolor: 'rgba(0,0,0,0.5)',
              width: 48,
              height: 48,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
              '&.Mui-disabled': { opacity: 0.3, color: 'common.white' },
            }}
          >
            <ChevronLeftIcon
              sx={{ fontSize: 32, transform: theme.direction === 'rtl' ? 'scaleX(-1)' : 'none' }}
            />
          </IconButton>

          {/* Main image */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100vh',
              p: { xs: 2, md: 8 },
            }}
          >
            <Box
              component="img"
              key={photos[currentIndex]}
              src={photos[currentIndex]}
              alt={`${alt ?? 'photo'} ${currentIndex + 1}`}
              sx={{
                maxHeight: '80vh',
                maxWidth: '100%',
                objectFit: 'contain',
                borderRadius: 2,
                transition: 'opacity 0.2s',
              }}
            />
          </Box>

          {/* Next — anchored at inline-end (right in LTR, left in RTL). */}
          <IconButton
            onClick={goNext}
            disabled={currentIndex === total - 1}
            aria-label="Next photo"
            sx={{
              position: 'absolute',
              insetInlineEnd: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              color: 'common.white',
              bgcolor: 'rgba(0,0,0,0.5)',
              width: 48,
              height: 48,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
              '&.Mui-disabled': { opacity: 0.3, color: 'common.white' },
            }}
          >
            <ChevronRightIcon
              sx={{ fontSize: 32, transform: theme.direction === 'rtl' ? 'scaleX(-1)' : 'none' }}
            />
          </IconButton>

          {/* Thumbnail strip */}
          <Box
            className="photo-thumb-scroll"
            sx={{
              position: 'absolute',
              bottom: 16,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              gap: 1,
              px: 4,
              overflowX: 'auto',
            }}
          >
            {photos.map((photo, i) => (
              <Box
                key={photo + i}
                component="img"
                src={photo}
                alt={`thumb ${i + 1}`}
                onClick={() => setCurrentIndex(i)}
                sx={{
                  width: 60,
                  height: 45,
                  objectFit: 'cover',
                  borderRadius: 1,
                  cursor: 'pointer',
                  border: i === currentIndex ? '2px solid white' : '2px solid transparent',
                  opacity: i === currentIndex ? 1 : 0.6,
                  flexShrink: 0,
                  transition: 'all 0.2s',
                  '&:hover': { opacity: 1 },
                }}
              />
            ))}
          </Box>
        </Box>
      </Dialog>
    </>
  );
}
