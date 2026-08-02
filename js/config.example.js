# Legacy config file — prefer .env.local for Vite development.
# Copy .env.example to .env.local and fill in values instead.
#
# This file is still supported for CI: set WEATHER_HUB_CONFIG_JS secret,
# and the build script converts it to .env.production automatically.

window.WEATHER_HUB_CONFIG = {
  WEATHER_API_BASE_URL: "/api",
  GOOGLE_MAPS_API_KEY: "",
  GOOGLE_TRANSLATE_API_KEY: "",
  FIREBASE_CONFIG: {
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
  }
};
