const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { sendError } = require('./lib/response');
const { rateLimitMiddleware } = require('./lib/rateLimit');
const { handleWeatherRoute, handleUvIndex } = require('./handlers/weather');
const { handleReverseGeocode } = require('./handlers/geocode');
const { handleTranslate } = require('./handlers/translate');
const { handleContact } = require('./handlers/contact');
const { handlePublicConfig, handleHealth } = require('./handlers/config');

const openWeatherApiKey = defineSecret('OPENWEATHER_API_KEY');
const googleTranslateApiKey = defineSecret('GOOGLE_TRANSLATE_API_KEY');
const googleMapsApiKey = defineSecret('GOOGLE_MAPS_API_KEY');
const googleMapsServerKey = defineSecret('GOOGLE_MAPS_SERVER_KEY');

const ALLOWED_ORIGINS = new Set([
  'https://weather-hub-5ccbb.web.app',
  'https://weather-hub-5ccbb.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173'
]);

const ROUTES = [
  '/health',
  '/config/public',
  '/contact',
  '/weather',
  '/forecast',
  '/uv',
  '/reverse-geocode',
  '/translate'
];

function getApiPath(pathname) {
  const clean = (pathname || '').split('?')[0].replace(/\/+$/, '');
  return ROUTES.find((route) => clean.endsWith(route)) || null;
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  }
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Max-Age', '3600');
}

exports.api = onRequest(
  {
    secrets: [openWeatherApiKey, googleTranslateApiKey, googleMapsApiKey, googleMapsServerKey],
    region: 'us-central1',
    maxInstances: 10,
    timeoutSeconds: 30,
    memory: '256MiB'
  },
  async (req, res) => {
    applyCors(req, res);

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    const endpoint = getApiPath(req.path || req.url);
    if (!endpoint) {
      sendError(res, 404, 'API route not found');
      return;
    }

    const secrets = {
      openWeatherApiKey: openWeatherApiKey.value() || process.env.OPENWEATHER_API_KEY || '',
      googleTranslateApiKey: googleTranslateApiKey.value() || process.env.GOOGLE_TRANSLATE_API_KEY || '',
      googleMapsApiKey: googleMapsApiKey.value() || process.env.GOOGLE_MAPS_API_KEY || '',
      googleMapsServerKey:
        googleMapsServerKey.value() ||
        process.env.GOOGLE_MAPS_SERVER_KEY ||
        // Falling back to the browser key keeps geocoding working for anyone who
        // has not split their Maps credentials yet.
        googleMapsApiKey.value() ||
        process.env.GOOGLE_MAPS_API_KEY ||
        ''
    };

    try {
      if (endpoint === '/health') {
        handleHealth(req, res, secrets);
        return;
      }

      if (endpoint === '/config/public') {
        if (!rateLimitMiddleware('default')(req, res)) return;
        handlePublicConfig(req, res, secrets);
        return;
      }

      if (endpoint === '/contact') {
        if (!rateLimitMiddleware('contact')(req, res)) return;
        await handleContact(req, res);
        return;
      }

      if (endpoint === '/reverse-geocode') {
        if (!rateLimitMiddleware('default')(req, res)) return;
        await handleReverseGeocode(req, res, secrets.googleMapsServerKey);
        return;
      }

      if (endpoint === '/translate') {
        if (!rateLimitMiddleware('translate')(req, res)) return;
        await handleTranslate(req, res, secrets.googleTranslateApiKey);
        return;
      }

      if (endpoint === '/uv') {
        if (!rateLimitMiddleware('default')(req, res)) return;
        await handleUvIndex(req, res, secrets.openWeatherApiKey);
        return;
      }

      if (endpoint === '/weather' || endpoint === '/forecast') {
        if (!rateLimitMiddleware('default')(req, res)) return;
        await handleWeatherRoute(req, res, endpoint, secrets.openWeatherApiKey);
        return;
      }

      sendError(res, 404, 'API route not found');
    } catch (error) {
      console.error(JSON.stringify({
        service: 'api',
        event: 'unhandled-error',
        endpoint,
        message: error.message,
        stack: error.stack
      }));
      if (!res.headersSent) sendError(res, 500, 'Internal server error');
    }
  }
);
