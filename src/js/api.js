import { getConfig } from './config.js';

const baseUrl = () => (getConfig().WEATHER_API_BASE_URL || '/api').replace(/\/$/, '');

export function buildWeatherApiUrl(endpoint, params = {}) {
  const query = new URLSearchParams(params);
  return `${baseUrl()}${endpoint}?${query.toString()}`;
}

export function buildApiUrl(endpoint) {
  return `${baseUrl()}${endpoint}`;
}

async function parseApiJson(res) {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

export function parseWeatherResponse(res) {
  return res.json().then((data) => {
    if (!res.ok || (data.cod && Number(data.cod) !== 200)) {
      throw new Error(data.message || 'Weather data unavailable');
    }
    return data;
  });
}

export function fetchWeatherApi(endpoint, params = {}) {
  return fetch(buildWeatherApiUrl(endpoint, params)).then(parseWeatherResponse);
}

export function fetchTranslate(text, target) {
  return fetch(buildApiUrl('/translate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, target })
  }).then(parseApiJson);
}

export function fetchReverseGeocode(lat, lon) {
  return fetchWeatherApi('/reverse-geocode', { lat, lon });
}

export function fetchPublicConfig() {
  return fetch(buildApiUrl('/config/public')).then(parseApiJson);
}

export function submitContact({ name, email, message }) {
  return fetch(buildApiUrl('/contact'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, message })
  }).then(parseApiJson);
}

export function fetchHealth() {
  return fetch(buildApiUrl('/health')).then(parseApiJson);
}
