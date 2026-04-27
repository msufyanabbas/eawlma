export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoBounds {
  northEast: GeoPoint;
  southWest: GeoPoint;
}

export interface Address {
  country: string;       // ISO-3166 alpha-2 (e.g. "SA")
  region: string;        // Province / Emirate / Mintaqa
  city: string;
  district?: string;     // Hayy / neighborhood
  street?: string;
  buildingNumber?: string;
  postalCode?: string;
  additionalNumber?: string;
  formatted?: string;    // single-line representation
}

export interface LocalizedString {
  ar: string;
  en: string;
}
