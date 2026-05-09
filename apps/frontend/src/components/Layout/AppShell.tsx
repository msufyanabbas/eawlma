import { Box } from '@mui/material';
import { useState, type ReactNode } from 'react';
import { useLocation } from '@tanstack/react-router';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { PageTransition } from '@/components/global/PageTransition';
import { CompareBar } from '@/components/global/CompareBar';
import { WelcomeModal } from '@/components/global/WelcomeModal';

/**
 * Public-facing app shell — renders the navbar, page content and footer.
 * Used by route components mounted under the root layout. Wraps children in
 * a `<PageTransition>` keyed by pathname so navigating between routes plays
 * a brief fade + 16px slide-in animation.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar onMobileMenuClick={() => setMobileMenuOpen((v) => !v)} />
      <Box
        component="main"
        sx={{
          flex: 1,
          width: '100%',
          minHeight: 'calc(100vh - 72px)',
        }}
      >
        <PageTransition key={location.pathname}>{children}</PageTransition>
      </Box>
      <Footer />
      <CompareBar />
      <WelcomeModal />
    </Box>
  );
}
