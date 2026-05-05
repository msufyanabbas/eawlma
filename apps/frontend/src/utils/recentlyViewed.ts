// Tracks the last 5 listing IDs the user opened. localStorage-only — no
// backend round-trip — keeping it private to the browser and surviving
// across sessions. Used by the Homepage "Recently viewed" rail.

const KEY = 'eawlma.recentlyViewed';
const MAX = 5;

export function getRecentlyViewed(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string').slice(0, MAX);
  } catch {
    return [];
  }
}

export function trackListingView(listingId: string): void {
  if (!listingId) return;
  try {
    const current = getRecentlyViewed().filter((id) => id !== listingId);
    const next = [listingId, ...current].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota errors */
  }
}
