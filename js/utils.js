// Shared utilities for Weather-Hub

const WEATHER_API_BASE_URL = (window.WEATHER_HUB_CONFIG && window.WEATHER_HUB_CONFIG.WEATHER_API_BASE_URL) || '/api';

function buildWeatherApiUrl(endpoint, params) {
  const query = new URLSearchParams(params);
  const base = WEATHER_API_BASE_URL.replace(/\/$/, '');
  return base + endpoint + '?' + query.toString();
}

function formatDate(dt) {
  return new Date(dt * 1000).toLocaleDateString(undefined, {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function formatWindSpeed(ms) {
  return Math.round(ms * 3.6) + ' km/h';
}

function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function createElementWithText(tag, text, className) {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  if (className) el.className = className;
  return el;
}
