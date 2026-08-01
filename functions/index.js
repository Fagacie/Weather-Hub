const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

const openWeatherApiKey = defineSecret('OPENWEATHER_API_KEY');
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

function sendJson(res, status, data) {
  res.status(status).set('Cache-Control', 'public, max-age=120').json(data);
}

function sendError(res, status, message) {
  res.status(status).json({ message });
}

function getOpenWeatherPath(pathname) {
  pathname = pathname.split('?')[0];
  if (pathname.endsWith('/weather')) return '/weather';
  if (pathname.endsWith('/forecast')) return '/forecast';
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

exports.api = onRequest({ secrets: [openWeatherApiKey], region: 'us-central1' }, async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET') {
    sendError(res, 405, 'Method not allowed');
    return;
  }

  const endpoint = getOpenWeatherPath(req.path || req.url);
  if (!endpoint) {
    sendError(res, 404, 'API route not found');
    return;
  }

  const locationParams = getLocationParams(req.query);
  if (!locationParams) {
    sendError(res, 400, 'Provide a valid city or lat/lon pair');
    return;
  }

  const apiKey = openWeatherApiKey.value();
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

    sendJson(res, 200, data);
  } catch (error) {
    sendError(res, 502, 'Weather service unavailable');
  }
});
