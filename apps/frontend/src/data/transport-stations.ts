/**
 * Public-transport stations rendered on the search map's "Transport" overlay
 * and used by the listing detail page to surface the nearest station. Coords
 * are approximate — accurate enough to estimate a few-minute walk, but not
 * surveyed.
 */
export interface TransportStation {
  nameEn: string;
  nameAr: string;
  type: 'metro' | 'bus' | 'train';
  line?: string;
  /** Hex colour used for the marker pill + nearest-station card chrome. */
  lineColor?: string;
  city: string;
  lat: number;
  lng: number;
}

export const TRANSPORT_STATIONS: TransportStation[] = [
  // Riyadh Metro — Line 1 (Blue)
  {
    nameEn: 'King Abdullah Financial District',
    nameAr: 'مركز الملك عبدالله المالي',
    type: 'metro',
    line: 'Line 1',
    lineColor: '#0066CC',
    city: 'Riyadh',
    lat: 24.7642,
    lng: 46.6386,
  },
  {
    nameEn: 'Al Urubah',
    nameAr: 'العروبة',
    type: 'metro',
    line: 'Line 1',
    lineColor: '#0066CC',
    city: 'Riyadh',
    lat: 24.7512,
    lng: 46.6501,
  },
  {
    nameEn: 'King Fahd',
    nameAr: 'الملك فهد',
    type: 'metro',
    line: 'Line 1',
    lineColor: '#0066CC',
    city: 'Riyadh',
    lat: 24.7380,
    lng: 46.6640,
  },
  {
    nameEn: 'Al Maather',
    nameAr: 'المعذر',
    type: 'metro',
    line: 'Line 1',
    lineColor: '#0066CC',
    city: 'Riyadh',
    lat: 24.7240,
    lng: 46.6780,
  },
  {
    nameEn: 'Riyadh Park',
    nameAr: 'رياض بارك',
    type: 'metro',
    line: 'Line 1',
    lineColor: '#0066CC',
    city: 'Riyadh',
    lat: 24.7601,
    lng: 46.6178,
  },

  // Riyadh Metro — Line 2 (Orange)
  {
    nameEn: 'Al Shohadaa',
    nameAr: 'الشهداء',
    type: 'metro',
    line: 'Line 2',
    lineColor: '#FF6600',
    city: 'Riyadh',
    lat: 24.6462,
    lng: 46.7136,
  },
  {
    nameEn: 'King Salman',
    nameAr: 'الملك سلمان',
    type: 'metro',
    line: 'Line 2',
    lineColor: '#FF6600',
    city: 'Riyadh',
    lat: 24.6762,
    lng: 46.6936,
  },

  // Riyadh Metro — Line 3 (Red)
  {
    nameEn: 'King Khalid Airport',
    nameAr: 'مطار الملك خالد',
    type: 'metro',
    line: 'Line 3',
    lineColor: '#CC0000',
    city: 'Riyadh',
    lat: 24.9576,
    lng: 46.6988,
  },

  // Riyadh Metro — Line 4 (Yellow)
  {
    nameEn: 'King Abdullah Road',
    nameAr: 'طريق الملك عبدالله',
    type: 'metro',
    line: 'Line 4',
    lineColor: '#FFCC00',
    city: 'Riyadh',
    lat: 24.7136,
    lng: 46.6753,
  },

  // Jeddah — Haramain High-Speed Rail
  {
    nameEn: 'Al Haramain Station',
    nameAr: 'محطة الحرمين',
    type: 'train',
    line: 'Haramain',
    lineColor: '#009900',
    city: 'Jeddah',
    lat: 21.4958,
    lng: 39.1925,
  },
  {
    nameEn: 'King Abdulaziz Airport',
    nameAr: 'مطار الملك عبدالعزيز',
    type: 'train',
    line: 'Haramain',
    lineColor: '#009900',
    city: 'Jeddah',
    lat: 21.6796,
    lng: 39.1565,
  },
];

/** Haversine distance between two lat/lng coordinates, in metres. */
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
