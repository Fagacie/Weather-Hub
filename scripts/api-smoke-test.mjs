#!/usr/bin/env node
/**
 * Verifies every external provider Weather Hub depends on. There is no backend
 * to test, so this calls the same public endpoints the browser calls.
 *
 *   npm run test:api
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(ROOT, '.env.local'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
  } catch {
    // No .env.local: fall back to the ambient environment.
  }
}

loadEnvLocal();

const OPENWEATHER_KEY = process.env.VITE_OPENWEATHER_API_KEY || '';
const GIPHY_KEY = process.env.VITE_GIPHY_API_KEY || '';
const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  const label = ok ? 'PASS' : 'FAIL';
  console.log(`${label}  ${name}${detail ? ` — ${detail}` : ''}`);
}

// Giphy is optional, so an absent key is reported without failing the suite.
function skip(name, detail) {
  results.push({ name, ok: true, skipped: true, detail });
  console.log(`SKIP  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function check(name, fn) {
  try {
    const detail = await fn();
    record(name, true, detail);
  } catch (error) {
    record(name, false, error.message);
  }
}

/**
 * Retries only connection-level failures, never HTTP statuses, so a flaky local
 * network cannot be mistaken for a provider regression. An endpoint that is
 * genuinely down still fails after exhausting the attempts.
 */
async function fetchWithRetry(url, attempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(url, { signal: AbortSignal.timeout(15000) });
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  const cause = lastError?.cause?.code || lastError?.message || 'unknown';
  throw new Error(`network failure after ${attempts} attempts (${cause})`);
}

async function getJson(url, label) {
  const response = await fetchWithRetry(url);
  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`${label} returned non-JSON (HTTP ${response.status})`);
  }

  return { response, data };
}

const OW = 'https://api.openweathermap.org';

async function run() {
  console.log('Weather Hub provider smoke test\n');

  if (!OPENWEATHER_KEY) {
    record('OpenWeather key present', false, 'VITE_OPENWEATHER_API_KEY is empty in .env.local');
  } else {
    record('OpenWeather key present', true, `${OPENWEATHER_KEY.slice(0, 4)}…`);

    await check('OpenWeather current weather (London)', async () => {
      const { response, data } = await getJson(
        `${OW}/data/2.5/weather?q=London&units=metric&appid=${OPENWEATHER_KEY}`,
        'OpenWeather'
      );
      if (response.status === 401) {
        throw new Error('401 — key invalid or not activated yet (can take up to 2 hours)');
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${data?.message}`);
      if (!Number.isFinite(data?.main?.temp)) throw new Error('no temperature in response');
      return `${Math.round(data.main.temp)}°C, ${data.weather?.[0]?.description}`;
    });

    await check('OpenWeather 5-day forecast (coords)', async () => {
      const { response, data } = await getJson(
        `${OW}/data/2.5/forecast?lat=5.33&lon=103.14&units=metric&appid=${OPENWEATHER_KEY}`,
        'OpenWeather'
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${data?.message}`);
      if (!Array.isArray(data?.list) || !data.list.length) throw new Error('empty forecast list');
      return `${data.list.length} slots`;
    });

    await check('OpenWeather reverse geocoding', async () => {
      const { response, data } = await getJson(
        `${OW}/geo/1.0/reverse?lat=48.8584&lon=2.2945&limit=1&appid=${OPENWEATHER_KEY}`,
        'OpenWeather'
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!Array.isArray(data) || !data[0]?.name) throw new Error('no place returned');
      return `${data[0].name}, ${data[0].country}`;
    });

    await check('OpenWeather rejects a bad city with 404', async () => {
      const { response } = await getJson(
        `${OW}/data/2.5/weather?q=zzzznotarealplace&appid=${OPENWEATHER_KEY}`,
        'OpenWeather'
      );
      if (response.status !== 404) throw new Error(`expected 404, got ${response.status}`);
      return 'handled';
    });
  }

  await check('Open-Meteo UV index (no key required)', async () => {
    const { response, data } = await getJson(
      'https://api.open-meteo.com/v1/forecast?latitude=5.33&longitude=103.14&current=uv_index',
      'Open-Meteo'
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const uv = data?.current?.uv_index;
    if (!Number.isFinite(uv)) throw new Error('no uv_index in response');
    return `UV ${uv}`;
  });

  await check('MyMemory translation (en to ar)', async () => {
    const { response, data } = await getJson(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent('Partly cloudy')}&langpair=en|ar`,
      'MyMemory'
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const translated = data?.responseData?.translatedText;
    if (!translated) throw new Error('empty translation');
    if (Number(data.responseStatus) === 429) throw new Error('daily quota exhausted');
    return translated;
  });

  await check('Open-Meteo place search (map autocomplete)', async () => {
    const { response, data } = await getJson(
      'https://geocoding-api.open-meteo.com/v1/search?name=Kuala+Lumpur&count=1&format=json',
      'Open-Meteo geocoding'
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const place = data?.results?.[0];
    if (!place) throw new Error('no results');
    return `${place.name}, ${place.country}`;
  });

  if (!GIPHY_KEY) {
    skip('Giphy weather GIF', 'VITE_GIPHY_API_KEY not set; the GIF panel stays hidden');
  } else {
    await check('Giphy search returns a usable GIF (rating=g)', async () => {
      const params = new URLSearchParams({
        api_key: GIPHY_KEY,
        q: 'sunny day',
        limit: '10',
        rating: 'g',
        lang: 'en'
      });
      const { response, data } = await getJson(`https://api.giphy.com/v1/gifs/search?${params}`, 'Giphy');

      if (response.status === 401 || response.status === 403) throw new Error('key rejected by Giphy');
      if (response.status === 429) throw new Error('429 — beta key limit is 100 calls/hour');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const url = data?.data?.[0]?.images?.fixed_height?.url;
      if (!url) throw new Error('no fixed_height URL in response');
      if (!url.startsWith('https://')) throw new Error('URL is not https');

      const offRating = (data.data || []).find((g) => !['g', 'y'].includes(String(g.rating).toLowerCase()));
      if (offRating) throw new Error(`rating filter leaked "${offRating.rating}"`);

      return `${data.data.length} results, all rated g`;
    });

    await check('Giphy handles an invalid key without throwing', async () => {
      const params = new URLSearchParams({ api_key: 'invalid-key-smoke-test', q: 'rain', limit: '1', rating: 'g' });
      const { response, data } = await getJson(`https://api.giphy.com/v1/gifs/search?${params}`, 'Giphy');

      const metaStatus = Number(data?.meta?.status);
      const rejected = !response.ok || (Number.isFinite(metaStatus) && metaStatus >= 400);
      if (!rejected) throw new Error('an invalid key was accepted');

      return `rejected with HTTP ${response.status}, handled as no-GIF`;
    });
  }

  await check('OpenStreetMap tile server', async () => {
    const response = await fetchWithRetry('https://tile.openstreetmap.org/10/512/512.png');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return `tile ok (${response.headers.get('content-type')})`;
  });

  const failed = results.filter((r) => !r.ok);
  const skipped = results.filter((r) => r.skipped).length;
  const passed = results.length - failed.length - skipped;
  console.log(`\n${passed}/${results.length - skipped} checks passed${skipped ? ` (${skipped} skipped)` : ''}`);

  if (failed.length) {
    console.log('\nFailed checks:');
    failed.forEach((r) => console.log(`  - ${r.name}: ${r.detail}`));
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('Smoke test crashed:', error);
  process.exitCode = 1;
});
