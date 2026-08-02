# WeatherHub – Smart Weather Application

## Overview
A modern weather web app with real-time forecasts, interactive maps, user profiles, and world capitals weather.

## Tech Stack
- **Frontend:** Vite, vanilla JavaScript (ES modules), CSS
- **Backend:** Firebase Cloud Functions (API proxy)
- **Auth & Database:** Firebase Auth + Realtime Database
- **Hosting:** Firebase Hosting

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required for full functionality:
- `VITE_FIREBASE_*` — Firebase project credentials
- `VITE_GOOGLE_MAPS_API_KEY` — Google Maps (map page)
- `VITE_WEATHER_API_BASE_URL=/api` — leave as `/api` for production

**Legacy:** If you still use `js/config.js`, the build script auto-generates `.env.production` from it.

### 3. Run locally
```bash
# Terminal 1 — Vite dev server (proxies /api to Firebase emulator)
npm run dev

# Terminal 2 — Firebase emulators (functions + hosting rewrites)
firebase emulators:start
```

Open http://localhost:5173

### 4. Production build
```bash
npm run build
firebase deploy --only hosting,functions
```

Build output goes to `dist/`.

## Project Structure
```
src/
├── js/
│   ├── api.js          # Centralized API client
│   ├── auth.js         # Firebase auth helpers
│   ├── config.js       # Env-based configuration
│   ├── weather.js      # Weather dashboard logic
│   ├── map.js          # Google Maps integration
│   ├── nav.js          # Auth-aware navigation
│   ├── translate.js    # i18n via API proxy
│   ├── ui.js           # Loader, toast, theme, tabs
│   └── components/
│       └── nav.js      # Shared nav component
├── pages/              # Page entry points (one per HTML file)
└── styles/
    └── main.css
```

## API Endpoints (Cloud Functions)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Service health check |
| `/api/config/public` | GET | Public client config (Google Maps key) |
| `/api/weather` | GET | Current weather (`?lat=&lon=` or `?city=`) |
| `/api/forecast` | GET | Forecast (`?lat=&lon=` or `?city=`) |
| `/api/reverse-geocode` | GET | Reverse geocode (`?lat=&lon=`) |
| `/api/translate` | POST | Translate text (`{ text, target }`) |
| `/api/contact` | POST | Submit contact form (`{ name, email, message }`) |

All routes are rate-limited per IP. Contact messages are stored in Firebase Realtime Database (`contactMessages/`) via Admin SDK — not writable from the browser.

Set function secrets before deploy:
```bash
firebase functions:secrets:set OPENWEATHER_API_KEY
firebase functions:secrets:set GOOGLE_TRANSLATE_API_KEY
firebase functions:secrets:set GOOGLE_MAPS_API_KEY
```

## CI/CD
GitHub Actions runs `npm run build` then deploys `dist/` to Firebase Hosting.

Set repository secret `WEATHER_HUB_CONFIG_JS` with legacy config contents, or configure env vars in the workflow.

## Author
Abbas Usman Adamu
