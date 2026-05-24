import { Injectable } from '@nestjs/common';

export interface NearbyCount {
  schools: number;
  hospitals: number;
  malls: number;
  mosques: number;
  restaurants: number;
}

/**
 * Curated city-level amenity averages. Used as a static fallback while the
 * Google Places API integration is still web-only — mobile clients can read
 * `listing.nearbyCounts` from the listing detail payload and render counts
 * without needing the JS SDK.
 */
const CITY_AVERAGES: Record<string, NearbyCount> = {
  Riyadh: { schools: 8, hospitals: 4, malls: 3, mosques: 12, restaurants: 25 },
  Jeddah: { schools: 6, hospitals: 3, malls: 4, mosques: 10, restaurants: 30 },
  Dammam: { schools: 5, hospitals: 3, malls: 2, mosques: 8, restaurants: 20 },
  Mecca: { schools: 4, hospitals: 3, malls: 2, mosques: 20, restaurants: 15 },
  Medina: { schools: 4, hospitals: 2, malls: 1, mosques: 18, restaurants: 12 },
  Tabuk: { schools: 3, hospitals: 2, malls: 1, mosques: 6, restaurants: 10 },
};

const DEFAULT: NearbyCount = {
  schools: 4,
  hospitals: 2,
  malls: 2,
  mosques: 8,
  restaurants: 15,
};

@Injectable()
export class NearbyService {
  getNearbyCountsForCity(city: string | null | undefined): NearbyCount {
    if (!city) return DEFAULT;
    return CITY_AVERAGES[city] ?? DEFAULT;
  }
}
