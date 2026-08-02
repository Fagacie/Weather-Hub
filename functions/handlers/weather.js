const { sendJson, sendError } = require('../lib/response');
const { getLocationParams } = require('../lib/validators');

const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

async function handleWeatherRoute(req, res, endpoint, apiKey) {
  if (req.method !== 'GET') {
    sendError(res, 405, 'Method not allowed');
    return;
  }

  const locationParams = getLocationParams(req.query);
  if (!locationParams) {
    sendError(res, 400, 'Provide a valid city or lat/lon pair');
    return;
  }

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
}

module.exports = { handleWeatherRoute };
