import { Box } from '@mui/material';
import { useState, type ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

/**
 * Public-facing app shell — renders the navbar, page content and footer.
 * Used by route components mounted under the root layout.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [, setMobileMenuOpen] = useState(false);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar onMobileMenuClick={() => setMobileMenuOpen((v) => !v)} />
      <Box component="main" sx={{ flex: 1 }}>
        {children}
      </Box>
      <Footer />
    </Box>
  );
}
