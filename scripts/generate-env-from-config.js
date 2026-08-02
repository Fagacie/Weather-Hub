import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const legacyConfigPath = path.join(root, 'js', 'config.js');
const envProductionPath = path.join(root, '.env.production');

if (fs.existsSync(envProductionPath) || !fs.existsSync(legacyConfigPath)) {
  process.exit(0);
}

const content = fs.readFileSync(legacyConfigPath, 'utf8');
const config = new Function(content + '; return WEATHER_HUB_CONFIG;')();
const firebase = config.FIREBASE_CONFIG || {};

const entries = {
  VITE_WEATHER_API_BASE_URL: config.WEATHER_API_BASE_URL,
  VITE_GOOGLE_MAPS_API_KEY: config.GOOGLE_MAPS_API_KEY,
  VITE_FIREBASE_API_KEY: firebase.apiKey,
  VITE_FIREBASE_AUTH_DOMAIN: firebase.authDomain,
  VITE_FIREBASE_DATABASE_URL: firebase.databaseURL,
  VITE_FIREBASE_PROJECT_ID: firebase.projectId,
  VITE_FIREBASE_STORAGE_BUCKET: firebase.storageBucket,
  VITE_FIREBASE_MESSAGING_SENDER_ID: firebase.messagingSenderId,
  VITE_FIREBASE_APP_ID: firebase.appId,
  VITE_FIREBASE_MEASUREMENT_ID: firebase.measurementId
};

// Blank entries are omitted so the committed defaults in src/js/firebase-config.js
// stay in effect instead of being overwritten with empty strings.
const lines = Object.entries(entries)
  .filter(([, value]) => typeof value === 'string' && value !== '')
  .map(([key, value]) => `${key}=${value}`);

if (lines.length === 0) {
  console.log('Legacy js/config.js had no usable values; skipping .env.production');
  process.exit(0);
}

fs.writeFileSync(envProductionPath, lines.join('\n') + '\n');
console.log(`Generated .env.production from js/config.js (${lines.length} values)`);
