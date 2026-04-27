import { apiClient, unwrap } from './client';

export interface ViewsOverTimePoint {
  date: string;
  impressions: number;
  detailViews: number;
  inquiries: number;
}

export interface FunnelSummary {
  impressions: number;
  detailViews: number;
  inquiries: number;
  conversionRate: number;
}

export interface SourcePoint { source: string; count: number; }
export interface DevicePoint { device: string; count: number; }

export interface AgentDashboardSummary {
  rangeStart: string;
  rangeEnd: string;
  totalImpressions: number;
  totalDetailViews: number;
  totalInquiries: number;
  conversionRate: number;
  activeListings: number;
}

export const analyticsApi = {
  views: async (listingId: string, rangeDays = 30): Promise<ViewsOverTimePoint[]> => {
    const { data } = await apiClient.get<{ data: ViewsOverTimePoint[] }>(
      `/analytics/listings/${listingId}/views-over-time`,
      { params: { rangeDays } },
    );
    return unwrap<ViewsOverTimePoint[]>(data);
  },

  funnel: async (listingId: string, rangeDays = 30): Promise<FunnelSummary> => {
    const { data } = await apiClient.get<{ data: FunnelSummary }>(
      `/analytics/listings/${listingId}/funnel`,
      { params: { rangeDays } },
    );
    return unwrap<FunnelSummary>(data);
  },

  sources: async (listingId: string, rangeDays = 30): Promise<SourcePoint[]> => {
    const { data } = await apiClient.get<{ data: SourcePoint[] }>(
      `/analytics/listings/${listingId}/sources`,
      { params: { rangeDays } },
    );
    return unwrap<SourcePoint[]>(data);
  },

  devices: async (listingId: string, rangeDays = 30): Promise<DevicePoint[]> => {
    const { data } = await apiClient.get<{ data: DevicePoint[] }>(
      `/analytics/listings/${listingId}/devices`,
      { params: { rangeDays } },
    );
    return unwrap<DevicePoint[]>(data);
  },

  agentDashboard: async (rangeDays = 30): Promise<AgentDashboardSummary> => {
    const { data } = await apiClient.get<{ data: AgentDashboardSummary }>(
      '/analytics/agent-dashboard',
      { params: { rangeDays } },
    );
    return unwrap<AgentDashboardSummary>(data);
  },
};
