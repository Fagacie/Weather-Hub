const { sendJson, sendError } = require('../lib/response');

function handlePublicConfig(req, res, secrets) {
  if (req.method !== 'GET') {
    sendError(res, 405, 'Method not allowed');
    return;
  }

  sendJson(res, 200, {
    googleMapsApiKey: secrets.googleMapsApiKey || ''
  }, 3600);
}

function handleHealth(req, res) {
  if (req.method !== 'GET') {
    sendError(res, 405, 'Method not allowed');
    return;
  }

  sendJson(res, 200, {
    status: 'ok',
    service: 'weather-hub-api',
    timestamp: new Date().toISOString()
  }, 0);
}

module.exports = { handlePublicConfig, handleHealth };
