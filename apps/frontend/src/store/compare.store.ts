import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const MAX_COMPARE = 3;

interface CompareState {
  ids: string[];
  add: (id: string) => void;
  remove: (id: string) => void;
  toggle: (id: string) => boolean;
  clear: () => void;
  has: (id: string) => boolean;
  isFull: () => boolean;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      ids: [],

      add: (id) => {
        const { ids } = get();
        if (ids.includes(id) || ids.length >= MAX_COMPARE) return;
        set({ ids: [...ids, id] });
      },

      remove: (id) => set({ ids: get().ids.filter((x) => x !== id) }),

      // Returns true when the listing is now in the compare set, false when removed
      // or rejected (cap reached). The listing card uses the return value to flash
      // a subtle "Compare list full" snackbar without mutating the caller flow.
      toggle: (id) => {
        const { ids } = get();
        if (ids.includes(id)) {
          set({ ids: ids.filter((x) => x !== id) });
          return false;
        }
        if (ids.length >= MAX_COMPARE) return false;
        set({ ids: [...ids, id] });
        return true;
      },

      clear: () => set({ ids: [] }),
      has: (id) => get().ids.includes(id),
      isFull: () => get().ids.length >= MAX_COMPARE,
    }),
    {
      name: 'eawlma.compare',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ ids: s.ids }),
    },
  ),
);

export const COMPARE_MAX = MAX_COMPARE;
