const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

const openWeatherApiKey = defineSecret('OPENWEATHER_API_KEY');
const googleTranslateApiKey = defineSecret('GOOGLE_TRANSLATE_API_KEY');
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

function sendJson(res, status, data, cacheAge = 120) {
  res.status(status).set('Cache-Control', `public, max-age=${cacheAge}`).json(data);
}

function sendError(res, status, message) {
  res.status(status).json({ message });
}

function getApiPath(pathname) {
  pathname = (pathname || '').split('?')[0];
  if (pathname.endsWith('/weather')) return '/weather';
  if (pathname.endsWith('/forecast')) return '/forecast';
  if (pathname.endsWith('/reverse-geocode')) return '/reverse-geocode';
  if (pathname.endsWith('/translate')) return '/translate';
  return null;
}

function getLocationParams(query) {
  const lat = query.lat;
  const lon = query.lon;
  const city = query.city;

  if (city && typeof city === 'string' && city.trim()) {
    return { q: city.trim() };
  }

  if (lat !== undefined && lon !== undefined) {
    const numericLat = Number(lat);
    const numericLon = Number(lon);

    if (
      Number.isFinite(numericLat) &&
      Number.isFinite(numericLon) &&
      numericLat >= -90 &&
      numericLat <= 90 &&
      numericLon >= -180 &&
      numericLon <= 180
    ) {
      return { lat: String(numericLat), lon: String(numericLon) };
    }
  }

  return null;
}

exports.api = onRequest({ secrets: [openWeatherApiKey, googleTranslateApiKey], region: 'us-central1' }, async (req, res) => {
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

  // Route: Reverse Geocoding via Nominatim
  if (endpoint === '/reverse-geocode') {
    if (req.method !== 'GET') {
      sendError(res, 405, 'Method not allowed');
      return;
    }
    const { lat, lon } = req.query;
    const numericLat = Number(lat);
    const numericLon = Number(lon);
    if (!Number.isFinite(numericLat) || !Number.isFinite(numericLon)) {
      sendError(res, 400, 'Invalid lat/lon coordinates');
      return;
    }
    try {
      const upstream = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${numericLat}&lon=${numericLon}&format=json`,
        { headers: { 'User-Agent': 'WeatherHubApp/1.0' } }
      );
      const data = await upstream.json();
      sendJson(res, 200, data, 3600);
      return;
    } catch (err) {
      sendError(res, 502, 'Geocoding service unavailable');
      return;
    }
  }

  // Route: Translation via Google Translate Proxy
  if (endpoint === '/translate') {
    if (req.method !== 'POST' && req.method !== 'GET') {
      sendError(res, 405, 'Method not allowed');
      return;
    }
    const apiKey = googleTranslateApiKey.value() || process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) {
      sendError(res, 500, 'Google Translate API key is not configured on server');
      return;
    }
    const text = req.body ? req.body.text : req.query.text;
    const target = req.body ? req.body.target : req.query.target;
    if (!text || !target) {
      sendError(res, 400, 'Missing text or target language parameter');
      return;
    }
    try {
      const upstream = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: text, target: target })
        }
      );
      const data = await upstream.json();
      sendJson(res, 200, data, 86400);
      return;
    } catch (err) {
      sendError(res, 502, 'Translation service unavailable');
      return;
    }
  }

  // Routes: OpenWeather (/weather, /forecast)
  if (req.method !== 'GET') {
    sendError(res, 405, 'Method not allowed');
    return;
  }

  const locationParams = getLocationParams(req.query);
  if (!locationParams) {
    sendError(res, 400, 'Provide a valid city or lat/lon pair');
    return;
  }

  const apiKey = openWeatherApiKey.value() || process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    sendError(res, 500, 'OpenWeather API key is not configured');
    return;
  }

  const upstreamParams = new URLSearchParams({
    ...locationParams,
    appid: apiKey,
    units: 'metric'
  });

  try {
    const upstream = await fetch(`${OPENWEATHER_BASE_URL}${endpoint}?${upstreamParams.toString()}`);
    const data = await upstream.json();

    if (!upstream.ok || (data.cod && Number(data.cod) >= 400)) {
      sendError(res, upstream.status || 502, data.message || 'Weather data unavailable');
      return;
    }

    sendJson(res, 200, data, 120);
  } catch (error) {
    sendError(res, 502, 'Weather service unavailable');
  }
});

