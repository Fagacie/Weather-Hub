import { getConfig } from './config.js';

const DEFAULT_TIMEOUT_MS = 12000;

const baseUrl = () => (getConfig().WEATHER_API_BASE_URL || '/api').replace(/\/$/, '');

export function buildWeatherApiUrl(endpoint, params = {}) {
  const query = new URLSearchParams(params);
  return `${baseUrl()}${endpoint}?${query.toString()}`;
}

export function buildApiUrl(endpoint) {
  return `${baseUrl()}${endpoint}`;
}

/**
 * Combines a caller-supplied AbortSignal with a timeout so a hung request can
 * never leave a spinner running forever.
 */
function withTimeout(signal, timeoutMs) {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  if (!signal) return timeoutSignal;
  return AbortSignal.any ? AbortSignal.any([signal, timeoutSignal]) : signal;
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function toRequestError(error) {
  if (error.name === 'AbortError') return error;
  if (error.name === 'TimeoutError') return new Error('The request timed out. Please try again.');
  return new Error('Network error. Check your internet connection.');
}

async function request(url, { signal, timeoutMs = DEFAULT_TIMEOUT_MS, ...init } = {}) {
  let res;
  try {
    res = await fetch(url, { ...init, signal: withTimeout(signal, timeoutMs) });
  } catch (error) {
    throw toRequestError(error);
  }

  const data = await readJson(res);

  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  if (data === null) {
    throw new Error('The server returned an unreadable response.');
  }

  return data;
}

export function parseWeatherResponse(res) {
  return res.json().then((data) => {
    if (!res.ok || (data.cod && Number(data.cod) >= 400)) {
      throw new Error(data.message || 'Weather data unavailable');
    }
    return data;
  });
}

export function fetchWeatherApi(endpoint, params = {}, options = {}) {
  return request(buildWeatherApiUrl(endpoint, params), options);
}

export function fetchTranslate(text, target, options = {}) {
  return request(buildApiUrl('/translate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, target }),
    timeoutMs: 15000,
    ...options
  });
}

export function fetchReverseGeocode(lat, lon, lang, options = {}) {
  const params = lang && lang !== 'en' ? { lat, lon, lang } : { lat, lon };
  return fetchWeatherApi('/reverse-geocode', params, options);
}

export function fetchUvIndex(lat, lon, options = {}) {
  return fetchWeatherApi('/uv', { lat, lon }, options);
}

export function fetchPublicConfig(options = {}) {
  return request(buildApiUrl('/config/public'), options);
}

export function submitContact({ name, email, message }, options = {}) {
  return request(buildApiUrl('/contact'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, message }),
    ...options
  });
}

export function fetchHealth(options = {}) {
  return request(buildApiUrl('/health'), options);
}
