const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function getLocationParams(query) {
  const city = query.city;
  const lat = query.lat;
  const lon = query.lon;

  if (city && typeof city === 'string' && city.trim()) {
    return { q: city.trim().slice(0, 100) };
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

function validateContact(body) {
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 100) : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : '';
  const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 2000) : '';

  if (!name || !email || !message) {
    return { ok: false, message: 'Name, email, and message are required.' };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: 'Invalid email address.' };
  }

  return { ok: true, data: { name, email, message } };
}

function validateTranslateInput(text, target) {
  if (!target || typeof target !== 'string' || target.length > 10) {
    return { ok: false, message: 'Invalid target language.' };
  }

  if (Array.isArray(text)) {
    if (text.length > 50) {
      return { ok: false, message: 'Too many strings to translate at once.' };
    }
    const sanitized = text.map((t) => String(t).slice(0, 500));
    return { ok: true, text: sanitized };
  }

  if (!text || typeof text !== 'string') {
    return { ok: false, message: 'Missing text to translate.' };
  }

  return { ok: true, text: text.slice(0, 5000) };
}

module.exports = { getLocationParams, validateContact, validateTranslateInput, EMAIL_RE };
