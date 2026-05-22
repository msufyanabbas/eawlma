import api from './client';

export interface SuggestPriceParams {
  city: string;
  propertyType: string;
  areaSqm: number;
  bedrooms: number;
  bathrooms: number;
  district?: string;
  transactionType: 'sale' | 'rent';
  amenities?: string[];
}

export interface PriceSuggestion {
  suggestedMin: number;
  suggestedMax: number;
  recommended: number;
  pricePerSqm: number;
  marketAvg: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  comparables: number;
}

// Mirrors the web client's `aiApi.suggestPrice` — POST /ai/suggest-price.
// The backend wraps successful payloads in `{ data: ... }`; tolerate both the
// wrapped and bare shapes so this keeps working if the envelope changes.
export const aiApi = {
  suggestPrice: (params: SuggestPriceParams): Promise<PriceSuggestion> =>
    api.post('/ai/suggest-price', params).then((r) => r.data?.data ?? r.data),
};
