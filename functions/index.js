const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { sendError } = require('./lib/response');
const { rateLimitMiddleware } = require('./lib/rateLimit');
const { handleWeatherRoute } = require('./handlers/weather');
const { handleReverseGeocode } = require('./handlers/geocode');
const { handleTranslate } = require('./handlers/translate');
const { handleContact } = require('./handlers/contact');
const { handlePublicConfig, handleHealth } = require('./handlers/config');

const openWeatherApiKey = defineSecret('OPENWEATHER_API_KEY');
const googleTranslateApiKey = defineSecret('GOOGLE_TRANSLATE_API_KEY');
const googleMapsApiKey = defineSecret('GOOGLE_MAPS_API_KEY');

function getApiPath(pathname) {
  pathname = (pathname || '').split('?')[0];
  if (pathname.endsWith('/health')) return '/health';
  if (pathname.endsWith('/config/public')) return '/config/public';
  if (pathname.endsWith('/contact')) return '/contact';
  if (pathname.endsWith('/weather')) return '/weather';
  if (pathname.endsWith('/forecast')) return '/forecast';
  if (pathname.endsWith('/reverse-geocode')) return '/reverse-geocode';
  if (pathname.endsWith('/translate')) return '/translate';
  return null;
}

exports.api = onRequest(
  {
    secrets: [openWeatherApiKey, googleTranslateApiKey, googleMapsApiKey],
    region: 'us-central1'
  },
  async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

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
      openWeatherApiKey: openWeatherApiKey.value() || process.env.OPENWEATHER_API_KEY,
      googleTranslateApiKey: googleTranslateApiKey.value() || process.env.GOOGLE_TRANSLATE_API_KEY,
      googleMapsApiKey: googleMapsApiKey.value() || process.env.GOOGLE_MAPS_API_KEY
    };

    if (endpoint === '/health') {
      handleHealth(req, res);
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
      await handleReverseGeocode(req, res);
      return;
    }

    if (endpoint === '/translate') {
      if (!rateLimitMiddleware('translate')(req, res)) return;
      await handleTranslate(req, res, secrets.googleTranslateApiKey);
      return;
    }

    if (endpoint === '/weather' || endpoint === '/forecast') {
      if (!rateLimitMiddleware('default')(req, res)) return;
      await handleWeatherRoute(req, res, endpoint, secrets.openWeatherApiKey);
      return;
    }

    sendError(res, 404, 'API route not found');
  }
);
