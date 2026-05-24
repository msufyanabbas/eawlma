import { useEffect, useState } from 'react';

export interface NearbyPlace {
  name: string;
  rating: number;
  distance: string;
  type: string;
  placeId: string;
}

/**
 * Wraps `google.maps.places.PlacesService.nearbySearch` in a React hook so
 * callers can declaratively render "what's near this point". Quietly returns
 * an empty list if Google Maps hasn't finished loading — the caller's
 * skeleton/empty state will fall through.
 */
export function useNearbyPlaces(
  lat: number | null,
  lng: number | null,
  type: string,
  radius = 2000,
) {
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lat === null || lng === null) return;
    if (typeof window === 'undefined' || !window.google?.maps?.places) return;

    setLoading(true);
    const service = new window.google.maps.places.PlacesService(
      document.createElement('div'),
    );
    let cancelled = false;

    service.nearbySearch(
      {
        location: new window.google.maps.LatLng(lat, lng),
        radius,
        type,
      } as google.maps.places.PlaceSearchRequest,
      (results, status) => {
        if (cancelled) return;
        setLoading(false);
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          results
        ) {
          setPlaces(
            results.slice(0, 5).map((place) => ({
              name: place.name ?? '',
              rating: place.rating ?? 0,
              distance: formatDistance(
                lat,
                lng,
                place.geometry?.location?.lat() ?? 0,
                place.geometry?.location?.lng() ?? 0,
              ),
              type,
              placeId: place.place_id ?? '',
            })),
          );
        } else {
          setPlaces([]);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [lat, lng, type, radius]);

  return { places, loading };
}

/** Haversine — straight-line metres between two lat/lng points. */
function formatDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): string {
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
  const distance = R * c;

  if (distance < 1000) return `${Math.round(distance)}m`;
  return `${(distance / 1000).toFixed(1)}km`;
}
