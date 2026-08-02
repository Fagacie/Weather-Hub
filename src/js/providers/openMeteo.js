import { getJson } from './http.js';

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/**
 * Open-Meteo needs no API key and no billing account, which is why it covers
 * the UV index that OpenWeather only exposes through the paid One Call product.
 * Returns null rather than throwing so a UV outage never breaks the dashboard.
 */
export async function getUvIndex(lat, lon, { signal } = {}) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'uv_index'
  });

  try {
    const { response, data } = await getJson(`${BASE_URL}?${params.toString()}`, {
      provider: 'open-meteo',
      signal,
      timeoutMs: 8000
    });

    if (!response.ok) return null;

    const uv = data?.current?.uv_index;
    return Number.isFinite(uv) ? uv : null;
  } catch {
    return null;
  }
}

/**
 * Place search for the map. Preferred over Nominatim, which rejects requests
 * that do not identify themselves and asks apps not to use it for autocomplete.
 */
export async function searchPlaces(query, { signal, count = 5 } = {}) {
  const params = new URLSearchParams({
    name: query,
    count: String(count),
    format: 'json'
  });

  const { response, data } = await getJson(`${GEOCODING_URL}?${params.toString()}`, {
    provider: 'open-meteo',
    signal,
    timeoutMs: 8000
  });

  if (!response.ok || !Array.isArray(data?.results)) return [];

  return data.results.map((place) => ({
    lat: place.latitude,
    lon: place.longitude,
    name: place.name,
    label: [place.name, place.admin1, place.country].filter(Boolean).join(', ')
  }));
}
