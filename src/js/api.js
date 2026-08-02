/**
 * Single entry point for external data. Every provider is called directly from
 * the browser: this app runs on the Firebase Spark plan, which has no Cloud
 * Functions, so there is no server-side proxy to hide keys behind.
 */
import { getCurrentWeather, getForecast, reverseGeocode } from './providers/openweather.js';
import { getUvIndex } from './providers/openMeteo.js';
import { translateTexts } from './providers/myMemory.js';
import { getWeatherGif } from './providers/giphy.js';
import { getDatabase } from './firebase.js';

export { ApiError } from './providers/http.js';

export function fetchCurrentWeather(options) {
  return getCurrentWeather(options);
}

export function fetchForecast(options) {
  return getForecast(options);
}

export function fetchReverseGeocode(lat, lon, options) {
  return reverseGeocode(lat, lon, options);
}

export function fetchUvIndex(lat, lon, options) {
  return getUvIndex(lat, lon, options);
}

export function fetchTranslation(texts, source, target, options) {
  return translateTexts(texts, source, target, options);
}

export function fetchWeatherGif(condition, options) {
  return getWeatherGif(condition, options);
}

/**
 * Contact messages are written straight to the Realtime Database. The security
 * rules make this node write-only and validate every field, so the browser can
 * create a message but never read one back.
 */
export async function submitContact({ name, email, message }) {
  const database = getDatabase();
  if (!database) {
    throw new Error('Messaging is unavailable because Firebase is not configured.');
  }

  const ref = database.ref('contactMessages').push();
  await ref.set({
    name: name.slice(0, 100),
    email: email.slice(0, 254).toLowerCase(),
    message: message.slice(0, 2000),
    createdAt: new Date().toISOString(),
    status: 'new'
  });

  return { ok: true, id: ref.key };
}
