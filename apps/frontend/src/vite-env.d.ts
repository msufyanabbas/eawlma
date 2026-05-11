/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SOCKET_URL: string;
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_MOYASAR_PUBLISHABLE_KEY: string;
  readonly VITE_DEFAULT_LOCALE: string;
  readonly VITE_SUPPORTED_LOCALES: string;
  readonly VITE_GA_MEASUREMENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// gtag is injected at runtime once initGA() has loaded the GA4 script. Both
// `dataLayer` and `gtag` are attached to `window` so any module can call into
// them. This file is an ambient script (no top-level import/export), so the
// `Window` interface here merges directly with lib.dom.d.ts — no `declare
// global` wrapper needed.
interface Window {
  dataLayer: unknown[];
  gtag: (
    ...args: (string | number | boolean | Record<string, unknown> | Date | null | undefined)[]
  ) => void;
}

// Loose JSX typing for Google's <model-viewer> custom element so we can
// embed AR/3D scenes directly in TSX. The full type is rich; we expose
// only the props the listing detail page uses today.
declare namespace JSX {
  interface IntrinsicElements {
    'model-viewer': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        src?: string;
        'ios-src'?: string;
        alt?: string;
        ar?: boolean | string;
        'ar-modes'?: string;
        'auto-rotate'?: boolean | string;
        'camera-controls'?: boolean | string;
        'shadow-intensity'?: string | number;
        poster?: string;
        loading?: 'auto' | 'lazy' | 'eager';
        reveal?: 'auto' | 'manual';
        'environment-image'?: string;
        exposure?: string | number;
      },
      HTMLElement
    >;
  }
}
