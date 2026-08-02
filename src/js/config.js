import { FIREBASE_CONFIG } from './firebase-config.js';

// Vite only substitutes statically-written `import.meta.env.VITE_*` references,
// so each key must be spelled out rather than looked up dynamically.
function pick(envValue, fallback) {
  return typeof envValue === 'string' && envValue !== '' ? envValue : fallback;
}

export function getConfig() {
  return {
    // Public by necessity: with no backend, the browser calls OpenWeather
    // directly. A free-tier key cannot incur charges, only rate limits.
    OPENWEATHER_API_KEY: pick(import.meta.env.VITE_OPENWEATHER_API_KEY, ''),
    // Optional. A Giphy beta key is free and rate limited; when absent the
    // weather GIF panel simply stays hidden.
    GIPHY_API_KEY: pick(import.meta.env.VITE_GIPHY_API_KEY, ''),
    FIREBASE_CONFIG: {
      apiKey: pick(import.meta.env.VITE_FIREBASE_API_KEY, FIREBASE_CONFIG.apiKey),
      authDomain: pick(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, FIREBASE_CONFIG.authDomain),
      databaseURL: pick(import.meta.env.VITE_FIREBASE_DATABASE_URL, FIREBASE_CONFIG.databaseURL),
      projectId: pick(import.meta.env.VITE_FIREBASE_PROJECT_ID, FIREBASE_CONFIG.projectId),
      storageBucket: pick(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, FIREBASE_CONFIG.storageBucket),
      messagingSenderId: pick(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, FIREBASE_CONFIG.messagingSenderId),
      appId: pick(import.meta.env.VITE_FIREBASE_APP_ID, FIREBASE_CONFIG.appId),
      measurementId: pick(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, FIREBASE_CONFIG.measurementId)
    }
  };
}
