# WeatherHub – Smart Weather Application

## Overview
A modern weather web app with real-time forecasts, an interactive map, multi-language support, user profiles, and world capitals weather.

## Tech Stack
- **Frontend:** Vite, vanilla JavaScript (ES modules), CSS
- **Backend:** Firebase Cloud Functions (API proxy for all third-party keys)
- **Auth & Database:** Firebase Auth + Realtime Database
- **Hosting:** Firebase Hosting

## Architecture

Every third-party API key lives server-side as a Firebase Functions secret. The browser
only ever talks to `/api/*`, which Firebase Hosting rewrites to the `api` function. The
one exception is the Maps JavaScript API, which must run in the browser, so its
referrer-restricted key is served at runtime by `GET /api/config/public`.

```
Browser ──> Firebase Hosting ──/api/**──> Cloud Function "api" ──> OpenWeather
                                                                └─> Google Translate
                                                                └─> Google Geocoding
Browser ──> Maps JavaScript API (browser key from /api/config/public)
Browser ──> Firebase Auth + Realtime Database (client SDK)
```

## External APIs

| API | Where it runs | Credential |
|-----|---------------|------------|
| OpenWeather 2.5 (weather, forecast) | Cloud Function | `OPENWEATHER_API_KEY` |
| OpenWeather One Call 3.0 (UV index) | Cloud Function | `OPENWEATHER_API_KEY` |
| Google Cloud Translation v2 | Cloud Function | `GOOGLE_TRANSLATE_API_KEY` |
| Google Geocoding | Cloud Function | `GOOGLE_MAPS_SERVER_KEY` |
| Google Maps JavaScript + Places | Browser | `GOOGLE_MAPS_API_KEY` |
| restcountries.com (capital list) | Browser | none, public |

UV index requires a One Call 3.0 subscription. Without one the endpoint returns
`{ available: false }` and the UI hides the tile rather than showing a dead value.

## Prerequisites

1. The Firebase project must be on the **Blaze** plan. Cloud Functions and Secret
   Manager are unavailable on Spark.
2. Enable these APIs in Google Cloud Console: **Maps JavaScript API**,
   **Places API (New)**, **Geocoding API**, **Cloud Translation API**.
3. Create two Google Maps keys. One key cannot be correctly restricted for both uses:
   - **Browser key** — restrict by HTTP referrer to your hosting domain and `localhost:5173`.
   - **Server key** — restrict to the Geocoding API only.

## Quick Start

```bash
npm install
cp .env.example .env.local   # optional; Firebase defaults are committed
```

Set the server-side secrets (never commit these):

```bash
firebase functions:secrets:set OPENWEATHER_API_KEY
firebase functions:secrets:set GOOGLE_TRANSLATE_API_KEY
firebase functions:secrets:set GOOGLE_MAPS_API_KEY      # browser key
firebase functions:secrets:set GOOGLE_MAPS_SERVER_KEY   # geocoding key
```

### Run locally

```bash
# Terminal 1 — Firebase emulators (hosting on :5000 rewrites /api to the function)
firebase emulators:start

# Terminal 2 — Vite dev server, proxies /api to :5000
npm run dev
```

Open http://localhost:5173

### Production build and deploy

```bash
npm run build
firebase deploy --only hosting,functions,database
```

### Verify the deployment

```bash
npm run test:api                                  # against production
node scripts/api-smoke-test.mjs http://localhost:5000   # against the emulator
```

The suite covers valid and invalid cities, out-of-range coordinates, language
round-trips, batch translation, HTML-entity handling, geocoding edge cases, method
rejection, and rate limiting.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Status plus which keys are configured (booleans only) |
| `/api/config/public` | GET | Browser Maps key and Map ID |
| `/api/weather` | GET | Current weather (`?lat=&lon=` or `?city=`, optional `&lang=`) |
| `/api/forecast` | GET | 5-day/3-hour forecast (same parameters) |
| `/api/uv` | GET | UV index via One Call 3.0 (`?lat=&lon=`) |
| `/api/reverse-geocode` | GET | Google reverse geocoding (`?lat=&lon=`) |
| `/api/translate` | GET/POST | Translate a string or array (`{ text, target, source? }`) |
| `/api/contact` | POST | Store a contact message (`{ name, email, message }`) |

Every upstream call has a 6–8 second timeout, one retry with jittered backoff on
transient failures, and structured JSON logging to Cloud Logging.

Rate limits per IP per minute: 120 default, 30 translate, 5 contact. The limiter is
in-memory per function instance, so limits are approximate across concurrent
instances; `maxInstances` is capped at 10 to bound this.

## Languages

English, Arabic, Malay, Chinese, Tamil, and Hindi. The choice persists in
`localStorage`, Arabic switches the document to RTL, and translations are cached in
`sessionStorage` so only cache misses reach the API. OpenWeather localises weather
descriptions natively for Arabic, Chinese, and Hindi; Malay and Tamil fall back to
English upstream and are then translated by Google.

## Project Structure

```
src/
├── js/
│   ├── api.js          # API client: timeouts, abort signals, error normalisation
│   ├── auth.js         # Firebase auth helpers
│   ├── config.js       # Env-based configuration
│   ├── firebase.js     # Firebase SDK initialisation
│   ├── i18n.js         # Language list, persistence, text direction
│   ├── translate.js    # Translation with sessionStorage cache
│   ├── weather.js      # Weather dashboard
│   ├── map.js          # Google Maps (AdvancedMarker, PlaceAutocomplete)
│   ├── nav.js          # Auth-aware navigation
│   ├── ui.js           # Loader, toast, theme, tabs
│   └── components/nav.js
├── pages/              # One entry point per HTML file
└── styles/main.css

functions/
├── handlers/           # weather, translate, geocode, contact, config
├── lib/                # httpClient, rateLimit, validators, response, firebaseAdmin
└── index.js            # Router, CORS allowlist, secret wiring
```

## CI/CD

GitHub Actions builds and deploys on push to `master`. Hosting and database rules
deploy first and independently of Cloud Functions, so a functions failure cannot take
the site down. Requires the repository secret
`FIREBASE_SERVICE_ACCOUNT_WEATHER_HUB_5CCBB`.

## Author
Abbas Usman Adamu
