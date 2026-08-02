const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

// Google Translate language codes accepted by the UI mapped to the closest
// OpenWeather code. OpenWeather has no Malay or Tamil, so those fall back to
// English for weather descriptions while still being translated by Google.
const OPENWEATHER_LANG_BY_UI_LANG = {
  en: 'en',
  ar: 'ar',
  ms: 'en',
  ta: 'en',
  hi: 'hi',
  'zh-CN': 'zh_cn'
};

const SUPPORTED_UI_LANGUAGES = Object.keys(OPENWEATHER_LANG_BY_UI_LANG);

function getLanguage(lang) {
  if (typeof lang !== 'string') return 'en';
  return OPENWEATHER_LANG_BY_UI_LANG[lang] || 'en';
}

function getCoordinates(query) {
  const lat = Number(query?.lat);
  const lon = Number(query?.lon);

  if (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  ) {
    return { lat, lon };
  }

  return null;
}

function getLocationParams(query) {
  const city = query?.city;

  if (city && typeof city === 'string' && city.trim()) {
    return { q: city.trim().slice(0, 100) };
  }

  const coords = getCoordinates(query);
  if (coords) {
    return { lat: String(coords.lat), lon: String(coords.lon) };
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

function validateTranslateInput(text, target, source) {
  if (!target || typeof target !== 'string' || !SUPPORTED_UI_LANGUAGES.includes(target)) {
    return { ok: false, message: `Unsupported target language. Supported: ${SUPPORTED_UI_LANGUAGES.join(', ')}` };
  }

  const cleanSource =
    typeof source === 'string' && SUPPORTED_UI_LANGUAGES.includes(source) ? source : undefined;

  if (Array.isArray(text)) {
    if (text.length === 0) {
      return { ok: false, message: 'Missing text to translate.' };
    }
    if (text.length > 100) {
      return { ok: false, message: 'Too many strings to translate at once (max 100).' };
    }
    const sanitized = text.map((item) => String(item ?? '').slice(0, 2000));
    if (sanitized.every((item) => item.trim() === '')) {
      return { ok: false, message: 'Missing text to translate.' };
    }
    return { ok: true, text: sanitized, source: cleanSource };
  }

  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, message: 'Missing text to translate.' };
  }

  return { ok: true, text: text.slice(0, 5000), source: cleanSource };
}

module.exports = {
  getLocationParams,
  getCoordinates,
  getLanguage,
  validateContact,
  validateTranslateInput,
  SUPPORTED_UI_LANGUAGES,
  EMAIL_RE
};
