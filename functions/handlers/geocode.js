const { sendJson, sendError } = require('../lib/response');
const { getCoordinates } = require('../lib/validators');
const { fetchUpstream, UpstreamError } = require('../lib/httpClient');

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

/**
 * Prefers a locality-level name over the full street address, which is what the
 * UI wants to show as "your location".
 */
function pickDisplayName(results) {
  if (!Array.isArray(results) || results.length === 0) return null;

  const preferredTypes = ['locality', 'postal_town', 'administrative_area_level_2', 'administrative_area_level_1'];

  for (const type of preferredTypes) {
    const match = results.find((result) => result.types?.includes(type));
    if (match) {
      const locality = match.address_components?.find((c) => c.types?.includes(type))?.long_name;
      const country = match.address_components?.find((c) => c.types?.includes('country'))?.long_name;
      if (locality) return country ? `${locality}, ${country}` : locality;
    }
  }

  return results[0].formatted_address || null;
}

async function handleReverseGeocode(req, res, apiKey) {
  if (req.method !== 'GET') {
    sendError(res, 405, 'Method not allowed');
    return;
  }

  const coords = getCoordinates(req.query);
  if (!coords) {
    sendError(res, 400, 'Invalid lat/lon coordinates');
    return;
  }

  if (!apiKey) {
    console.error(JSON.stringify({ service: 'google-geocoding', event: 'missing-api-key' }));
    sendError(res, 503, 'Geocoding service is not configured.');
    return;
  }

  const params = new URLSearchParams({
    latlng: `${coords.lat},${coords.lon}`,
    key: apiKey,
    result_type: 'locality|postal_town|administrative_area_level_1|country'
  });

  const language = typeof req.query.lang === 'string' ? req.query.lang.slice(0, 10) : '';
  if (language) params.set('language', language);

  try {
    const { response, data } = await fetchUpstream(`${GEOCODE_URL}?${params.toString()}`, {
      service: 'google-geocoding'
    });

    // Geocoding signals failure in the body status, not the HTTP status.
    if (data?.status === 'ZERO_RESULTS') {
      sendJson(res, 200, { display_name: null, status: 'ZERO_RESULTS' }, 3600);
      return;
    }

    if (!response.ok || (data?.status && data.status !== 'OK')) {
      console.error(JSON.stringify({
        service: 'google-geocoding',
        event: 'upstream-error',
        httpStatus: response.status,
        status: data?.status,
        message: data?.error_message
      }));
      const status = data?.status === 'OVER_QUERY_LIMIT' ? 429 : 502;
      sendError(res, status, data?.error_message || 'Geocoding service unavailable');
      return;
    }

    sendJson(res, 200, {
      display_name: pickDisplayName(data.results),
      status: 'OK'
    }, 3600);
  } catch (error) {
    if (error instanceof UpstreamError) {
      sendError(res, error.status, error.message);
      return;
    }
    console.error(JSON.stringify({
      service: 'google-geocoding',
      event: 'unexpected-error',
      message: error.message
    }));
    sendError(res, 502, 'Geocoding service unavailable');
  }
}

module.exports = { handleReverseGeocode };
