const { sendJson, sendError } = require('../lib/response');

async function handleReverseGeocode(req, res) {
  if (req.method !== 'GET') {
    sendError(res, 405, 'Method not allowed');
    return;
  }

  const numericLat = Number(req.query.lat);
  const numericLon = Number(req.query.lon);

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
  } catch (err) {
    sendError(res, 502, 'Geocoding service unavailable');
  }
}

module.exports = { handleReverseGeocode };
