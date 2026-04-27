import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SavedState {
  ids: string[];
  toggle: (listingId: string) => void;
  isSaved: (listingId: string) => boolean;
  remove: (listingId: string) => void;
  clear: () => void;
}

/**
 * Client-side saved-listings store. Persisted to localStorage so favorites
 * survive page reloads. When a `/users/me/saved-listings` endpoint lands on
 * the backend, swap this for a server-synced version while keeping the same
 * hook signature.
 */
export const useSavedStore = create<SavedState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) => {
        const current = get().ids;
        set({ ids: current.includes(id) ? current.filter((x) => x !== id) : [...current, id] });
      },
      isSaved: (id) => get().ids.includes(id),
      remove: (id) => set({ ids: get().ids.filter((x) => x !== id) }),
      clear: () => set({ ids: [] }),
    }),
    { name: 'aqarat.saved', storage: createJSONStorage(() => localStorage) },
  ),
);
