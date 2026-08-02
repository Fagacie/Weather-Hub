const { sendJson, sendError } = require('../lib/response');
const { validateTranslateInput } = require('../lib/validators');
const { fetchUpstream, UpstreamError } = require('../lib/httpClient');

const TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2';

function describeGoogleFailure(status, data) {
  const reason = data?.error?.errors?.[0]?.reason || '';

  if (reason === 'keyInvalid' || status === 400) {
    return { status: 502, message: 'Translation service rejected the API key.' };
  }
  if (reason === 'dailyLimitExceeded' || reason === 'rateLimitExceeded' || status === 429) {
    return { status: 429, message: 'Translation quota reached. Try again later.' };
  }
  if (reason === 'billingNotEnabled' || status === 403) {
    return { status: 502, message: 'Translation service is not enabled for billing.' };
  }
  return {
    status: status >= 500 ? 502 : status || 502,
    message: data?.error?.message || 'Translation service unavailable'
  };
}

/**
 * Reads a field from the JSON body first, then the query string. `req.body` is
 * always an object on Cloud Functions, so it cannot be used as a presence test.
 */
function readParam(req, name) {
  const fromBody = req.body && typeof req.body === 'object' ? req.body[name] : undefined;
  if (fromBody !== undefined) return fromBody;
  return req.query ? req.query[name] : undefined;
}

async function handleTranslate(req, res, apiKey) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    sendError(res, 405, 'Method not allowed');
    return;
  }

  if (!apiKey) {
    console.error(JSON.stringify({ service: 'google-translate', event: 'missing-api-key' }));
    sendError(res, 503, 'Translation service is not configured.');
    return;
  }

  const validation = validateTranslateInput(
    readParam(req, 'text'),
    readParam(req, 'target'),
    readParam(req, 'source')
  );

  if (!validation.ok) {
    sendError(res, 400, validation.message);
    return;
  }

  // `format: 'text'` stops Google from returning HTML entities such as &#39;
  // which would otherwise render literally in the DOM.
  const payload = {
    q: validation.text,
    target: readParam(req, 'target'),
    format: 'text'
  };
  if (validation.source) payload.source = validation.source;

  try {
    const { response, data } = await fetchUpstream(`${TRANSLATE_URL}?key=${encodeURIComponent(apiKey)}`, {
      service: 'google-translate',
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      timeoutMs: 8000
    });

    if (!response.ok) {
      const failure = describeGoogleFailure(response.status, data);
      console.error(JSON.stringify({
        service: 'google-translate',
        event: 'upstream-error',
        status: response.status,
        reason: data?.error?.errors?.[0]?.reason,
        message: data?.error?.message
      }));
      sendError(res, failure.status, failure.message);
      return;
    }

    const translations = data?.data?.translations;
    if (!Array.isArray(translations)) {
      console.error(JSON.stringify({
        service: 'google-translate',
        event: 'unexpected-payload'
      }));
      sendError(res, 502, 'Translation service returned an unexpected response.');
      return;
    }

    sendJson(res, 200, data, 86400);
  } catch (error) {
    if (error instanceof UpstreamError) {
      sendError(res, error.status, error.message);
      return;
    }
    console.error(JSON.stringify({
      service: 'google-translate',
      event: 'unexpected-error',
      message: error.message
    }));
    sendError(res, 502, 'Translation service unavailable');
  }
}

module.exports = { handleTranslate };
