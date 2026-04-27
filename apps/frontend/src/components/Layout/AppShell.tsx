import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <Box component="main" sx={{ flex: 1, py: { xs: 2, md: 4 } }}>
        {children}
      </Box>
      <Footer />
    </Box>
  );
}
