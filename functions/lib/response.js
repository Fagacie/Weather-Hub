function sendJson(res, status, data, cacheAge = 120) {
  res.status(status).set('Cache-Control', `public, max-age=${cacheAge}`).json(data);
}

function sendError(res, status, message) {
  res.status(status).json({ message });
}

module.exports = { sendJson, sendError };
