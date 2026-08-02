# Weather Hub

A weather dashboard with an interactive map, multi-language support, and Firebase
authentication. It runs entirely on free services — **no credit card is required
anywhere**, including for Firebase.

## Architecture

The app is a static site. There is no backend: the browser calls each provider
directly, which is what allows it to run on the Firebase **Spark (free)** plan,
where Cloud Functions are unavailable.

| Feature | Provider | Key needed? | Card needed? |
| --- | --- | --- | --- |
| Current weather, 5-day forecast, reverse geocoding | OpenWeather free tier | Yes | No |
| UV index | Open-Meteo | No | No |
| Map tiles | OpenStreetMap via Leaflet | No | No |
| Place search | Open-Meteo Geocoding | No | No |
| Translation | MyMemory | No | No |
| Country and capital data | restcountries.com | No | No |
| Auth, profiles, contact messages | Firebase (Spark plan) | Yes | No |

### Why no backend

Google Maps and Google Cloud Translation both require a billing account with a
payment method on file, even to stay inside their free tiers. Firebase Cloud
Functions require the Blaze plan for the same reason. Swapping those three for
Leaflet, Open-Meteo, and MyMemory removes the card requirement entirely.

The trade-off is that the OpenWeather key ships in the client bundle, since
there is no server to hide it behind. This is acceptable specifically because a
free-tier OpenWeather key **cannot generate charges** — the worst case is that
someone consumes your rate limit, and you rotate the key. Never put a key that
can incur costs in this project.

The `functions/` directory contains an earlier Cloud Functions backend. It is no
longer referenced by `firebase.json` and is not deployed. It is kept only as a
starting point should you later upgrade to Blaze and want server-side key
handling.

## Prerequisites

- Node.js 20 or newer
- A Firebase project with Email/Password auth and Realtime Database enabled
- A free OpenWeather API key

## Getting an OpenWeather key

1. Sign up at <https://home.openweathermap.org/users/sign_up> using only an email.
2. Confirm the verification email.
3. Copy the key from <https://home.openweathermap.org/api_keys>.

New keys take **10 minutes to 2 hours** to activate. Until then every request
returns HTTP 401. This is normal, and the app reports it explicitly rather than
showing a generic failure.

## Quick start

```bash
npm install
cp .env.example .env.local   # then set VITE_OPENWEATHER_API_KEY
npm run dev
```

Firebase settings default to `src/js/firebase-config.js` and can be overridden
with the `VITE_FIREBASE_*` variables in `.env.local`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run test:api` | Check every external provider end to end |

`npm run test:api` calls the real provider endpoints and reports each one
individually, which makes it the fastest way to tell an inactive API key apart
from a genuine outage.

## Deploying

```bash
npm run build
firebase deploy --only hosting,database
```

Only hosting and database rules are deployed; both are available on the Spark
plan.

## Language support

English, Arabic, Malay, Tamil, Hindi, and Simplified Chinese. Arabic switches
the document to right-to-left.

Weather descriptions are requested from OpenWeather in the target language where
it supports one. Malay and Tamil are not supported by OpenWeather, so those fall
back to MyMemory translation.

MyMemory's free tier is metered in words per day and accepts one string per
request, so translations are cached in `sessionStorage` and fetched with bounded
concurrency. Repeated language switches within a session cost no further quota.

## Rate limits to be aware of

| Provider | Limit |
| --- | --- |
| OpenWeather free | 60 calls/minute, 1,000,000 calls/month |
| Open-Meteo | ~10,000 calls/day, non-commercial use |
| MyMemory | 5,000 words/day per IP anonymously |
| OpenStreetMap tiles | Fair-use policy; heavy traffic needs your own tile host |

## Security notes

- Realtime Database rules restrict each user to their own `users/$uid` record.
- `contactMessages` is write-only and create-only: the browser can submit a
  message but cannot read, edit, or delete any. Every field is validated
  server-side by the rules, including email format and length caps.
- `.env.local` is gitignored. Remember that anything prefixed `VITE_` is embedded
  into the public bundle at build time.
