const { sendJson, sendError } = require('../lib/response');
const { validateTranslateInput } = require('../lib/validators');

async function handleTranslate(req, res, apiKey) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    sendError(res, 405, 'Method not allowed');
    return;
  }

  if (!apiKey) {
    sendError(res, 500, 'Google Translate API key is not configured on server');
    return;
  }

  const text = req.body ? req.body.text : req.query.text;
  const target = req.body ? req.body.target : req.query.target;
  const validation = validateTranslateInput(text, target);

  if (!validation.ok) {
    sendError(res, 400, validation.message);
    return;
  }

  try {
    const upstream = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: validation.text, target })
      }
    );
    const data = await upstream.json();

    if (!upstream.ok) {
      sendError(res, upstream.status || 502, data?.error?.message || 'Translation service unavailable');
      return;
    }

    sendJson(res, 200, data, 86400);
  } catch (err) {
    sendError(res, 502, 'Translation service unavailable');
  }
}

module.exports = { handleTranslate };
