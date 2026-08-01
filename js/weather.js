const WEATHER_API_BASE_URL = (window.WEATHER_HUB_CONFIG && window.WEATHER_HUB_CONFIG.WEATHER_API_BASE_URL) || '/api';

function buildWeatherApiUrl(endpoint, params) {
  const query = new URLSearchParams(params);
  const base = WEATHER_API_BASE_URL.replace(/\/$/, '');
  return base + endpoint + '?' + query.toString();
}

function fetchWeatherApi(endpoint, params) {
  return fetch(buildWeatherApiUrl(endpoint, params)).then(parseWeatherResponse);
}

function formatDate(dt) {
  return new Date(dt * 1000).toLocaleDateString(undefined, {weekday:'long', day:'2-digit', month:'short', year:'numeric'});
}

function formatWindSpeed(ms) {
  return Math.round(ms * 3.6) + ' km/h';
}

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
  let svg = '';
  switch ((weather || '').toLowerCase()) {
    case 'clear':
      svg = '<svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="16" fill="#FFD600"><animate attributeName="r" values="16;18;16" dur="2s" repeatCount="indefinite"/></circle></svg>';
      break;
    case 'clouds':
      svg = '<svg width="64" height="64" viewBox="0 0 64 64"><ellipse cx="32" cy="40" rx="18" ry="10" fill="#B0BEC5"><animate attributeName="cx" values="32;36;32" dur="2s" repeatCount="indefinite"/></ellipse></svg>';
      break;
    case 'rain':
      svg = '<svg width="64" height="64" viewBox="0 0 64 64"><ellipse cx="32" cy="40" rx="18" ry="10" fill="#90CAF9"/><line x1="24" y1="50" x2="24" y2="60" stroke="#2196F3" stroke-width="3"><animate attributeName="y2" values="60;64;60" dur="1s" repeatCount="indefinite"/></line><line x1="40" y1="50" x2="40" y2="60" stroke="#2196F3" stroke-width="3"><animate attributeName="y2" values="60;64;60" dur="1s" repeatCount="indefinite"/></line></svg>';
      break;
    case 'thunderstorm':
      svg = '<svg width="64" height="64" viewBox="0 0 64 64"><ellipse cx="32" cy="40" rx="18" ry="10" fill="#B0BEC5"/><polygon points="30,50 36,50 32,60" fill="#FFD600"><animate attributeName="points" values="30,50 36,50 32,60;32,52 38,52 34,62;30,50 36,50 32,60" dur="1.5s" repeatCount="indefinite"/></polygon></svg>';
      break;
    case 'snow':
      svg = '<svg width="64" height="64" viewBox="0 0 64 64"><ellipse cx="32" cy="40" rx="18" ry="10" fill="#E3F2FD"/><circle cx="32" cy="54" r="4" fill="#90CAF9"><animate attributeName="cy" values="54;60;54" dur="2s" repeatCount="indefinite"/></circle></svg>';
      break;
    case 'mist':
    case 'fog':
      svg = '<svg width="64" height="64" viewBox="0 0 64 64"><ellipse cx="32" cy="40" rx="18" ry="10" fill="#B0BEC5"/><rect x="16" y="48" width="32" height="6" fill="#CFD8DC"><animate attributeName="y" values="48;52;48" dur="2s" repeatCount="indefinite"/></rect></svg>';
      break;
    default:
      svg = '<svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="16" fill="#FFD600"/></svg>';
  }
  iconDiv.innerHTML = svg;
}

function handleWeatherError(message) {
  if (typeof showLoader === 'function') showLoader(false);
  if (typeof showToast === 'function') showToast(message || 'Failed to fetch weather data', 'error');
}

function checkSevereWeatherAlerts(data) {
  const card = document.getElementById('weatherAlertCard');
  const content = document.getElementById('weatherAlertContent');
  if (!card || !content) return;

  const alerts = [];
  const temp = data.main.temp;
  const wind = data.wind.speed;
  const main = data.weather[0].main.toLowerCase();
  const now = data.dt;

  if (main === 'thunderstorm') {
    alerts.push({
      event: 'Thunderstorm Advisory',
      description: 'Thunderstorm conditions detected. Seek shelter if necessary.',
      start: now,
      end: now + 3600
    });
  }
  if (temp >= 38) {
    alerts.push({
      event: 'Extreme Heat Advisory',
      description: 'Temperature is ' + Math.round(temp) + '°C. Stay hydrated and limit outdoor activity.',
      start: now,
      end: now + 3600
    });
  }
  if (temp <= -5) {
    alerts.push({
      event: 'Extreme Cold Advisory',
      description: 'Temperature is ' + Math.round(temp) + '°C. Dress warmly and limit exposure.',
      start: now,
      end: now + 3600
    });
  }
  if (wind >= 15) {
    alerts.push({
      event: 'High Wind Advisory',
      description: 'Wind speed is ' + formatWindSpeed(wind) + '. Secure loose objects outdoors.',
      start: now,
      end: now + 3600
    });
  }

  if (alerts.length > 0) {
    card.style.display = '';
    const alert = alerts[0];
    content.innerHTML =
      '<div class="fw-bold mb-1">' + alert.event + '</div>' +
      '<div class="mb-1">' + alert.description + '</div>' +
      '<div class="small text-muted">Detected at ' + new Date(alert.start * 1000).toLocaleString() + '</div>';
  } else {
    card.style.display = '';
    content.innerHTML = '<span class="text-success">No severe weather conditions detected for your area.</span>';
  }
}

function displayWeatherData(data) {
  const desc = data.weather[0].description;
  const main = data.weather[0].main;
  const mainEl = document.getElementById('weatherMain');
  const displayDesc = desc.charAt(0).toUpperCase() + desc.slice(1);

  mainEl.textContent = displayDesc;
  mainEl.dataset.original = displayDesc;
  document.getElementById('weatherTemp').textContent = Math.round(data.main.temp) + '°C';
  document.getElementById('realFeel').textContent = Math.round(data.main.feels_like) + '°';
  document.getElementById('windSpeed').textContent = formatWindSpeed(data.wind.speed);
  document.getElementById('weatherDate').textContent = formatDate(data.dt);

  setWeatherBackground(main);
  setAnimatedWeatherIcon(main);
  checkSevereWeatherAlerts(data);

  if (typeof translateText === 'function') {
    const langSelect = document.getElementById('languageSelect');
    if (langSelect) {
      translateText(displayDesc, langSelect.value, function(translated) {
        mainEl.textContent = translated;
      });
    }
  }
}

function parseWeatherResponse(res) {
  return res.json().then(function(data) {
    if (!res.ok || (data.cod && Number(data.cod) !== 200)) {
      throw new Error(data.message || 'Weather data unavailable');
    }
    return data;
  });
}

// --- Reverse Geocoding ---
function getLocationName(lat, lon, callback) {
  fetch('https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lon + '&format=json')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      callback(data && data.display_name ? data.display_name : null);
    })
    .catch(function() { callback(null); });
}

function setLocationName(name) {
  if (!name) return;
  const el = document.getElementById('locationName');
  if (!el) return;
  el.textContent = name;
  el.dataset.original = name;
  if (typeof translateText === 'function') {
    const langSelect = document.getElementById('languageSelect');
    if (langSelect) {
      translateText(name, langSelect.value, function(translated) {
        el.textContent = translated;
      });
    }
  }
}

// --- Main Weather + Forecast ---
function fetchWeatherAndForecast(lat, lon) {
  if (typeof showLoader === 'function') showLoader(true);
  fetchWeatherApi('/weather', { lat: lat, lon: lon })
    .then(function(data) {
      displayWeatherData(data);
      if (typeof showLoader === 'function') showLoader(false);
      fetchForecast(lat, lon);
    })
    .catch(function(err) {
      handleWeatherError(err.message);
    });
}

function fetchWeatherByCityAndForecast(city) {
  if (typeof showLoader === 'function') showLoader(true);
  fetchWeatherApi('/weather', { city: city })
    .then(function(data) {
      displayWeatherData(data);
      if (typeof showLoader === 'function') showLoader(false);
      fetchForecastByCity(city);
    })
    .catch(function(err) {
      handleWeatherError(err.message);
    });
}

function fetchForecast(lat, lon) {
  fetchWeatherApi('/forecast', { lat: lat, lon: lon })
    .then(function(data) {
      renderForecast(data);
    })
    .catch(function() {
      if (typeof showToast === 'function') showToast('Failed to load forecast', 'error');
    });
}

function fetchForecastByCity(city) {
  fetchWeatherApi('/forecast', { city: city })
    .then(function(data) {
      renderForecast(data);
    })
    .catch(function() {
      if (typeof showToast === 'function') showToast('Failed to load forecast', 'error');
    });
}

function renderForecast(data) {
  let hourlyHtml = '';
  data.list.slice(0, 8).forEach(function(item) {
    hourlyHtml +=
      '<div class="text-center">' +
      '<div>' + new Date(item.dt_txt).getHours() + ':00</div>' +
      '<img src="https://openweathermap.org/img/wn/' + item.weather[0].icon + '.png" width="40">' +
      '<div>' + Math.round(item.main.temp) + '°C</div>' +
      '</div>';
  });
  document.getElementById('hourlyForecast').innerHTML = hourlyHtml;

  let forecastIcons = '';
  const days = {};
  data.list.forEach(function(item) {
    const date = item.dt_txt.split(' ')[0];
    const hour = item.dt_txt.split(' ')[1];
    if (hour === '12:00:00' && !days[date]) {
      days[date] = item;
    }
  });
  Object.values(days).slice(0, 5).forEach(function(item) {
    forecastIcons += '<img src="https://openweathermap.org/img/wn/' + item.weather[0].icon + '.png" width="32" title="' + item.weather[0].main + '">';
  });
  document.getElementById('forecastIcons').innerHTML = forecastIcons;

  if (data.list && data.list.length) {
    const chanceOfRain = data.list[0].pop !== undefined ? Math.round(data.list[0].pop * 100) + '%' : '--';
    document.getElementById('rainChance').textContent = chanceOfRain;
  }
  document.getElementById('uvIndex').textContent = '--';
}

function loadHomeWeather() {
  const fallback = function() {
    setLocationName('Terengganu');
    fetchWeatherByCityAndForecast('Terengganu');
    fetchAllCapitalsWeather();
  };

  if (!navigator.geolocation) {
    fallback();
    return;
  }

  navigator.geolocation.getCurrentPosition(function(pos) {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    getLocationName(lat, lon, setLocationName);
    fetchWeatherAndForecast(lat, lon);
    fetchAllCapitalsWeather();
  }, fallback);
}

// --- Capitals Weather with Search, Pagination, and Modal ---
let allCapitals = [];
let capitalsWeatherCache = {};
let searchTimeout = null;

function fetchAllCapitalsWeather(page, perPage, searchTerm) {
  page = page || 1;
  perPage = perPage || 6;
  searchTerm = searchTerm || '';

  const container = document.getElementById('nearbyPlaces');
  container.innerHTML = '<div class="w-100 text-center py-3">Loading world capitals weather...</div>';
  document.getElementById('capitalsCount').textContent = '';

  if (allCapitals.length === 0) {
    fetch('https://restcountries.com/v3.1/all?fields=capital,latlng,name')
      .then(function(res) {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then(function(countries) {
        allCapitals = countries.filter(function(country) {
          return country.capital && country.capital.length && country.latlng && country.latlng.length === 2;
        });
        renderCapitals(page, perPage, searchTerm);
      })
      .catch(function() {
        container.innerHTML = '<div class="w-100 text-center py-3 text-danger">Failed to load capitals data.</div>';
      });
  } else {
    renderCapitals(page, perPage, searchTerm);
  }
}

function renderCapitals(page, perPage, searchTerm) {
  const container = document.getElementById('nearbyPlaces');
  let filtered = allCapitals;
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = allCapitals.filter(function(c) {
      return c.capital[0].toLowerCase().includes(term) || c.name.common.toLowerCase().includes(term);
    });
  }
  const totalCapitals = filtered.length;
  const start = (page - 1) * perPage;
  const end = start + perPage;
  let shown = 0;
  let html = '';

  if (filtered.length === 0) {
    container.innerHTML = '<div class="w-100 text-center py-3 text-muted">No results found.</div>';
    document.getElementById('capitalsCount').textContent = '';
    return;
  }

  html += '<div class="horizontal-scroll">';
  filtered.slice(start, end).forEach(function(country) {
    const lat = country.latlng[0];
    const lon = country.latlng[1];
    const capital = country.capital[0];
    const countryName = country.name.common;
    const cacheKey = capital + ',' + countryName;
    html +=
      '<div class="frosted nearby-card p-2 text-center capital-card mx-1"' +
      ' data-capital="' + capital + '"' +
      ' data-country="' + countryName + '"' +
      ' data-lat="' + lat + '"' +
      ' data-lon="' + lon + '">' +
      '<div class="fw-bold">' + capital + ', ' + countryName + '</div>' +
      '<div class="capital-weather" id="capitalWeather-' + cacheKey.replace(/\s/g, '_') + '">Loading...</div>' +
      '<div class="mt-2">' +
      '<a href="map.html?lat=' + lat + '&lon=' + lon + '&name=' + encodeURIComponent(capital + ', ' + countryName) + '" class="btn btn-sm btn-outline-success">' +
      '<i class="bi bi-geo-alt"></i> View on Map</a>' +
      '</div></div>';
    shown++;
  });
  html += '</div>';
  container.innerHTML = html;
  document.getElementById('capitalsCount').textContent = 'Showing ' + (start + shown) + ' of ' + totalCapitals + ' capitals';

  filtered.slice(start, end).forEach(function(country) {
    const lat = country.latlng[0];
    const lon = country.latlng[1];
    const capital = country.capital[0];
    const countryName = country.name.common;
    const cacheKey = capital + ',' + countryName;
    const weatherDiv = document.getElementById('capitalWeather-' + cacheKey.replace(/\s/g, '_'));

    if (capitalsWeatherCache[cacheKey]) {
      const weather = capitalsWeatherCache[cacheKey];
      weatherDiv.innerHTML = Math.round(weather.main.temp) + '°C, ' + weather.weather[0].main +
        ' <img src="https://openweathermap.org/img/wn/' + weather.weather[0].icon + '.png" width="32">';
    } else {
      fetchWeatherApi('/weather', { lat: lat, lon: lon })
        .then(function(weather) {
          capitalsWeatherCache[cacheKey] = weather;
          weatherDiv.innerHTML = Math.round(weather.main.temp) + '°C, ' + weather.weather[0].main +
            ' <img src="https://openweathermap.org/img/wn/' + weather.weather[0].icon + '.png" width="32">';
        })
        .catch(function() {
          weatherDiv.innerHTML = '<span class="text-danger">Failed to load</span>';
        });
    }
  });

  setTimeout(function() {
    document.querySelectorAll('.capital-card').forEach(function(card) {
      card.onclick = function(e) {
        if (e.target.tagName === 'A') return;
        showCapitalDetails(card.dataset.capital, card.dataset.country, card.dataset.lat, card.dataset.lon);
      };
    });
  }, 100);

  if (totalCapitals > perPage) {
    setTimeout(function() {
      let paginationHtml = '<div class="d-flex justify-content-center mt-2 gap-2">';
      if (page > 1) {
        paginationHtml += '<button class="btn btn-sm btn-outline-primary" id="prevCapitals">Previous</button>';
      }
      if (end < totalCapitals) {
        paginationHtml += '<button class="btn btn-sm btn-outline-primary" id="nextCapitals">Next</button>';
      }
      paginationHtml += '</div>';
      container.insertAdjacentHTML('beforeend', paginationHtml);
      if (page > 1) {
        document.getElementById('prevCapitals').onclick = function() {
          fetchAllCapitalsWeather(page - 1, perPage, document.getElementById('capitalSearch').value);
        };
      }
      if (end < totalCapitals) {
        document.getElementById('nextCapitals').onclick = function() {
          fetchAllCapitalsWeather(page + 1, perPage, document.getElementById('capitalSearch').value);
        };
      }
    }, 200);
  }
}

function debounceCapitalsSearch(fn, delay) {
  return function() {
    const args = arguments;
    const self = this;
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function() { fn.apply(self, args); }, delay);
  };
}

document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('capitalSearch');
  if (searchInput) {
    searchInput.addEventListener('input', debounceCapitalsSearch(function() {
      fetchAllCapitalsWeather(1, 6, this.value);
    }, 400));
  }
});

function showCapitalDetails(capital, country, lat, lon) {
  fetchWeatherApi('/weather', { lat: lat, lon: lon })
    .then(function(weather) {
      const html =
        '<h5>' + capital + ', ' + country + '</h5>' +
        '<div><img src="https://openweathermap.org/img/wn/' + weather.weather[0].icon + '.png" width="48"></div>' +
        '<div><strong>' + Math.round(weather.main.temp) + '°C</strong> (' + weather.weather[0].main + ')</div>' +
        '<div>Humidity: ' + weather.main.humidity + '%</div>' +
        '<div>Pressure: ' + weather.main.pressure + ' hPa</div>' +
        '<div>Wind: ' + formatWindSpeed(weather.wind.speed) + '</div>' +
        '<div>Clouds: ' + weather.clouds.all + '%</div>' +
        '<div>Visibility: ' + (weather.visibility / 1000) + ' km</div>';
      document.getElementById('capitalModalBody').innerHTML = html;
      new bootstrap.Modal(document.getElementById('capitalModal')).show();
    })
    .catch(function() {
      if (typeof showToast === 'function') showToast('Failed to load capital weather details', 'error');
    });
}
