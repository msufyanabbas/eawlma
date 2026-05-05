import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Wraps page content in a brief fade + 16px slide-in. Used at the top of
 * every route so navigating between pages always animates smoothly.
 *
 * Pair with TanStack Router's <RouterProvider> — the wrapper itself doesn't
 * need access to router internals, it just animates on mount/unmount.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
