import { fetchWeatherApi } from './api.js';
import { translateText } from './translate.js';
import { showLoader, showToast, initModal } from './ui.js';
import {
  formatDate,
  formatWindSpeed,
  escapeHTML,
  createElementWithText
} from './utils.js';

let allCapitals = [];
const capitalsWeatherCache = {};
let searchTimeout = null;
let capitalModalControls = null;

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

function checkSevereWeatherAlerts(data) {
  const card = document.getElementById('weatherAlertCard');
  const content = document.getElementById('weatherAlertContent');
  if (!card || !content) return;

  content.textContent = '';
  const alerts = [];
  const temp = data.main.temp;
  const wind = data.wind.speed;
  const main = data.weather[0].main.toLowerCase();
  const now = data.dt;

  if (main === 'thunderstorm') {
    alerts.push({ event: 'Thunderstorm Advisory', description: 'Thunderstorm conditions detected. Seek shelter if necessary.', start: now });
  }
  if (temp >= 38) {
    alerts.push({ event: 'Extreme Heat Advisory', description: `Temperature is ${Math.round(temp)}°C. Stay hydrated and limit outdoor activity.`, start: now });
  }
  if (temp <= -5) {
    alerts.push({ event: 'Extreme Cold Advisory', description: `Temperature is ${Math.round(temp)}°C. Dress warmly and limit exposure.`, start: now });
  }
  if (wind >= 15) {
    alerts.push({ event: 'High Wind Advisory', description: `Wind speed is ${formatWindSpeed(wind)}. Secure loose objects outdoors.`, start: now });
  }

  card.style.display = '';
  if (alerts.length > 0) {
    const alert = alerts[0];
    content.appendChild(createElementWithText('div', alert.event, 'fw-bold mb-1'));
    content.appendChild(createElementWithText('div', alert.description, 'mb-1'));
    content.appendChild(createElementWithText('div', `Detected at ${new Date(alert.start * 1000).toLocaleString()}`, 'small text-muted'));
  } else {
    content.appendChild(createElementWithText('span', 'No severe weather conditions detected for your area.', 'text-success'));
  }
}

function displayWeatherData(data) {
  const desc = data.weather[0].description;
  const main = data.weather[0].main;
  const mainEl = document.getElementById('weatherMain');
  const displayDesc = desc.charAt(0).toUpperCase() + desc.slice(1);

  mainEl.textContent = displayDesc;
  mainEl.dataset.original = displayDesc;
  document.getElementById('weatherTemp').textContent = `${Math.round(data.main.temp)}°C`;
  document.getElementById('realFeel').textContent = `${Math.round(data.main.feels_like)}°`;
  document.getElementById('windSpeed').textContent = formatWindSpeed(data.wind.speed);
  document.getElementById('weatherDate').textContent = formatDate(data.dt);

  setWeatherBackground(main);
  setAnimatedWeatherIcon(main);
  checkSevereWeatherAlerts(data);

  const langSelect = document.getElementById('languageSelect');
  if (langSelect) {
    translateText(displayDesc, langSelect.value, (translated) => {
      mainEl.textContent = translated;
    });
  }
}

export function getLocationName(lat, lon, callback) {
  fetchWeatherApi('/reverse-geocode', { lat, lon })
    .then((data) => callback(data?.display_name || null))
    .catch(() => callback(null));
}

export function setLocationName(name) {
  if (!name) return;
  const el = document.getElementById('locationName');
  if (!el) return;
  el.textContent = name;
  el.dataset.original = name;
  const langSelect = document.getElementById('languageSelect');
  if (langSelect) {
    translateText(name, langSelect.value, (translated) => {
      el.textContent = translated;
    });
  }
}

export function fetchWeatherAndForecast(lat, lon) {
  showLoader(true);
  fetchWeatherApi('/weather', { lat, lon })
    .then((data) => {
      displayWeatherData(data);
      showLoader(false);
      fetchForecast(lat, lon);
    })
    .catch((err) => {
      showLoader(false);
      showToast(err.message || 'Failed to fetch weather data', 'error');
    });
}

export function fetchWeatherByCityAndForecast(city) {
  showLoader(true);
  fetchWeatherApi('/weather', { city })
    .then((data) => {
      displayWeatherData(data);
      showLoader(false);
      fetchForecastByCity(city);
    })
    .catch((err) => {
      showLoader(false);
      showToast(err.message || 'Failed to fetch weather data', 'error');
    });
}

function fetchForecast(lat, lon) {
  fetchWeatherApi('/forecast', { lat, lon })
    .then(renderForecast)
    .catch(() => showToast('Failed to load forecast', 'error'));
}

function fetchForecastByCity(city) {
  fetchWeatherApi('/forecast', { city })
    .then(renderForecast)
    .catch(() => showToast('Failed to load forecast', 'error'));
}

function renderForecast(data) {
  const hourlyDiv = document.getElementById('hourlyForecast');
  hourlyDiv.textContent = '';
  hourlyDiv.className = 'hourly-scroll';

  data.list.slice(0, 8).forEach((item) => {
    const card = createElementWithText('div', '', 'hourly-item');
    card.appendChild(createElementWithText('div', `${new Date(item.dt_txt).getHours()}:00`));
    const imgEl = document.createElement('img');
    imgEl.src = `https://openweathermap.org/img/wn/${escapeHTML(item.weather[0].icon)}.png`;
    imgEl.width = 40;
    card.appendChild(imgEl);
    card.appendChild(createElementWithText('div', `${Math.round(item.main.temp)}°C`));
    hourlyDiv.appendChild(card);
  });

  const iconsDiv = document.getElementById('forecastIcons');
  iconsDiv.textContent = '';
  iconsDiv.className = 'daily-forecast';
  const days = {};

  data.list.forEach((item) => {
    const date = item.dt_txt.split(' ')[0];
    const hour = item.dt_txt.split(' ')[1];
    if (hour === '12:00:00' && !days[date]) days[date] = item;
  });

  Object.values(days).slice(0, 5).forEach((item) => {
    const dayRow = createElementWithText('div', '', 'daily-item');
    dayRow.appendChild(createElementWithText('span', new Date(item.dt_txt).toLocaleDateString(undefined, { weekday: 'short' }), 'day-name'));
    const imgEl = document.createElement('img');
    imgEl.src = `https://openweathermap.org/img/wn/${escapeHTML(item.weather[0].icon)}.png`;
    imgEl.width = 32;
    imgEl.height = 32;
    dayRow.appendChild(imgEl);
    dayRow.appendChild(createElementWithText('span', item.weather[0].main, 'day-desc'));
    dayRow.appendChild(createElementWithText('span', `${Math.round(item.main.temp)}°C`, 'day-temp'));
    iconsDiv.appendChild(dayRow);
  });

  if (data.list?.length) {
    document.getElementById('rainChance').textContent =
      data.list[0].pop !== undefined ? `${Math.round(data.list[0].pop * 100)}%` : '--';
  }
  document.getElementById('uvIndex').textContent = '--';
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
    fallback
  );
}

export function fetchAllCapitalsWeather(page = 1, perPage = 6, searchTerm = '') {
  const container = document.getElementById('nearbyPlaces');
  container.textContent = '';
  container.appendChild(createElementWithText('div', 'Loading world capitals weather...', 'w-100 text-center py-3'));
  document.getElementById('capitalsCount').textContent = '';

  if (allCapitals.length === 0) {
    fetch('https://restcountries.com/v3.1/all?fields=capital,latlng,name')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then((countries) => {
        allCapitals = countries.filter(
          (c) => c.capital?.length && c.latlng?.length === 2
        );
        renderCapitals(page, perPage, searchTerm);
      })
      .catch(() => {
        container.textContent = '';
        container.appendChild(createElementWithText('div', 'Failed to load capitals data.', 'w-100 text-center py-3 text-danger'));
      });
  } else {
    renderCapitals(page, perPage, searchTerm);
  }
}

function renderCapitals(page, perPage, searchTerm) {
  const container = document.getElementById('nearbyPlaces');
  container.textContent = '';

  let filtered = allCapitals;
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = allCapitals.filter(
      (c) => c.capital[0].toLowerCase().includes(term) || c.name.common.toLowerCase().includes(term)
    );
  }

  const totalCapitals = filtered.length;
  const start = (page - 1) * perPage;
  const end = start + perPage;

  if (!filtered.length) {
    container.appendChild(createElementWithText('div', 'No results found.', 'w-100 text-center py-3 text-muted'));
    document.getElementById('capitalsCount').textContent = '';
    return;
  }

  const scrollWrapper = createElementWithText('div', '', 'horizontal-scroll');
  const sliced = filtered.slice(start, end);

  sliced.forEach((country) => {
    const [lat, lon] = country.latlng;
    const capital = country.capital[0];
    const countryName = country.name.common;
    const cacheKey = `${capital},${countryName}`;

    const card = document.createElement('div');
    card.className = 'capital-card';
    card.dataset.capital = capital;
    card.dataset.country = countryName;
    card.dataset.lat = lat;
    card.dataset.lon = lon;

    card.appendChild(createElementWithText('div', `${capital}, ${countryName}`, 'capital-name'));
    const weatherDiv = createElementWithText('div', 'Loading...', 'capital-weather');
    weatherDiv.id = `capitalWeather-${cacheKey.replace(/\s/g, '_')}`;

    const mapBtn = document.createElement('a');
    mapBtn.className = 'map-link';
    mapBtn.href = `/map.html?lat=${lat}&lon=${lon}&name=${encodeURIComponent(`${capital}, ${countryName}`)}`;
    mapBtn.innerHTML = '<i class="bi bi-geo-alt"></i> View on Map';

    card.appendChild(weatherDiv);
    card.appendChild(mapBtn);
    scrollWrapper.appendChild(card);
  });

  container.appendChild(scrollWrapper);
  document.getElementById('capitalsCount').textContent = `Showing ${start + sliced.length} of ${totalCapitals} capitals`;

  sliced.forEach((country) => {
    const [lat, lon] = country.latlng;
    const capital = country.capital[0];
    const countryName = country.name.common;
    const cacheKey = `${capital},${countryName}`;
    const weatherDiv = document.getElementById(`capitalWeather-${cacheKey.replace(/\s/g, '_')}`);
    if (!weatherDiv) return;

    const updateDiv = (weather) => {
      weatherDiv.textContent = `${Math.round(weather.main.temp)}°C, ${weather.weather[0].main} `;
      const img = document.createElement('img');
      img.src = `https://openweathermap.org/img/wn/${escapeHTML(weather.weather[0].icon)}.png`;
      img.width = 32;
      weatherDiv.appendChild(img);
    };

    if (capitalsWeatherCache[cacheKey]) {
      updateDiv(capitalsWeatherCache[cacheKey]);
    } else {
      fetchWeatherApi('/weather', { lat, lon })
        .then((weather) => {
          capitalsWeatherCache[cacheKey] = weather;
          updateDiv(weather);
        })
        .catch(() => {
          weatherDiv.textContent = '';
          weatherDiv.appendChild(createElementWithText('span', 'Failed to load', 'text-danger'));
        });
    }
  });

  setTimeout(() => {
    document.querySelectorAll('.capital-card').forEach((card) => {
      card.onclick = (e) => {
        if (e.target.tagName === 'A' || e.target.closest('a')) return;
        showCapitalDetails(card.dataset.capital, card.dataset.country, card.dataset.lat, card.dataset.lon);
      };
    });
  }, 100);

  if (totalCapitals > perPage) {
    const paginationWrapper = createElementWithText('div', '', 'capitals-pagination');
    if (page > 1) {
      const prevBtn = createElementWithText('button', 'Previous', '');
      prevBtn.onclick = () => fetchAllCapitalsWeather(page - 1, perPage, document.getElementById('capitalSearch').value);
      paginationWrapper.appendChild(prevBtn);
    }
    if (end < totalCapitals) {
      const nextBtn = createElementWithText('button', 'Next', '');
      nextBtn.onclick = () => fetchAllCapitalsWeather(page + 1, perPage, document.getElementById('capitalSearch').value);
      paginationWrapper.appendChild(nextBtn);
    }
    container.appendChild(paginationWrapper);
  }
}

function showCapitalDetails(capital, country, lat, lon) {
  fetchWeatherApi('/weather', { lat, lon })
    .then((weather) => {
      const modalBody = document.getElementById('capitalModalBody');
      modalBody.textContent = '';
      modalBody.appendChild(createElementWithText('h5', `${capital}, ${country}`));
      const imgDiv = document.createElement('div');
      const img = document.createElement('img');
      img.src = `https://openweathermap.org/img/wn/${escapeHTML(weather.weather[0].icon)}.png`;
      img.width = 48;
      imgDiv.appendChild(img);
      modalBody.appendChild(imgDiv);
      modalBody.appendChild(createElementWithText('div', `${Math.round(weather.main.temp)}°C (${weather.weather[0].main})`));
      modalBody.appendChild(createElementWithText('div', `Humidity: ${weather.main.humidity}%`));
      modalBody.appendChild(createElementWithText('div', `Pressure: ${weather.main.pressure} hPa`));
      modalBody.appendChild(createElementWithText('div', `Wind: ${formatWindSpeed(weather.wind.speed)}`));
      modalBody.appendChild(createElementWithText('div', `Clouds: ${weather.clouds.all}%`));
      modalBody.appendChild(createElementWithText('div', `Visibility: ${weather.visibility / 1000} km`));
      capitalModalControls?.open();
    })
    .catch(() => showToast('Failed to load capital weather details', 'error'));
}

export function initCapitalsSearch() {
  capitalModalControls = initModal('capitalModal', 'capitalModalClose');
  const searchInput = document.getElementById('capitalSearch');
  if (!searchInput) return;

  searchInput.addEventListener('input', debounce(() => {
    fetchAllCapitalsWeather(1, 6, searchInput.value);
  }, 400));
}

function debounce(fn, delay) {
  return (...args) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => fn(...args), delay);
  };
}
