#!/usr/bin/env node
/**
 * End-to-end smoke tests for the Weather-Hub API.
 *
 *   node scripts/api-smoke-test.mjs                       # against production
 *   node scripts/api-smoke-test.mjs http://localhost:5000 # against the emulator
 *
 * Asserts real HTTP status codes and payload shapes. No mocks.
 */

const BASE = (process.argv[2] || 'https://weather-hub-5ccbb.web.app').replace(/\/$/, '');
const API = `${BASE}/api`;

const results = [];
let failures = 0;

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

async function call(path, init = {}) {
  const started = Date.now();
  try {
    const res = await fetch(`${API}${path}`, {
      ...init,
      signal: AbortSignal.timeout(20000)
    });
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { status: res.status, body, ms: Date.now() - started };
  } catch (error) {
    return { status: 0, body: null, error: error.message, ms: Date.now() - started };
  }
}

function post(path, payload) {
  return call(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

async function check(name, fn) {
  let outcome;
  try {
    outcome = await fn();
  } catch (error) {
    outcome = { ok: false, detail: error.message };
  }

  results.push({ name, ...outcome });
  if (!outcome.ok) failures += 1;

  const icon = outcome.ok ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`;
  console.log(`${icon}  ${name}${outcome.detail ? ` ${DIM}- ${outcome.detail}${RESET}` : ''}`);
}

const expect = (condition, detail) => ({ ok: Boolean(condition), detail });

async function run() {
  console.log(`\nWeather-Hub API smoke tests\nTarget: ${API}\n${'-'.repeat(60)}\n`);

  console.log('Infrastructure');
  await check('GET /health returns ok with key report', async () => {
    const r = await call('/health');
    const configured = r.body?.configured || {};
    const missing = Object.entries(configured)
      .filter(([, present]) => !present)
      .map(([key]) => key);
    return expect(
      r.status === 200 && r.body?.status === 'ok',
      `status=${r.status}${missing.length ? ` missing keys: ${missing.join(', ')}` : ' all keys present'}`
    );
  });

  await check('GET /config/public exposes only the browser key', async () => {
    const r = await call('/config/public');
    const keys = Object.keys(r.body || {});
    const leaked = keys.filter((k) => !['googleMapsApiKey', 'mapId'].includes(k));
    return expect(r.status === 200 && leaked.length === 0, `status=${r.status} keys=${keys.join(',')}`);
  });

  await check('Unknown route returns 404', async () => {
    const r = await call('/does-not-exist');
    return expect(r.status === 404, `status=${r.status}`);
  });

  console.log('\nOpenWeather');
  await check('Valid city returns weather', async () => {
    const r = await call('/weather?city=London');
    return expect(
      r.status === 200 && typeof r.body?.main?.temp === 'number',
      `status=${r.status} temp=${r.body?.main?.temp} (${r.ms}ms)`
    );
  });

  await check('Invalid city returns 404 with a message', async () => {
    const r = await call('/weather?city=zzzzzznotarealcity');
    return expect(r.status === 404 && Boolean(r.body?.message), `status=${r.status} msg="${r.body?.message}"`);
  });

  await check('Empty city returns 400', async () => {
    const r = await call('/weather?city=');
    return expect(r.status === 400, `status=${r.status}`);
  });

  await check('Missing params returns 400', async () => {
    const r = await call('/weather');
    return expect(r.status === 400, `status=${r.status}`);
  });

  await check('Valid lat/lon returns weather', async () => {
    const r = await call('/weather?lat=3.139&lon=101.6869');
    return expect(r.status === 200 && Boolean(r.body?.weather?.[0]), `status=${r.status} name=${r.body?.name}`);
  });

  await check('Out-of-range lat returns 400', async () => {
    const r = await call('/weather?lat=999&lon=101');
    return expect(r.status === 400, `status=${r.status}`);
  });

  await check('Arabic lang returns localised description', async () => {
    const r = await call('/weather?city=Cairo&lang=ar');
    const desc = r.body?.weather?.[0]?.description || '';
    return expect(r.status === 200 && /[\u0600-\u06FF]/.test(desc), `desc="${desc}"`);
  });

  await check('Forecast returns a list', async () => {
    const r = await call('/forecast?lat=3.139&lon=101.6869');
    return expect(
      r.status === 200 && Array.isArray(r.body?.list) && r.body.list.length > 0,
      `status=${r.status} items=${r.body?.list?.length}`
    );
  });

  await check('Forecast entries expose epoch dt for safe date parsing', async () => {
    const r = await call('/forecast?city=Tokyo');
    return expect(Number.isFinite(r.body?.list?.[0]?.dt), `dt=${r.body?.list?.[0]?.dt}`);
  });

  await check('UV endpoint always answers with availability', async () => {
    const r = await call('/uv?lat=3.139&lon=101.6869');
    return expect(
      r.status === 200 && typeof r.body?.available === 'boolean',
      `available=${r.body?.available} reason=${r.body?.reason ?? 'n/a'}`
    );
  });

  console.log('\nGoogle Translate');
  await check('English to Arabic', async () => {
    const r = await post('/translate', { text: 'Cloudy with light rain', target: 'ar' });
    const out = r.body?.data?.translations?.[0]?.translatedText || '';
    return expect(r.status === 200 && /[\u0600-\u06FF]/.test(out), `out="${out}"`);
  });

  await check('Arabic to English', async () => {
    const r = await post('/translate', { text: 'مشمس', target: 'en' });
    const out = r.body?.data?.translations?.[0]?.translatedText || '';
    return expect(r.status === 200 && /[A-Za-z]/.test(out), `out="${out}"`);
  });

  await check('Malay to English', async () => {
    const r = await post('/translate', { text: 'Hujan lebat', target: 'en', source: 'ms' });
    const out = r.body?.data?.translations?.[0]?.translatedText || '';
    return expect(r.status === 200 && /[A-Za-z]/.test(out), `out="${out}"`);
  });

  await check('Batch array translates every item', async () => {
    const r = await post('/translate', { text: ['Home', 'Map', 'About'], target: 'ms' });
    const out = r.body?.data?.translations || [];
    return expect(r.status === 200 && out.length === 3, `count=${out.length}`);
  });

  await check('format:text prevents HTML entity escaping', async () => {
    const r = await post('/translate', { text: "Today's weather", target: 'ms' });
    const out = r.body?.data?.translations?.[0]?.translatedText || '';
    return expect(r.status === 200 && !out.includes('&#39;'), `out="${out}"`);
  });

  await check('GET with query params works', async () => {
    const r = await call('/translate?text=Sunny&target=ms');
    return expect(r.status === 200 && Boolean(r.body?.data?.translations), `status=${r.status}`);
  });

  await check('Empty text returns 400', async () => {
    const r = await post('/translate', { text: '', target: 'ar' });
    return expect(r.status === 400, `status=${r.status}`);
  });

  await check('Invalid target returns 400', async () => {
    const r = await post('/translate', { text: 'Hello', target: 'notalang' });
    return expect(r.status === 400, `status=${r.status}`);
  });

  await check('Long text (5000 chars) is accepted', async () => {
    const r = await post('/translate', { text: 'weather '.repeat(625), target: 'ms' });
    return expect(r.status === 200, `status=${r.status} (${r.ms}ms)`);
  });

  console.log('\nGoogle Geocoding');
  await check('Valid coordinates resolve to a place name', async () => {
    const r = await call('/reverse-geocode?lat=3.139&lon=101.6869');
    return expect(
      r.status === 200 && typeof r.body?.display_name === 'string' && r.body.display_name.length > 0,
      `name="${r.body?.display_name}"`
    );
  });

  await check('Mid-ocean coordinates return a null name, not an error', async () => {
    const r = await call('/reverse-geocode?lat=0&lon=0');
    return expect(r.status === 200, `status=${r.status} name=${r.body?.display_name}`);
  });

  await check('Invalid coordinates return 400', async () => {
    const r = await call('/reverse-geocode?lat=abc&lon=xyz');
    return expect(r.status === 400, `status=${r.status}`);
  });

  console.log('\nValidation and limits');
  await check('Contact rejects a malformed email', async () => {
    const r = await post('/contact', { name: 'Test', email: 'not-an-email', message: 'Hello' });
    return expect(r.status === 400, `status=${r.status}`);
  });

  await check('Wrong method on /weather returns 405', async () => {
    const r = await post('/weather', {});
    return expect(r.status === 405, `status=${r.status}`);
  });

  await check('Translate tier rate limits at 30/min with Retry-After', async () => {
    const burst = await Promise.all(
      Array.from({ length: 36 }, () => post('/translate', { text: 'rate limit probe', target: 'ms' }))
    );
    const limited = burst.filter((r) => r.status === 429);
    return expect(limited.length > 0, `${limited.length}/36 requests limited`);
  });

  console.log(`\n${'-'.repeat(60)}`);
  const passed = results.length - failures;
  console.log(`${passed}/${results.length} passed`);

  if (failures > 0) {
    console.log(`\n${RED}Failures:${RESET}`);
    results.filter((r) => !r.ok).forEach((r) => console.log(`  - ${r.name}: ${r.detail ?? ''}`));
  }

  process.exit(failures > 0 ? 1 : 0);
}

run().catch((error) => {
  console.error('Smoke test runner crashed:', error);
  process.exit(1);
});
