// Route-param types shared across the navigator and individual screens. Keeps
// `useRoute<RouteProp<RootStackParamList, 'ListingDetail'>>()` honest at the
// type level so a renamed route or a missing param fails the build, not the
// runtime.

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  ListingDetail: { id: string };
  AgentProfile: { id: string };
  Booking: { listingId: string };
  Chat: { threadId: string; otherUserId?: string };
  Dashboard: undefined;
  MyListings: undefined;
  AddListing: { mode?: 'create' | 'edit'; listingId?: string } | undefined;
  Wallet: undefined;
  Notifications: undefined;
};

export type TabsParamList = {
  Home: undefined;
  Search: { initialQuery?: string } | undefined;
  Saved: undefined;
  Messages: undefined;
  Profile: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
