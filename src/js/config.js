import { FIREBASE_CONFIG } from './firebase-config.js';

function envOrFallback(key, fallback) {
  const value = import.meta.env[key];
  return value !== undefined && value !== '' ? value : fallback;
}

export function getConfig() {
  return {
    WEATHER_API_BASE_URL: import.meta.env.VITE_WEATHER_API_BASE_URL || '/api',
    GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    FIREBASE_CONFIG: {
      apiKey: envOrFallback('VITE_FIREBASE_API_KEY', FIREBASE_CONFIG.apiKey),
      authDomain: envOrFallback('VITE_FIREBASE_AUTH_DOMAIN', FIREBASE_CONFIG.authDomain),
      databaseURL: envOrFallback('VITE_FIREBASE_DATABASE_URL', FIREBASE_CONFIG.databaseURL),
      projectId: envOrFallback('VITE_FIREBASE_PROJECT_ID', FIREBASE_CONFIG.projectId),
      storageBucket: envOrFallback('VITE_FIREBASE_STORAGE_BUCKET', FIREBASE_CONFIG.storageBucket),
      messagingSenderId: envOrFallback('VITE_FIREBASE_MESSAGING_SENDER_ID', FIREBASE_CONFIG.messagingSenderId),
      appId: envOrFallback('VITE_FIREBASE_APP_ID', FIREBASE_CONFIG.appId),
      measurementId: envOrFallback('VITE_FIREBASE_MEASUREMENT_ID', FIREBASE_CONFIG.measurementId)
    }
  };
}
