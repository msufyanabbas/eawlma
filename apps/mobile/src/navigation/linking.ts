import type { LinkingOptions } from '@react-navigation/native';

/**
 * React Navigation deep-link configuration. The two prefixes mirror the
 * native config in app.config.js:
 *
 *   - `eawlma://`        custom scheme, for share targets that opaquely
 *                        pass through URLs (WhatsApp text, SMS, etc.)
 *   - `https://eawlma.sa` Universal / App Links — opens the app directly
 *                        when the OS has verified the site association
 *                        file, otherwise falls back to Safari/Chrome.
 *
 * Path mapping is kept narrow on purpose: only deep-linkable routes that
 * a buyer might receive a link to are wired up. Internal app-only screens
 * (settings, my-listings, admin, etc.) are deliberately omitted.
 */
export const linking: LinkingOptions<ReactNavigation.RootParamList> = {
  prefixes: ['eawlma://', 'https://eawlma.sa'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Home: 'home',
          Search: 'search',
          Saved: 'saved',
          Messages: 'messages',
          Profile: 'profile',
        },
      },
      ListingDetail: 'listings/:id',
      AgentProfile: 'agents/:id',
    },
  },
};
