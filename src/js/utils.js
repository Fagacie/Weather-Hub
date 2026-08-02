export function formatDate(dt) {
  return new Date(dt * 1000).toLocaleDateString(undefined, {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function formatWindSpeed(ms) {
  return `${Math.round(ms * 3.6)} km/h`;
}

export function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const ICON_CODE_RE = /^\d{2}[dn]$/;

/**
 * Builds an OpenWeather icon URL. HTML-escaping is the wrong transform for a
 * URL, so the code is validated against the documented format instead.
 */
export function weatherIconUrl(code, size = '2x') {
  const safeCode = ICON_CODE_RE.test(code) ? code : '01d';
  return `https://openweathermap.org/img/wn/${safeCode}@${size}.png`;
}

export function createElementWithText(tag, text, className) {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  if (className) el.className = className;
  return el;
}

export const FUN_FACTS = [
  'Did you know? The highest temperature ever recorded on Earth was 56.7°C (134°F) in Death Valley, USA.',
  'Raindrops can fall at speeds of about 22 miles per hour!',
  'Snowflakes always have six sides.',
  'The coldest temperature ever recorded was -89.2°C (-128.6°F) in Antarctica.',
  'A bolt of lightning is five times hotter than the surface of the sun.',
  'The wettest place on Earth is Mawsynram, India, with 11,871mm of rain a year.',
  'Hurricanes can release energy equivalent to 10 atomic bombs per second.',
  'The fastest wind speed ever recorded was 253 mph during Tropical Cyclone Olivia.',
  'The Sahara Desert can reach freezing temperatures at night.',
  'Fog is actually a cloud that touches the ground.'
];

export function randomFunFact() {
  return FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)];
}
