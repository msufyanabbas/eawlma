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

export interface PricePredictionParams {
  currentPrice: number;
  city: string;
  district?: string;
  propertyType: string;
  area: number;
  bedrooms?: number;
}

export interface PricePrediction {
  year1: { price: number; growthPercent: number };
  year2: { price: number; growthPercent: number };
  year5: { price: number; growthPercent: number };
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;
  reasoningAr: string;
  vision2030Factor: string;
}

// Mirrors the web client's `aiApi.suggestPrice` — POST /ai/suggest-price.
// The backend wraps successful payloads in `{ data: ... }`; tolerate both the
// wrapped and bare shapes so this keeps working if the envelope changes.
export const aiApi = {
  suggestPrice: (params: SuggestPriceParams): Promise<PriceSuggestion> =>
    api.post('/ai/suggest-price', params).then((r) => r.data?.data ?? r.data),
  predictPrice: (params: PricePredictionParams): Promise<PricePrediction> =>
    api.post('/ai/predict-price', params).then((r) => r.data?.data ?? r.data),
};
