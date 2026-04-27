import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { savedApi } from '@/api/saved.api';
import { useAuthStore } from './auth.store';

interface SavedState {
  /** Source-of-truth set of saved listing IDs. Hydrated from the server when
   *  authenticated; falls back to localStorage for anonymous browsing. */
  ids: string[];
  /** Latest server hydration time so we can throttle re-fetches. */
  hydratedAt: number | null;
  /** Whether a hydrate is in flight (prevents duplicate fetches). */
  hydrating: boolean;

  /** Fetch the authenticated user's saved-listing IDs from the server.
   *  No-op when unauthenticated. */
  hydrate: () => Promise<void>;

  /** Optimistic toggle. Calls the server when authenticated; falls back to
   *  pure localStorage for anonymous users. Reverts on server error. */
  toggle: (listingId: string) => Promise<void>;

  isSaved: (listingId: string) => boolean;
  remove: (listingId: string) => Promise<void>;
  clear: () => void;
}

export const useSavedStore = create<SavedState>()(
  persist(
    (set, get) => ({
      ids: [],
      hydratedAt: null,
      hydrating: false,

      hydrate: async () => {
        if (!useAuthStore.getState().isAuthenticated) return;
        if (get().hydrating) return;
        set({ hydrating: true });
        try {
          const ids = await savedApi.mineIds();
          set({ ids, hydratedAt: Date.now() });
        } catch {
          // keep stale localStorage values; UI still works
        } finally {
          set({ hydrating: false });
        }
      },

      toggle: async (listingId) => {
        const { ids } = get();
        const wasSaved = ids.includes(listingId);
        // Optimistic UI: update state immediately
        const optimistic = wasSaved ? ids.filter((x) => x !== listingId) : [...ids, listingId];
        set({ ids: optimistic });

        const isAuthed = useAuthStore.getState().isAuthenticated;
        if (!isAuthed) return; // anonymous toggle stays in localStorage only

        try {
          if (wasSaved) await savedApi.unsave(listingId);
          else await savedApi.save(listingId);
        } catch {
          // Roll back on failure
          set({ ids });
        }
      },

      isSaved: (id) => get().ids.includes(id),

      remove: async (id) => {
        if (!get().ids.includes(id)) return;
        await get().toggle(id);
      },

      clear: () => set({ ids: [] }),
    }),
    {
      name: 'aqarat.saved',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ ids: s.ids }),
    },
  ),
);
