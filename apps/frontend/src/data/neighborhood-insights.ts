/**
 * Static neighborhood-insight data shown on the map's "Neighborhood Insights"
 * layer. Figures are indicative market estimates, not live data — surface them
 * as guidance, not quotes. Swap for an API later without touching the UI.
 */
export interface NeighborhoodInsight {
  nameEn: string;
  nameAr: string;
  city: string;
  avgPricePerSqm: number; // SAR
  avgRentPerMonth: number; // SAR
  schools: number;
  hospitals: number;
  malls: number;
  mosques: number;
  transport: number; // score 1-10
  safety: number; // score 1-10
  amenities: number; // score 1-10
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  lat: number;
  lng: number;
}

export const NEIGHBORHOOD_INSIGHTS: NeighborhoodInsight[] = [
  // Riyadh
  {
    nameEn: 'Al Olaya', nameAr: 'العليا',
    city: 'Riyadh',
    avgPricePerSqm: 12000, avgRentPerMonth: 8500,
    schools: 8, hospitals: 5, malls: 4, mosques: 12,
    transport: 8, safety: 9, amenities: 10,
    trend: 'up', trendPercent: 5.2,
    lat: 24.6877, lng: 46.6860,
  },
  {
    nameEn: 'Al Nakheel', nameAr: 'النخيل',
    city: 'Riyadh',
    avgPricePerSqm: 9500, avgRentPerMonth: 6500,
    schools: 6, hospitals: 3, malls: 2, mosques: 8,
    transport: 7, safety: 9, amenities: 8,
    trend: 'up', trendPercent: 3.8,
    lat: 24.7500, lng: 46.6800,
  },
  {
    nameEn: 'Al Malqa', nameAr: 'الملقا',
    city: 'Riyadh',
    avgPricePerSqm: 8500, avgRentPerMonth: 5500,
    schools: 7, hospitals: 2, malls: 3, mosques: 9,
    transport: 6, safety: 9, amenities: 7,
    trend: 'stable', trendPercent: 0.5,
    lat: 24.7800, lng: 46.6300,
  },
  {
    nameEn: 'Al Yasmin', nameAr: 'الياسمين',
    city: 'Riyadh',
    avgPricePerSqm: 7500, avgRentPerMonth: 4800,
    schools: 9, hospitals: 2, malls: 2, mosques: 11,
    transport: 6, safety: 9, amenities: 7,
    trend: 'up', trendPercent: 4.1,
    lat: 24.8100, lng: 46.6500,
  },
  {
    nameEn: 'Al Rawdah', nameAr: 'الروضة',
    city: 'Riyadh',
    avgPricePerSqm: 11000, avgRentPerMonth: 7500,
    schools: 5, hospitals: 4, malls: 3, mosques: 7,
    transport: 8, safety: 8, amenities: 9,
    trend: 'up', trendPercent: 6.0,
    lat: 24.6700, lng: 46.7200,
  },
  {
    nameEn: 'Al Murabba', nameAr: 'المربع',
    city: 'Riyadh',
    avgPricePerSqm: 10000, avgRentPerMonth: 7000,
    schools: 4, hospitals: 6, malls: 3, mosques: 8,
    transport: 9, safety: 8, amenities: 9,
    trend: 'up', trendPercent: 4.5,
    lat: 24.6800, lng: 46.7100,
  },
  {
    nameEn: 'NEOM Area', nameAr: 'منطقة نيوم',
    city: 'Tabuk',
    avgPricePerSqm: 15000, avgRentPerMonth: 12000,
    schools: 2, hospitals: 1, malls: 1, mosques: 3,
    transport: 4, safety: 9, amenities: 5,
    trend: 'up', trendPercent: 25.0,
    lat: 27.5219, lng: 36.7060,
  },
  // Jeddah
  {
    nameEn: 'Al Corniche', nameAr: 'الكورنيش',
    city: 'Jeddah',
    avgPricePerSqm: 13000, avgRentPerMonth: 9000,
    schools: 4, hospitals: 3, malls: 5, mosques: 6,
    transport: 7, safety: 8, amenities: 10,
    trend: 'up', trendPercent: 7.5,
    lat: 21.5433, lng: 39.1728,
  },
  {
    nameEn: 'Al Hamra', nameAr: 'الحمراء',
    city: 'Jeddah',
    avgPricePerSqm: 10000, avgRentPerMonth: 7000,
    schools: 6, hospitals: 4, malls: 3, mosques: 8,
    transport: 7, safety: 8, amenities: 8,
    trend: 'stable', trendPercent: 1.2,
    lat: 21.5700, lng: 39.1500,
  },
  {
    nameEn: 'Al Zahraa', nameAr: 'الزهراء',
    city: 'Jeddah',
    avgPricePerSqm: 8000, avgRentPerMonth: 5500,
    schools: 8, hospitals: 2, malls: 2, mosques: 10,
    transport: 6, safety: 8, amenities: 7,
    trend: 'up', trendPercent: 3.2,
    lat: 21.6100, lng: 39.1200,
  },
  {
    nameEn: 'Al Shati', nameAr: 'الشاطئ',
    city: 'Jeddah',
    avgPricePerSqm: 11000, avgRentPerMonth: 7800,
    schools: 3, hospitals: 2, malls: 4, mosques: 5,
    transport: 7, safety: 8, amenities: 9,
    trend: 'up', trendPercent: 5.8,
    lat: 21.5200, lng: 39.1900,
  },
  // Dammam
  {
    nameEn: 'Al Faisaliyah', nameAr: 'الفيصلية',
    city: 'Dammam',
    avgPricePerSqm: 7000, avgRentPerMonth: 4500,
    schools: 5, hospitals: 3, malls: 2, mosques: 7,
    transport: 7, safety: 8, amenities: 7,
    trend: 'up', trendPercent: 2.8,
    lat: 26.4207, lng: 50.0888,
  },
  {
    nameEn: 'Al Shati', nameAr: 'الشاطئ',
    city: 'Dammam',
    avgPricePerSqm: 9000, avgRentPerMonth: 6000,
    schools: 4, hospitals: 2, malls: 3, mosques: 5,
    transport: 6, safety: 8, amenities: 8,
    trend: 'stable', trendPercent: 0.8,
    lat: 26.4500, lng: 50.1100,
  },
  // Mecca
  {
    nameEn: 'Al Aziziyah', nameAr: 'العزيزية',
    city: 'Mecca',
    avgPricePerSqm: 16000, avgRentPerMonth: 11000,
    schools: 6, hospitals: 4, malls: 3, mosques: 20,
    transport: 8, safety: 9, amenities: 8,
    trend: 'up', trendPercent: 8.5,
    lat: 21.3891, lng: 39.8579,
  },
  // Medina
  {
    nameEn: 'Al Madinah Center', nameAr: 'وسط المدينة',
    city: 'Medina',
    avgPricePerSqm: 12000, avgRentPerMonth: 8000,
    schools: 5, hospitals: 4, malls: 2, mosques: 15,
    transport: 7, safety: 9, amenities: 7,
    trend: 'up', trendPercent: 6.2,
    lat: 24.4672, lng: 39.6024,
  },
];
