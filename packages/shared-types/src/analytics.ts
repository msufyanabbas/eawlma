export interface ListingDailyMetric {
  listingId: string;
  date: string;            // YYYY-MM-DD
  impressions: number;
  uniqueImpressions: number;
  detailViews: number;
  inquiries: number;
  saves: number;
  contactClicks: number;
  whatsappClicks: number;
  phoneClicks: number;
}

export interface ListingAnalyticsSummary {
  listingId: string;
  rangeStart: string;
  rangeEnd: string;
  impressions: number;
  detailViews: number;
  inquiries: number;
  saves: number;
  conversionRate: number;
  averageRanking: number | null;
  topReferrers: Array<{ source: string; count: number }>;
  daily: ListingDailyMetric[];
}

export interface AgentDashboardSummary {
  agentId: string;
  rangeStart: string;
  rangeEnd: string;
  activeListings: number;
  totalListings: number;
  totalImpressions: number;
  totalInquiries: number;
  conversionRate: number;
  responseRate: number;
  averageResponseTimeMinutes: number;
}

export interface PlatformDashboardSummary {
  rangeStart: string;
  rangeEnd: string;
  newUsers: number;
  newAgents: number;
  newListings: number;
  activeListings: number;
  totalInquiries: number;
  paymentsRevenue: number;
  featuredPurchases: number;
  topCities: Array<{ city: string; listingCount: number }>;
}
