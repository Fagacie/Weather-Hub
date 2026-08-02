const { sendJson, sendError } = require('../lib/response');

function handlePublicConfig(req, res, secrets) {
  if (req.method !== 'GET') {
    sendError(res, 405, 'Method not allowed');
    return;
  }

  // Only the referrer-restricted browser key is exposed; the server key used for
  // geocoding must never leave the function.
  sendJson(res, 200, {
    googleMapsApiKey: secrets.googleMapsApiKey || '',
    mapId: process.env.GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID'
  }, 3600);
}

function handleHealth(req, res, secrets = {}) {
  if (req.method !== 'GET') {
    sendError(res, 405, 'Method not allowed');
    return;
  }

  // Booleans only: enough to diagnose a misconfigured deploy without leaking keys.
  sendJson(res, 200, {
    status: 'ok',
    service: 'weather-hub-api',
    timestamp: new Date().toISOString(),
    configured: {
      openWeather: Boolean(secrets.openWeatherApiKey),
      googleTranslate: Boolean(secrets.googleTranslateApiKey),
      googleMapsBrowser: Boolean(secrets.googleMapsApiKey),
      googleMapsServer: Boolean(secrets.googleMapsServerKey)
    }
  }, 0);
}

module.exports = { handlePublicConfig, handleHealth };
