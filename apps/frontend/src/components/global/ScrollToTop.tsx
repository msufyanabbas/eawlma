import { useEffect } from 'react';
import { useLocation } from '@tanstack/react-router';

export function ScrollToTop() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);
  return null;
}
