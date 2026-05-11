import type { SxProps, Theme } from '@mui/material';

/**
 * Centred container — full-bleed up to 1400px with progressive horizontal
 * padding. Drop on any section that should align to the page rails.
 */
export const SECTION: SxProps<Theme> = {
  width: '100%',
  maxWidth: 1400,
  mx: 'auto',
  px: { xs: 2, sm: 3, md: 5 },
};

/**
 * Sticky-feeling page header for dashboard / admin / public pages — white
 * surface, divider beneath, vertical breathing room. Pair with a title +
 * optional subtitle or action button on the inside.
 */
export const PAGE_HEADER: SxProps<Theme> = {
  bgcolor: 'background.paper',
  borderBottom: '1px solid',
  borderColor: 'divider',
  px: { xs: 2, md: 5 },
  py: 2.5,
};

/**
 * Standard content rail under a page header — same horizontal alignment as
 * SECTION but with vertical padding for stand-alone routes (About, Help, etc).
 */
export const CONTENT_AREA: SxProps<Theme> = {
  width: '100%',
  maxWidth: 1400,
  mx: 'auto',
  px: { xs: 2, md: 5 },
  py: { xs: 3, md: 4 },
};
