import { useEffect, useState } from 'react';

/**
 * Google Maps JS API loader with proper language switching.
 *
 * `@react-google-maps/api`'s `useJsApiLoader` is a process-wide singleton: the
 * first call wins and it refuses to reload, so the map UI ends up frozen to
 * whatever locale was active when the first map mounted. The Google Maps JS
 * API bakes its UI language in at *script-load* time — there is no runtime
 * setter — so the only way to switch it is to physically reload the script.
 *
 * This hook keeps the loaded language at module scope (one shared script for
 * every map page) and, when the requested language changes, tears down the
 * existing script + `google.maps` namespace and injects a fresh one.
 *
 * Contract for callers: render nothing that touches `google.maps` while
 * `isLoaded` is false — every map page already guards on `isLoaded`. The
 * teardown is deferred one macrotask so any mounted `<GoogleMap>` unmounts
 * (its cleanup needs the namespace) *before* `google.maps` is deleted.
 *
 * Note: we inject the script tag directly rather than via
 * `@googlemaps/js-api-loader`, whose `Loader` is itself a singleton that
 * throws when constructed twice with different options — i.e. it cannot
 * switch language either.
 */

interface UseGoogleMapsOptions {
  apiKey: string;
  libraries?: string[];
  language?: string;
  region?: string;
}

interface UseGoogleMapsResult {
  isLoaded: boolean;
  loadError: Error | null;
}

const CALLBACK_NAME = '__eawlmaGoogleMapsReady';

// Module-scoped so every map page shares a single script: the language the
// currently-injected script was loaded with, plus the in-flight load promise.
let loadedLanguage: string | null = null;
let loadPromise: Promise<void> | null = null;

function hasGoogleMaps(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean((window as { google?: { maps?: unknown } }).google?.maps)
  );
}

function deleteGoogleMaps(): void {
  const g = (window as { google?: { maps?: unknown } }).google;
  if (g && g.maps) delete g.maps;
}

function loadGoogleMaps(opts: Required<UseGoogleMapsOptions>): Promise<void> {
  // Same language already loaded (or loading) — reuse the existing script.
  if (loadedLanguage === opts.language && loadPromise) return loadPromise;

  loadedLanguage = opts.language;
  loadPromise = new Promise<void>((resolve, reject) => {
    // Wipe any previous Google Maps script + namespace: the API can only be
    // initialised once per `language`, so a re-load needs a clean slate.
    document
      .querySelectorAll('script[src*="maps.googleapis.com"]')
      .forEach((s) => s.remove());
    deleteGoogleMaps();

    (window as unknown as Record<string, () => void>)[CALLBACK_NAME] = () => {
      delete (window as unknown as Record<string, unknown>)[CALLBACK_NAME];
      resolve();
    };

    const params = new URLSearchParams({
      key: opts.apiKey,
      callback: CALLBACK_NAME,
      v: 'weekly',
      language: opts.language,
      region: opts.region,
    });
    if (opts.libraries.length > 0) {
      params.set('libraries', opts.libraries.join(','));
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => reject(new Error('Failed to load the Google Maps script'));
    document.head.appendChild(script);
  });
  return loadPromise;
}

export function useGoogleMaps({
  apiKey,
  libraries = [],
  language = 'en',
  region = 'SA',
}: UseGoogleMapsOptions): UseGoogleMapsResult {
  const [isLoaded, setIsLoaded] = useState(
    () => loadedLanguage === language && hasGoogleMaps(),
  );
  const [loadError, setLoadError] = useState<Error | null>(null);

  // Primitive dep — an array literal would re-fire the effect every render.
  const librariesKey = libraries.join(',');

  useEffect(() => {
    if (!apiKey) {
      setLoadError(new Error('Missing Google Maps API key'));
      return;
    }

    // Already on the requested language — nothing to reload.
    if (loadedLanguage === language && hasGoogleMaps()) {
      setIsLoaded(true);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setIsLoaded(false);
    setLoadError(null);

    // Defer the teardown one macrotask so the consuming component has
    // re-rendered with `isLoaded === false` and unmounted its `<GoogleMap>`
    // *before* we delete `window.google.maps` — the unmount handler needs it.
    const timer = window.setTimeout(() => {
      loadGoogleMaps({
        apiKey,
        libraries: librariesKey ? librariesKey.split(',') : [],
        language,
        region,
      })
        .then(() => {
          if (!cancelled) setIsLoaded(true);
        })
        .catch((err: Error) => {
          if (!cancelled) setLoadError(err);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [apiKey, language, region, librariesKey]);

  return { isLoaded, loadError };
}
