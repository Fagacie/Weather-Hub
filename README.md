# WeatherHub – Smart Weather Application

## Overview
A web application that provides real-time weather updates using external APIs.

## Problem Statement
Users need quick and accurate access to weather information for planning daily activities.

## Technologies Used
- JavaScript
- Node.js
- Weather API

## Features
- Real-time weather data retrieval
- API integration
- User-friendly interface

## Local Configuration
Browser configuration is loaded from `js/config.js`, which is ignored by git so deploy-specific values are not committed.

1. Copy `js/config.example.js` to `js/config.js`.
2. Fill in your Google Maps, Google Translate, and Firebase project values.
3. Open `index.html` locally or deploy with your own `js/config.js` supplied in the hosting environment.

For GitHub Actions deploys, add a repository secret named `WEATHER_HUB_CONFIG_JS` containing the full contents of `js/config.js`. The deploy workflow writes it into place before Firebase Hosting uploads the site.

## Firebase Functions
OpenWeather calls are proxied through Firebase Functions so the OpenWeather key is not shipped to the browser.

Set the function secret before deploying:

```bash
firebase functions:secrets:set OPENWEATHER_API_KEY
```

The frontend calls:

- `GET /api/weather?lat=&lon=`
- `GET /api/weather?city=`
- `GET /api/forecast?lat=&lon=`
- `GET /api/forecast?city=`

## System Workflow
User inputs location → API fetches weather data → system processes data → UI displays results.

## Results / Output
Displays real-time weather conditions for selected locations.

## Demo / Live Link
https://weather-hub-9c3f8.web.app/


## Author
Abbas Usman Adamu
