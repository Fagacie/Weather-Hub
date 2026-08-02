import { getConfig } from '../config.js';
import { getJson } from './http.js';

const SEARCH_URL = 'https://api.giphy.com/v1/gifs/search';
const CACHE_PREFIX = 'weatherhub:gif:';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Giphy beta keys allow only 100 calls/hour. Looking up by weather condition
// rather than by location caps the whole app at one request per condition per
// day, which keeps the capitals list (245 entries) from ever touching Giphy.
const RESULT_LIMIT = 10;

// Giphy returns 414 when the query exceeds 50 characters.
const MAX_QUERY_LENGTH = 50;

/**
 * Every `main` value OpenWeather can return, mapped to a search term.
 * Unrecognised values fall back to DEFAULT_QUERY rather than skipping the GIF.
 */
export const WEATHER_GIF_QUERIES = {
  clear: 'sunny day',
  clouds: 'cloudy sky',
  rain: 'rainy day',
  drizzle: 'light rain',
  thunderstorm: 'thunderstorm lightning',
  snow: 'snow falling',
  mist: 'misty morning',
  fog: 'foggy weather',
  haze: 'hazy sky',
  smoke: 'smoky sky',
  dust: 'dust storm',
  sand: 'sandstorm',
  ash: 'volcanic ash',
  squall: 'stormy wind',
  tornado: 'tornado'
};

const DEFAULT_QUERY = 'weather';

export function queryForCondition(condition) {
  const key = String(condition || '').toLowerCase().trim();
  return WEATHER_GIF_QUERIES[key] || DEFAULT_QUERY;
}

function readCache(query) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + query);
    if (!raw) return null;

    const entry = JSON.parse(raw);
    if (!Array.isArray(entry?.urls) || !entry.urls.length) return null;
    if (Date.now() - entry.savedAt > CACHE_TTL_MS) return null;

    return entry.urls;
  } catch {
    return null;
  }
}

function writeCache(query, urls) {
  try {
    localStorage.setItem(CACHE_PREFIX + query, JSON.stringify({ urls, savedAt: Date.now() }));
  } catch {
    // Quota exceeded or storage disabled; the GIF still works, just uncached.
  }
}

async function searchGifs(query, signal) {
  const key = getConfig().GIPHY_API_KEY;
  if (!key) return null;

  const params = new URLSearchParams({
    api_key: key,
    q: query.slice(0, MAX_QUERY_LENGTH),
    limit: String(RESULT_LIMIT),
    offset: '0',
    // Never allow anything above a general audience rating in a weather app.
    rating: 'g',
    lang: 'en',
    bundle: 'messaging_non_clips'
  });

  const { response, data } = await getJson(`${SEARCH_URL}?${params.toString()}`, {
    provider: 'giphy',
    signal,
    timeoutMs: 8000
  });

  // Giphy reports auth and quota problems both via HTTP status and meta.status.
  const metaStatus = Number(data?.meta?.status);
  if (!response.ok || (Number.isFinite(metaStatus) && metaStatus >= 400)) return null;

  if (!Array.isArray(data?.data)) return null;

  const urls = data.data
    .map((gif) => gif?.images?.fixed_height?.url)
    .filter((url) => typeof url === 'string' && url.startsWith('https://'));

  return urls.length ? urls : null;
}

function pickRandom(urls) {
  return urls[Math.floor(Math.random() * urls.length)];
}

/**
 * Resolves a GIF URL for an OpenWeather condition, or null if one is not
 * available for any reason: no key, rate limit, network failure, or no match.
 * Never throws, so a Giphy outage cannot affect weather rendering.
 */
export async function getWeatherGif(condition, { signal } = {}) {
  const query = queryForCondition(condition);

  const cached = readCache(query);
  if (cached) return pickRandom(cached);

  try {
    const urls = await searchGifs(query, signal);
    if (!urls) return null;

    writeCache(query, urls);
    return pickRandom(urls);
  } catch {
    return null;
  }
}
