import {
  fetchCurrentWeather,
  fetchForecast,
  fetchReverseGeocode,
  fetchUvIndex,
  fetchWeatherGif
} from './api.js';
import { translate, translateAll, getCurrentLanguage, onLanguageChange } from './translate.js';
import { showLoader, showToast, initModal } from './ui.js';
import {
  formatDate,
  formatWindSpeed,
  weatherIconUrl,
  createElementWithText
} from './utils.js';
// Bundled rather than fetched: restcountries.com retired its open API and now
// requires an account key. Regenerate with scripts/build-capitals.mjs.
import allCapitals from '../data/capitals.json';

const capitalsWeatherCache = {};
let searchTimeout = null;
let capitalModalControls = null;
let capitalsRequestToken = 0;
let capitalsAbortController = null;
let lastLocation = null;
let gifRequestToken = 0;

function setWeatherBackground(weather) {
  const classes = ['weather-clear', 'weather-clouds', 'weather-rain', 'weather-thunderstorm', 'weather-snow', 'weather-mist'];
  document.body.classList.remove(...classes);
  const map = {
    clear: 'weather-clear',
    clouds: 'weather-clouds',
    rain: 'weather-rain',
    drizzle: 'weather-rain',
    thunderstorm: 'weather-thunderstorm',
    snow: 'weather-snow',
    mist: 'weather-mist',
    fog: 'weather-mist',
    haze: 'weather-mist'
  };
  document.body.classList.add(map[(weather || 'clear').toLowerCase()] || 'weather-clear');
}

function setAnimatedWeatherIcon(weather) {
  const iconDiv = document.getElementById('animatedWeatherIcon');
  if (!iconDiv) return;

  const icons = {
    clear: '<svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="16" fill="#FFD600"><animate attributeName="r" values="16;18;16" dur="2s" repeatCount="indefinite"/></circle></svg>',
    clouds: '<svg width="64" height="64" viewBox="0 0 64 64"><ellipse cx="32" cy="40" rx="18" ry="10" fill="#B0BEC5"><animate attributeName="cx" values="32;36;32" dur="2s" repeatCount="indefinite"/></ellipse></svg>',
    rain: '<svg width="64" height="64" viewBox="0 0 64 64"><ellipse cx="32" cy="40" rx="18" ry="10" fill="#90CAF9"/><line x1="24" y1="50" x2="24" y2="60" stroke="#2196F3" stroke-width="3"><animate attributeName="y2" values="60;64;60" dur="1s" repeatCount="indefinite"/></line><line x1="40" y1="50" x2="40" y2="60" stroke="#2196F3" stroke-width="3"><animate attributeName="y2" values="60;64;60" dur="1s" repeatCount="indefinite"/></line></svg>',
    thunderstorm: '<svg width="64" height="64" viewBox="0 0 64 64"><ellipse cx="32" cy="40" rx="18" ry="10" fill="#B0BEC5"/><polygon points="30,50 36,50 32,60" fill="#FFD600"><animate attributeName="points" values="30,50 36,50 32,60;32,52 38,52 34,62;30,50 36,50 32,60" dur="1.5s" repeatCount="indefinite"/></polygon></svg>',
    snow: '<svg width="64" height="64" viewBox="0 0 64 64"><ellipse cx="32" cy="40" rx="18" ry="10" fill="#E3F2FD"/><circle cx="32" cy="54" r="4" fill="#90CAF9"><animate attributeName="cy" values="54;60;54" dur="2s" repeatCount="indefinite"/></circle></svg>',
    mist: '<svg width="64" height="64" viewBox="0 0 64 64"><ellipse cx="32" cy="40" rx="18" ry="10" fill="#B0BEC5"/><rect x="16" y="48" width="32" height="6" fill="#CFD8DC"><animate attributeName="y" values="48;52;48" dur="2s" repeatCount="indefinite"/></rect></svg>'
  };

  const key = (weather || '').toLowerCase();
  iconDiv.innerHTML = icons[key] || icons.clear;
}

/**
 * Shows a GIF matching the current condition. Deliberately never rejects and is
 * never awaited by the caller, so a slow or failing Giphy request cannot delay
 * or break the weather readout. The panel stays hidden unless an image loads.
 */
async function setWeatherGif(condition) {
  const figure = document.getElementById('weatherGif');
  const img = document.getElementById('weatherGifImg');
  if (!figure || !img) return;

  gifRequestToken += 1;
  const token = gifRequestToken;

  const hide = () => {
    figure.hidden = true;
    img.removeAttribute('src');
  };

  // An autoplaying GIF is exactly what this setting asks us not to render.
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    hide();
    return;
  }

  const url = await fetchWeatherGif(condition);

  // A newer location or language change already superseded this request.
  if (token !== gifRequestToken) return;

  if (!url) {
    hide();
    return;
  }

  // Only reveal once the image is decoded, so a broken URL never shows a
  // placeholder and the layout does not shift mid-load.
  img.onload = () => {
    if (token !== gifRequestToken) return;
    img.alt = `${condition} weather`;
    figure.hidden = false;
  };
  img.onerror = () => {
    if (token !== gifRequestToken) return;
    hide();
  };
  img.src = url;
}

/**
 * OpenWeather can omit `wind`, `visibility` or return an empty `weather` array
 * for some stations, so every read goes through a defaulted accessor.
 */
function readConditions(data) {
  const condition = Array.isArray(data?.weather) && data.weather[0] ? data.weather[0] : {};
  return {
    main: condition.main || 'Clear',
    description: condition.description || 'No description available',
    icon: condition.icon || '01d',
    temp: Number.isFinite(data?.main?.temp) ? data.main.temp : null,
    feelsLike: Number.isFinite(data?.main?.feels_like) ? data.main.feels_like : null,
    humidity: Number.isFinite(data?.main?.humidity) ? data.main.humidity : null,
    pressure: Number.isFinite(data?.main?.pressure) ? data.main.pressure : null,
    windSpeed: Number.isFinite(data?.wind?.speed) ? data.wind.speed : null,
    clouds: Number.isFinite(data?.clouds?.all) ? data.clouds.all : null,
    visibility: Number.isFinite(data?.visibility) ? data.visibility : null,
    dt: Number.isFinite(data?.dt) ? data.dt : Math.floor(Date.now() / 1000)
  };
}

function formatTemp(value) {
  return Number.isFinite(value) ? `${Math.round(value)}°C` : '--';
}

function checkSevereWeatherAlerts(data) {
  const card = document.getElementById('weatherAlertCard');
  const content = document.getElementById('weatherAlertContent');
  if (!card || !content) return;

  content.textContent = '';
  const conditions = readConditions(data);
  const alerts = [];

  if (conditions.main.toLowerCase() === 'thunderstorm') {
    alerts.push({ event: 'Thunderstorm Advisory', description: 'Thunderstorm conditions detected. Seek shelter if necessary.' });
  }
  if (conditions.temp !== null && conditions.temp >= 38) {
    alerts.push({ event: 'Extreme Heat Advisory', description: `Temperature is ${Math.round(conditions.temp)}°C. Stay hydrated and limit outdoor activity.` });
  }
  if (conditions.temp !== null && conditions.temp <= -5) {
    alerts.push({ event: 'Extreme Cold Advisory', description: `Temperature is ${Math.round(conditions.temp)}°C. Dress warmly and limit exposure.` });
  }
  if (conditions.windSpeed !== null && conditions.windSpeed >= 15) {
    alerts.push({ event: 'High Wind Advisory', description: `Wind speed is ${formatWindSpeed(conditions.windSpeed)}. Secure loose objects outdoors.` });
  }

  card.style.display = '';
  if (alerts.length > 0) {
    const alert = alerts[0];
    content.appendChild(createElementWithText('div', alert.event, 'fw-bold mb-1 translatable'));
    content.appendChild(createElementWithText('div', alert.description, 'mb-1 translatable'));
    content.appendChild(createElementWithText('div', `Detected at ${new Date(conditions.dt * 1000).toLocaleString()}`, 'small text-muted'));
  } else {
    content.appendChild(createElementWithText('span', 'No severe weather conditions detected for your area.', 'text-success translatable'));
  }

  translateAll(getCurrentLanguage(), content);
}

async function displayWeatherData(data) {
  const conditions = readConditions(data);
  const mainEl = document.getElementById('weatherMain');
  const displayDesc = conditions.description.charAt(0).toUpperCase() + conditions.description.slice(1);

  mainEl.textContent = displayDesc;
  mainEl.dataset.original = displayDesc;
  document.getElementById('weatherTemp').textContent = formatTemp(conditions.temp);
  document.getElementById('realFeel').textContent = Number.isFinite(conditions.feelsLike)
    ? `${Math.round(conditions.feelsLike)}°`
    : '--';
  document.getElementById('windSpeed').textContent = conditions.windSpeed !== null
    ? formatWindSpeed(conditions.windSpeed)
    : '--';
  document.getElementById('weatherDate').textContent = formatDate(conditions.dt);

  setWeatherBackground(conditions.main);
  setAnimatedWeatherIcon(conditions.main);
  // Intentionally not awaited: the GIF is decorative and must never hold up
  // the temperature, forecast, or alerts.
  setWeatherGif(conditions.main);
  checkSevereWeatherAlerts(data);

  // OpenWeather has no description for some languages, so translate as a backstop.
  const lang = getCurrentLanguage();
  if (lang !== 'en') {
    try {
      mainEl.textContent = await translate(displayDesc, lang);
    } catch {
      mainEl.textContent = displayDesc;
    }
  }
}

/**
 * UV comes from Open-Meteo, which needs no key, so the tile works out of the
 * box. It is hidden only if the service itself is unreachable.
 */
async function loadUvIndex(lat, lon) {
  const valueEl = document.getElementById('uvIndex');
  if (!valueEl) return;
  const row = valueEl.closest('.now-stat-row') || valueEl.parentElement;

  const uv = await fetchUvIndex(lat, lon);

  if (Number.isFinite(uv)) {
    valueEl.textContent = String(Math.round(uv));
    if (row) row.style.display = '';
  } else if (row) {
    row.style.display = 'none';
  }
}

export function getLocationName(lat, lon, callback) {
  fetchReverseGeocode(lat, lon)
    .then((name) => callback(name))
    .catch(() => callback(null));
}

export function setLocationName(name) {
  if (!name) return;
  const el = document.getElementById('locationName');
  if (!el) return;
  el.textContent = name;
  el.dataset.original = name;
  el.classList.add('translatable');

  const lang = getCurrentLanguage();
  if (lang !== 'en') {
    translate(name, lang)
      .then((translated) => { el.textContent = translated; })
      .catch(() => {});
  }
}

export function fetchWeatherAndForecast(lat, lon) {
  lastLocation = { lat, lon };
  showLoader(true);

  fetchCurrentWeather({ lat, lon, lang: getCurrentLanguage() })
    .then(async (data) => {
      await displayWeatherData(data);
      showLoader(false);
      loadForecast({ lat, lon });
      loadUvIndex(lat, lon);
    })
    .catch((err) => {
      showLoader(false);
      showToast(err.message || 'Failed to fetch weather data', 'error');
    });
}

export function fetchWeatherByCityAndForecast(city) {
  lastLocation = { city };
  showLoader(true);

  fetchCurrentWeather({ city, lang: getCurrentLanguage() })
    .then(async (data) => {
      await displayWeatherData(data);
      showLoader(false);
      loadForecast({ city });
      if (Number.isFinite(data?.coord?.lat) && Number.isFinite(data?.coord?.lon)) {
        loadUvIndex(data.coord.lat, data.coord.lon);
      }
    })
    .catch((err) => {
      showLoader(false);
      showToast(err.message || 'Failed to fetch weather data', 'error');
    });
}

function loadForecast(params) {
  fetchForecast({ ...params, lang: getCurrentLanguage() })
    .then(renderForecast)
    .catch((err) => showToast(err.message || 'Failed to load forecast', 'error'));
}

function forecastImage(iconCode, size) {
  const img = document.createElement('img');
  img.src = weatherIconUrl(iconCode);
  img.width = size;
  img.height = size;
  img.alt = '';
  img.loading = 'lazy';
  return img;
}

function renderForecast(data) {
  const list = Array.isArray(data?.list) ? data.list : [];
  const hourlyDiv = document.getElementById('hourlyForecast');
  hourlyDiv.textContent = '';
  hourlyDiv.className = 'hourly-scroll';

  if (!list.length) {
    hourlyDiv.appendChild(createElementWithText('div', 'Forecast unavailable.', 'text-muted'));
    return;
  }

  list.slice(0, 8).forEach((item) => {
    const conditions = readConditions(item);
    // `dt_txt` ("2026-08-02 12:00:00") is not a valid Date string in Safari,
    // so the epoch seconds are used instead.
    const when = new Date(item.dt * 1000);
    const card = createElementWithText('div', '', 'hourly-item');
    card.appendChild(createElementWithText('div', `${when.getHours()}:00`));
    card.appendChild(forecastImage(conditions.icon, 40));
    card.appendChild(createElementWithText('div', formatTemp(conditions.temp)));
    hourlyDiv.appendChild(card);
  });

  const iconsDiv = document.getElementById('forecastIcons');
  iconsDiv.textContent = '';
  iconsDiv.className = 'daily-forecast';

  const days = new Map();
  list.forEach((item) => {
    const when = new Date(item.dt * 1000);
    const dayKey = when.toDateString();
    if (when.getHours() >= 11 && when.getHours() <= 14 && !days.has(dayKey)) {
      days.set(dayKey, item);
    }
  });

  // Fall back to the first entry per day if no midday slot exists.
  if (days.size === 0) {
    list.forEach((item) => {
      const dayKey = new Date(item.dt * 1000).toDateString();
      if (!days.has(dayKey)) days.set(dayKey, item);
    });
  }

  Array.from(days.values()).slice(0, 5).forEach((item) => {
    const conditions = readConditions(item);
    const when = new Date(item.dt * 1000);
    const dayRow = createElementWithText('div', '', 'daily-item');
    dayRow.appendChild(createElementWithText('span', when.toLocaleDateString(undefined, { weekday: 'short' }), 'day-name'));
    dayRow.appendChild(forecastImage(conditions.icon, 32));
    dayRow.appendChild(createElementWithText('span', conditions.main, 'day-desc translatable'));
    dayRow.appendChild(createElementWithText('span', formatTemp(conditions.temp), 'day-temp'));
    iconsDiv.appendChild(dayRow);
  });

  const rainEl = document.getElementById('rainChance');
  if (rainEl) {
    rainEl.textContent = Number.isFinite(list[0]?.pop) ? `${Math.round(list[0].pop * 100)}%` : '--';
  }

  translateAll(getCurrentLanguage(), iconsDiv);
}

export function loadHomeWeather() {
  const fallback = () => {
    setLocationName('Terengganu');
    fetchWeatherByCityAndForecast('Terengganu');
    fetchAllCapitalsWeather();
  };

  if (!navigator.geolocation) {
    fallback();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      getLocationName(pos.coords.latitude, pos.coords.longitude, setLocationName);
      fetchWeatherAndForecast(pos.coords.latitude, pos.coords.longitude);
      fetchAllCapitalsWeather();
    },
    fallback,
    { timeout: 10000, maximumAge: 300000 }
  );
}

export function fetchAllCapitalsWeather(page = 1, perPage = 6, searchTerm = '') {
  const container = document.getElementById('nearbyPlaces');
  container.textContent = '';
  document.getElementById('capitalsCount').textContent = '';
  renderCapitals(page, perPage, searchTerm);
}

function renderCapitals(page, perPage, searchTerm) {
  const container = document.getElementById('nearbyPlaces');
  container.textContent = '';

  // A token plus an AbortController stops responses from a previous search from
  // writing into detached nodes once the list has been re-rendered.
  capitalsRequestToken += 1;
  const token = capitalsRequestToken;
  capitalsAbortController?.abort();
  capitalsAbortController = new AbortController();
  const { signal } = capitalsAbortController;

  let filtered = allCapitals;
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = allCapitals.filter(
      (c) => c.capital.toLowerCase().includes(term) || c.country.toLowerCase().includes(term)
    );
  }

  const totalCapitals = filtered.length;
  const start = (page - 1) * perPage;
  const sliced = filtered.slice(start, start + perPage);

  if (!filtered.length) {
    container.appendChild(createElementWithText('div', 'No results found.', 'w-100 text-center py-3 text-muted'));
    document.getElementById('capitalsCount').textContent = '';
    return;
  }

  const scrollWrapper = createElementWithText('div', '', 'horizontal-scroll');
  const weatherSlots = new Map();

  sliced.forEach((entry) => {
    const { lat, lon, capital, country: countryName } = entry;

    const card = document.createElement('div');
    card.className = 'capital-card';
    card.dataset.capital = capital;
    card.dataset.country = countryName;
    card.dataset.lat = lat;
    card.dataset.lon = lon;

    card.appendChild(createElementWithText('div', `${capital}, ${countryName}`, 'capital-name'));
    const weatherDiv = createElementWithText('div', 'Loading...', 'capital-weather');
    card.appendChild(weatherDiv);
    weatherSlots.set(`${capital},${countryName}`, weatherDiv);

    const mapBtn = document.createElement('a');
    mapBtn.className = 'map-link';
    mapBtn.href = `/map.html?lat=${lat}&lon=${lon}&name=${encodeURIComponent(`${capital}, ${countryName}`)}`;
    mapBtn.innerHTML = '<i class="bi bi-geo-alt"></i> View on Map';
    card.appendChild(mapBtn);

    card.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      showCapitalDetails(capital, countryName, lat, lon);
    });

    scrollWrapper.appendChild(card);
  });

  container.appendChild(scrollWrapper);
  document.getElementById('capitalsCount').textContent = `Showing ${start + sliced.length} of ${totalCapitals} capitals`;

  const renderSlot = (weatherDiv, weather) => {
    const conditions = readConditions(weather);
    weatherDiv.textContent = `${formatTemp(conditions.temp)}, ${conditions.main} `;
    weatherDiv.appendChild(forecastImage(conditions.icon, 32));
  };

  sliced.forEach((entry) => {
    const { lat, lon } = entry;
    const cacheKey = `${entry.capital},${entry.country}`;
    const weatherDiv = weatherSlots.get(cacheKey);
    if (!weatherDiv) return;

    if (capitalsWeatherCache[cacheKey]) {
      renderSlot(weatherDiv, capitalsWeatherCache[cacheKey]);
      return;
    }

    fetchCurrentWeather({ lat, lon, lang: getCurrentLanguage(), signal })
      .then((weather) => {
        if (token !== capitalsRequestToken) return;
        capitalsWeatherCache[cacheKey] = weather;
        renderSlot(weatherDiv, weather);
      })
      .catch((err) => {
        if (token !== capitalsRequestToken || err.name === 'AbortError') return;
        weatherDiv.textContent = '';
        weatherDiv.appendChild(createElementWithText('span', 'Failed to load', 'text-danger'));
      });
  });

  if (totalCapitals > perPage) {
    const paginationWrapper = createElementWithText('div', '', 'capitals-pagination');
    if (page > 1) {
      const prevBtn = createElementWithText('button', 'Previous', 'translatable');
      prevBtn.onclick = () => fetchAllCapitalsWeather(page - 1, perPage, document.getElementById('capitalSearch').value);
      paginationWrapper.appendChild(prevBtn);
    }
    if (start + perPage < totalCapitals) {
      const nextBtn = createElementWithText('button', 'Next', 'translatable');
      nextBtn.onclick = () => fetchAllCapitalsWeather(page + 1, perPage, document.getElementById('capitalSearch').value);
      paginationWrapper.appendChild(nextBtn);
    }
    container.appendChild(paginationWrapper);
  }

  translateAll(getCurrentLanguage(), container);
}

function showCapitalDetails(capital, country, lat, lon) {
  fetchCurrentWeather({ lat, lon, lang: getCurrentLanguage() })
    .then((weather) => {
      const conditions = readConditions(weather);
      const modalBody = document.getElementById('capitalModalBody');
      modalBody.textContent = '';
      modalBody.appendChild(createElementWithText('h5', `${capital}, ${country}`));

      const imgDiv = document.createElement('div');
      imgDiv.appendChild(forecastImage(conditions.icon, 48));
      modalBody.appendChild(imgDiv);

      modalBody.appendChild(createElementWithText('div', `${formatTemp(conditions.temp)} (${conditions.main})`));
      modalBody.appendChild(createElementWithText('div', `Humidity: ${conditions.humidity ?? '--'}%`));
      modalBody.appendChild(createElementWithText('div', `Pressure: ${conditions.pressure ?? '--'} hPa`));
      modalBody.appendChild(createElementWithText('div', `Wind: ${conditions.windSpeed !== null ? formatWindSpeed(conditions.windSpeed) : '--'}`));
      modalBody.appendChild(createElementWithText('div', `Clouds: ${conditions.clouds ?? '--'}%`));
      modalBody.appendChild(createElementWithText('div', `Visibility: ${conditions.visibility !== null ? `${conditions.visibility / 1000} km` : '--'}`));

      capitalModalControls?.open();
    })
    .catch((err) => showToast(err.message || 'Failed to load capital weather details', 'error'));
}

export function initCapitalsSearch() {
  capitalModalControls = initModal('capitalModal', 'capitalModalClose');
  const searchInput = document.getElementById('capitalSearch');
  if (!searchInput) return;

  searchInput.addEventListener('input', debounce(() => {
    fetchAllCapitalsWeather(1, 6, searchInput.value);
  }, 400));
}

/**
 * Weather descriptions are localised upstream, so switching language refetches
 * rather than translating stale English text.
 */
export function initWeatherLanguageSync() {
  onLanguageChange(() => {
    if (!lastLocation) return;
    Object.keys(capitalsWeatherCache).forEach((key) => delete capitalsWeatherCache[key]);
    if (lastLocation.city) {
      fetchWeatherByCityAndForecast(lastLocation.city);
    } else {
      fetchWeatherAndForecast(lastLocation.lat, lastLocation.lon);
    }
  });
}

function debounce(fn, delay) {
  return (...args) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => fn(...args), delay);
  };
}
