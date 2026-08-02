#!/usr/bin/env node
/**
 * Regenerates src/data/capitals.json.
 *
 * Capitals and their coordinates are effectively static, so this data is
 * bundled rather than fetched at runtime. The app previously called
 * restcountries.com, which deprecated its unauthenticated API and now requires
 * an account and a bearer token — a key we would have to ship in the browser.
 *
 * Source is mledoze/countries, the dataset restcountries itself was built on.
 * Run manually when the data needs refreshing:  node scripts/build-capitals.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = 'https://cdn.jsdelivr.net/gh/mledoze/countries@master/dist/countries-unescaped.json';
const OUT = resolve(ROOT, 'src/data/capitals.json');

const response = await fetch(SOURCE, { signal: AbortSignal.timeout(60000) });
if (!response.ok) {
  console.error(`Failed to download source data: HTTP ${response.status}`);
  process.exit(1);
}

const countries = await response.json();

const capitals = countries
  .map((country) => {
    const capital = country.capital?.[0];
    // capitalInfo pinpoints the capital itself; latlng is the country centroid.
    const coords = country.capitalInfo?.latlng ?? country.latlng;
    if (!capital || !Array.isArray(coords) || coords.length !== 2) return null;

    const [lat, lon] = coords.map(Number);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    return {
      capital,
      country: country.name?.common,
      lat: Number(lat.toFixed(4)),
      lon: Number(lon.toFixed(4))
    };
  })
  .filter((entry) => entry && entry.country)
  .sort((a, b) => a.country.localeCompare(b.country));

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(capitals, null, 0)}\n`, 'utf8');

console.log(`Wrote ${capitals.length} capitals to src/data/capitals.json`);
