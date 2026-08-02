function sendJson(res, status, data, cacheAge = 120) {
  const cacheControl = cacheAge > 0 ? `public, max-age=${cacheAge}` : 'no-store';
  res.status(status).set('Cache-Control', cacheControl).json(data);
}

function sendError(res, status, message) {
  res.status(status).set('Cache-Control', 'no-store').json({ message });
}

module.exports = { sendJson, sendError };
