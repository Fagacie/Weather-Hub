const { sendJson, sendError } = require('../lib/response');
const { getLocationParams, getLanguage, getCoordinates } = require('../lib/validators');
const { fetchUpstream, UpstreamError } = require('../lib/httpClient');

const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';
const ONECALL_URL = 'https://api.openweathermap.org/data/3.0/onecall';

/**
 * OpenWeather returns the same shape for most failures, so map status codes to
 * messages a user can act on instead of collapsing everything into one error.
 */
function describeOpenWeatherFailure(status, data) {
  if (status === 401) return { status: 502, message: 'Weather service rejected the API key.' };
  if (status === 404) return { status: 404, message: 'Location not found. Check the city name.' };
  if (status === 429) return { status: 429, message: 'Weather service rate limit reached. Try again shortly.' };
  return {
    status: status >= 500 ? 502 : status || 502,
    message: data?.message || 'Weather data unavailable'
  };
}

async function handleWeatherRoute(req, res, endpoint, apiKey) {
  if (req.method !== 'GET') {
    sendError(res, 405, 'Method not allowed');
    return;
  }

  if (!apiKey) {
    console.error(JSON.stringify({ service: 'openweather', event: 'missing-api-key' }));
    sendError(res, 503, 'Weather service is not configured.');
    return;
  }

  const locationParams = getLocationParams(req.query);
  if (!locationParams) {
    sendError(res, 400, 'Provide a valid city or lat/lon pair');
    return;
  }

  const upstreamParams = new URLSearchParams({
    ...locationParams,
    appid: apiKey,
    units: 'metric',
    lang: getLanguage(req.query.lang)
  });

  try {
    const { response, data } = await fetchUpstream(
      `${OPENWEATHER_BASE_URL}${endpoint}?${upstreamParams.toString()}`,
      { service: 'openweather' }
    );

    const upstreamCode = data?.cod !== undefined ? Number(data.cod) : response.status;

    if (!response.ok || upstreamCode >= 400) {
      const failure = describeOpenWeatherFailure(response.status || upstreamCode, data);
      console.error(JSON.stringify({
        service: 'openweather',
        event: 'upstream-error',
        endpoint,
        status: response.status,
        upstreamCode,
        message: data?.message
      }));
      sendError(res, failure.status, failure.message);
      return;
    }

    sendJson(res, 200, data, 120);
  } catch (error) {
    if (error instanceof UpstreamError) {
      sendError(res, error.status, error.message);
      return;
    }
    console.error(JSON.stringify({
      service: 'openweather',
      event: 'unexpected-error',
      message: error.message
    }));
    sendError(res, 502, 'Weather service unavailable');
  }
}

/**
 * UV index lives in One Call 3.0, which is a separate OpenWeather subscription.
 * A 401 here means "not subscribed" rather than "broken", so it is reported
 * distinctly and the UI hides the tile instead of showing a dead placeholder.
 */
async function handleUvIndex(req, res, apiKey) {
  if (req.method !== 'GET') {
    sendError(res, 405, 'Method not allowed');
    return;
  }

  if (!apiKey) {
    sendError(res, 503, 'Weather service is not configured.');
    return;
  }

  const coords = getCoordinates(req.query);
  if (!coords) {
    sendError(res, 400, 'Invalid lat/lon coordinates');
    return;
  }

  const params = new URLSearchParams({
    lat: String(coords.lat),
    lon: String(coords.lon),
    appid: apiKey,
    units: 'metric',
    exclude: 'minutely,hourly,daily,alerts'
  });

  try {
    const { response, data } = await fetchUpstream(`${ONECALL_URL}?${params.toString()}`, {
      service: 'openweather-onecall'
    });

    if (response.status === 401) {
      sendJson(res, 200, { available: false, reason: 'not-subscribed' }, 3600);
      return;
    }

    if (!response.ok) {
      sendJson(res, 200, { available: false, reason: 'unavailable' }, 300);
      return;
    }

    sendJson(res, 200, { available: true, uvi: data?.current?.uvi ?? null }, 900);
  } catch (error) {
    sendJson(res, 200, { available: false, reason: 'unavailable' }, 60);
  }
}

module.exports = { handleWeatherRoute, handleUvIndex };
