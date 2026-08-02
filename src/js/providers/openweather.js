import { getConfig } from '../config.js';
import { getJson, ApiError } from './http.js';

const BASE_URL = 'https://api.openweathermap.org';

// OpenWeather has no Malay or Tamil, so those fall back to English descriptions
// and are translated separately.
const OPENWEATHER_LANG = {
  en: 'en',
  ar: 'ar',
  ms: 'en',
  ta: 'en',
  hi: 'hi',
  'zh-CN': 'zh_cn'
};

export function supportsLanguageNatively(uiLang) {
  return OPENWEATHER_LANG[uiLang] !== undefined && OPENWEATHER_LANG[uiLang] !== 'en';
}

function apiKey() {
  const key = getConfig().OPENWEATHER_API_KEY;
  if (!key) {
    throw new ApiError(
      'OpenWeather API key is missing. Add VITE_OPENWEATHER_API_KEY to .env.local and rebuild.',
      { provider: 'openweather' }
    );
  }
  return key;
}

function describeFailure(status, data) {
  if (status === 401) {
    return 'OpenWeather rejected the API key. New keys take up to 2 hours to activate.';
  }
  if (status === 404) return 'Location not found. Check the city name.';
  if (status === 429) return 'OpenWeather rate limit reached. Please wait a moment.';
  return data?.message || 'Weather data unavailable.';
}

function buildLocationParams({ lat, lon, city }) {
  if (typeof city === 'string' && city.trim()) {
    return { q: city.trim().slice(0, 100) };
  }

  const numericLat = Number(lat);
  const numericLon = Number(lon);
  const valid =
    Number.isFinite(numericLat) &&
    Number.isFinite(numericLon) &&
    numericLat >= -90 &&
    numericLat <= 90 &&
    numericLon >= -180 &&
    numericLon <= 180;

  if (!valid) {
    throw new ApiError('Provide a valid city or coordinates.', { provider: 'openweather' });
  }

  return { lat: String(numericLat), lon: String(numericLon) };
}

async function fetchWeatherEndpoint(path, { lang = 'en', signal, ...location }) {
  const params = new URLSearchParams({
    ...buildLocationParams(location),
    appid: apiKey(),
    units: 'metric',
    lang: OPENWEATHER_LANG[lang] || 'en'
  });

  const { response, data } = await getJson(`${BASE_URL}${path}?${params.toString()}`, {
    provider: 'openweather',
    signal
  });

  const upstreamCode = data?.cod !== undefined ? Number(data.cod) : response.status;

  if (!response.ok || upstreamCode >= 400) {
    throw new ApiError(describeFailure(response.status || upstreamCode, data), {
      status: response.status,
      provider: 'openweather'
    });
  }

  return data;
}

export function getCurrentWeather(options) {
  return fetchWeatherEndpoint('/data/2.5/weather', options);
}

export function getForecast(options) {
  return fetchWeatherEndpoint('/data/2.5/forecast', options);
}

/**
 * Reverse geocoding is part of OpenWeather's free tier, so no separate
 * geocoding provider or API key is needed.
 */
export async function reverseGeocode(lat, lon, { signal } = {}) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    limit: '1',
    appid: apiKey()
  });

  const { response, data } = await getJson(`${BASE_URL}/geo/1.0/reverse?${params.toString()}`, {
    provider: 'openweather',
    signal
  });

  if (!response.ok) {
    throw new ApiError(describeFailure(response.status, data), {
      status: response.status,
      provider: 'openweather'
    });
  }

  const place = Array.isArray(data) ? data[0] : null;
  if (!place) return null;

  return place.country ? `${place.name}, ${place.country}` : place.name;
}
