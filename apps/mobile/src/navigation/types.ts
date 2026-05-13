export type RootStackParamList = {
  Splash: undefined;
  MainTabs: undefined;
  Login: undefined;
  Register: undefined;
  ListingDetail: { id: string };
  AgentProfile: { id: string };
  Chat: { conversationId: string; recipientName: string };
  Booking: { listingId: string };
  Notifications: undefined;
  MyListings: undefined;
  AddListing: undefined;
  EditListing: { id: string };
  Wallet: undefined;
  Commissions: undefined;
  Settings: undefined;
  LanguagePicker: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Saved: undefined;
  Messages: undefined;
  Profile: undefined;
};
