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
      svg = '<svg width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="18" fill="#FBBF24" opacity="0.9"><animate attributeName="r" values="18;20;18" dur="2.5s" repeatCount="indefinite"/></circle><circle cx="40" cy="40" r="26" fill="none" stroke="#FBBF24" stroke-width="1.5" opacity="0.3"><animate attributeName="r" values="26;30;26" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.3;0.1;0.3" dur="3s" repeatCount="indefinite"/></circle></svg>';
      break;
    case 'clouds':
      svg = '<svg width="80" height="80" viewBox="0 0 80 80"><ellipse cx="32" cy="44" rx="20" ry="12" fill="rgba(255,255,255,0.25)"><animate attributeName="cx" values="32;36;32" dur="3s" repeatCount="indefinite"/></ellipse><ellipse cx="44" cy="40" rx="16" ry="10" fill="rgba(255,255,255,0.18)"><animate attributeName="cx" values="44;40;44" dur="4s" repeatCount="indefinite"/></ellipse></svg>';
      break;
    case 'rain':
    case 'drizzle':
      svg = '<svg width="80" height="80" viewBox="0 0 80 80"><ellipse cx="40" cy="36" rx="20" ry="12" fill="rgba(255,255,255,0.2)"/><line x1="28" y1="52" x2="26" y2="62" stroke="#60A5FA" stroke-width="2" stroke-linecap="round" opacity="0.7"><animate attributeName="y1" values="52;56;52" dur="0.8s" repeatCount="indefinite"/><animate attributeName="y2" values="62;66;62" dur="0.8s" repeatCount="indefinite"/></line><line x1="40" y1="50" x2="38" y2="62" stroke="#60A5FA" stroke-width="2" stroke-linecap="round" opacity="0.5"><animate attributeName="y1" values="50;54;50" dur="1s" repeatCount="indefinite"/><animate attributeName="y2" values="62;66;62" dur="1s" repeatCount="indefinite"/></line><line x1="52" y1="52" x2="50" y2="60" stroke="#60A5FA" stroke-width="2" stroke-linecap="round" opacity="0.6"><animate attributeName="y1" values="52;56;52" dur="0.9s" repeatCount="indefinite"/><animate attributeName="y2" values="60;64;60" dur="0.9s" repeatCount="indefinite"/></line></svg>';
      break;
    case 'thunderstorm':
      svg = '<svg width="80" height="80" viewBox="0 0 80 80"><ellipse cx="40" cy="36" rx="22" ry="12" fill="rgba(255,255,255,0.15)"/><polygon points="38,48 44,48 40,58 46,58 36,72 40,60 34,60" fill="#FBBF24"><animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite"/></polygon></svg>';
      break;
    case 'snow':
      svg = '<svg width="80" height="80" viewBox="0 0 80 80"><ellipse cx="40" cy="36" rx="20" ry="12" fill="rgba(255,255,255,0.25)"/><circle cx="30" cy="56" r="3" fill="rgba(255,255,255,0.6)"><animate attributeName="cy" values="56;64;56" dur="2s" repeatCount="indefinite"/></circle><circle cx="40" cy="52" r="2.5" fill="rgba(255,255,255,0.5)"><animate attributeName="cy" values="52;62;52" dur="2.5s" repeatCount="indefinite"/></circle><circle cx="50" cy="54" r="3" fill="rgba(255,255,255,0.6)"><animate attributeName="cy" values="54;66;54" dur="1.8s" repeatCount="indefinite"/></circle></svg>';
      break;
    case 'mist':
    case 'fog':
    case 'haze':
      svg = '<svg width="80" height="80" viewBox="0 0 80 80"><rect x="16" y="34" width="48" height="4" rx="2" fill="rgba(255,255,255,0.2)"><animate attributeName="x" values="16;20;16" dur="3s" repeatCount="indefinite"/></rect><rect x="20" y="44" width="40" height="4" rx="2" fill="rgba(255,255,255,0.15)"><animate attributeName="x" values="20;16;20" dur="4s" repeatCount="indefinite"/></rect><rect x="18" y="54" width="44" height="4" rx="2" fill="rgba(255,255,255,0.1)"><animate attributeName="x" values="18;22;18" dur="3.5s" repeatCount="indefinite"/></rect></svg>';
      break;
    default:
      svg = '<svg width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="18" fill="#FBBF24" opacity="0.8"/></svg>';
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
      '<div style="font-weight:600;margin-bottom:0.375rem;">' + alert.event + '</div>' +
      '<div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.25rem;">' + alert.description + '</div>' +
      '<div style="font-size:0.75rem;color:var(--text-muted);">Detected at ' + new Date(alert.start * 1000).toLocaleString() + '</div>';
  } else {
    card.style.display = '';
    content.innerHTML = '<span style="color:#34d399;font-size:0.85rem;">No severe weather conditions detected for your area.</span>';
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

  // Update stat pills
  var realFeel = Math.round(data.main.feels_like) + '°';
  var windStr = formatWindSpeed(data.wind.speed);
  document.getElementById('realFeel').textContent = realFeel;
  document.getElementById('windSpeed').textContent = windStr;
  document.getElementById('weatherDate').textContent = formatDate(data.dt);

  // Also update the "Now" tab if those elements exist
  var realFeelTab = document.getElementById('realFeelTab');
  var windSpeedTab = document.getElementById('windSpeedTab');
  if (realFeelTab) realFeelTab.textContent = realFeel;
  if (windSpeedTab) windSpeedTab.textContent = windStr;

  setWeatherBackground(main);
  setAnimatedWeatherIcon(main);
  checkSevereWeatherAlerts(data);

  if (typeof translateText === 'function') {
    var langSelect = document.getElementById('languageSelect');
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
  var el = document.getElementById('locationName');
  if (!el) return;
  el.textContent = name;
  el.dataset.original = name;
  if (typeof translateText === 'function') {
    var langSelect = document.getElementById('languageSelect');
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
  // --- Hourly forecast (glass cards) ---
  var hourlyHtml = '';
  data.list.slice(0, 8).forEach(function(item) {
    hourlyHtml +=
      '<div class="hourly-item">' +
      '<div class="hour">' + new Date(item.dt_txt).getHours() + ':00</div>' +
      '<img src="https://openweathermap.org/img/wn/' + item.weather[0].icon + '.png" width="36" alt="' + item.weather[0].main + '">' +
      '<div class="temp">' + Math.round(item.main.temp) + '°C</div>' +
      '</div>';
  });
  document.getElementById('hourlyForecast').innerHTML = hourlyHtml;

  // --- 5-day forecast (list items) ---
  var dailyHtml = '';
  var days = {};
  data.list.forEach(function(item) {
    var date = item.dt_txt.split(' ')[0];
    var hour = item.dt_txt.split(' ')[1];
    if (hour === '12:00:00' && !days[date]) {
      days[date] = item;
    }
  });
  Object.values(days).slice(0, 5).forEach(function(item) {
    var dayName = new Date(item.dt_txt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    dailyHtml +=
      '<div class="daily-item">' +
      '<span class="day-name">' + dayName + '</span>' +
      '<img src="https://openweathermap.org/img/wn/' + item.weather[0].icon + '.png" width="32" alt="' + item.weather[0].main + '">' +
      '<span class="day-desc">' + item.weather[0].main + '</span>' +
      '<span class="day-temp">' + Math.round(item.main.temp) + '°C</span>' +
      '</div>';
  });
  document.getElementById('forecastIcons').innerHTML = dailyHtml;

  // --- Rain chance ---
  if (data.list && data.list.length) {
    var chanceOfRain = data.list[0].pop !== undefined ? Math.round(data.list[0].pop * 100) + '%' : '--';
    document.getElementById('rainChance').textContent = chanceOfRain;
    var rainChanceTab = document.getElementById('rainChanceTab');
    if (rainChanceTab) rainChanceTab.textContent = chanceOfRain;
  }
  document.getElementById('uvIndex').textContent = '--';
  var uvIndexTab = document.getElementById('uvIndexTab');
  if (uvIndexTab) uvIndexTab.textContent = '--';
}

function loadHomeWeather() {
  var fallback = function() {
    setLocationName('Terengganu');
    fetchWeatherByCityAndForecast('Terengganu');
    fetchAllCapitalsWeather();
  };

  if (!navigator.geolocation) {
    fallback();
    return;
  }

  navigator.geolocation.getCurrentPosition(function(pos) {
    var lat = pos.coords.latitude;
    var lon = pos.coords.longitude;
    getLocationName(lat, lon, setLocationName);
    fetchWeatherAndForecast(lat, lon);
    fetchAllCapitalsWeather();
  }, fallback);
}

// --- Capitals Weather with Search, Pagination, and Modal ---
var allCapitals = [];
var capitalsWeatherCache = {};
var searchTimeout = null;

function fetchAllCapitalsWeather(page, perPage, searchTerm) {
  page = page || 1;
  perPage = perPage || 6;
  searchTerm = searchTerm || '';

  var container = document.getElementById('nearbyPlaces');
  container.innerHTML = '<div style="width:100%;text-align:center;padding:1.5rem 0;color:var(--text-muted);font-size:0.85rem;">Loading world capitals weather...</div>';
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
        container.innerHTML = '<div style="width:100%;text-align:center;padding:1.5rem 0;color:#f87171;font-size:0.85rem;">Failed to load capitals data.</div>';
      });
  } else {
    renderCapitals(page, perPage, searchTerm);
  }
}

function renderCapitals(page, perPage, searchTerm) {
  var container = document.getElementById('nearbyPlaces');
  var filtered = allCapitals;
  if (searchTerm) {
    var term = searchTerm.toLowerCase();
    filtered = allCapitals.filter(function(c) {
      return c.capital[0].toLowerCase().includes(term) || c.name.common.toLowerCase().includes(term);
    });
  }
  var totalCapitals = filtered.length;
  var start = (page - 1) * perPage;
  var end = start + perPage;
  var shown = 0;
  var html = '';

  if (filtered.length === 0) {
    container.innerHTML = '<div style="width:100%;text-align:center;padding:1.5rem 0;color:var(--text-muted);font-size:0.85rem;">No results found.</div>';
    document.getElementById('capitalsCount').textContent = '';
    return;
  }

  filtered.slice(start, end).forEach(function(country) {
    var lat = country.latlng[0];
    var lon = country.latlng[1];
    var capital = country.capital[0];
    var countryName = country.name.common;
    var cacheKey = capital + ',' + countryName;
    html +=
      '<div class="capital-card frosted nearby-card"' +
      ' data-capital="' + capital + '"' +
      ' data-country="' + countryName + '"' +
      ' data-lat="' + lat + '"' +
      ' data-lon="' + lon + '">' +
      '<div class="capital-name">' + capital + ', ' + countryName + '</div>' +
      '<div class="capital-weather" id="capitalWeather-' + cacheKey.replace(/\s/g, '_') + '">Loading...</div>' +
      '<div style="margin-top:0.625rem;">' +
      '<a href="map.html?lat=' + lat + '&lon=' + lon + '&name=' + encodeURIComponent(capital + ', ' + countryName) + '" class="map-link">' +
      '<i class="bi bi-geo-alt-fill"></i> View on Map</a>' +
      '</div></div>';
    shown++;
  });
  container.innerHTML = html;
  document.getElementById('capitalsCount').textContent = 'Showing ' + (start + shown) + ' of ' + totalCapitals;

  filtered.slice(start, end).forEach(function(country) {
    var lat = country.latlng[0];
    var lon = country.latlng[1];
    var capital = country.capital[0];
    var countryName = country.name.common;
    var cacheKey = capital + ',' + countryName;
    var weatherDiv = document.getElementById('capitalWeather-' + cacheKey.replace(/\s/g, '_'));

    if (capitalsWeatherCache[cacheKey]) {
      var weather = capitalsWeatherCache[cacheKey];
      weatherDiv.innerHTML = Math.round(weather.main.temp) + '°C, ' + weather.weather[0].main +
        ' <img src="https://openweathermap.org/img/wn/' + weather.weather[0].icon + '.png" width="28" alt="' + weather.weather[0].main + '" style="vertical-align:middle;">';
    } else {
      fetchWeatherApi('/weather', { lat: lat, lon: lon })
        .then(function(weather) {
          capitalsWeatherCache[cacheKey] = weather;
          weatherDiv.innerHTML = Math.round(weather.main.temp) + '°C, ' + weather.weather[0].main +
            ' <img src="https://openweathermap.org/img/wn/' + weather.weather[0].icon + '.png" width="28" alt="' + weather.weather[0].main + '" style="vertical-align:middle;">';
        })
        .catch(function() {
          weatherDiv.innerHTML = '<span style="color:#f87171;">Failed to load</span>';
        });
    }
  });

  setTimeout(function() {
    document.querySelectorAll('.capital-card').forEach(function(card) {
      card.onclick = function(e) {
        if (e.target.tagName === 'A' || e.target.closest('a')) return;
        showCapitalDetails(card.dataset.capital, card.dataset.country, card.dataset.lat, card.dataset.lon);
      };
    });
  }, 100);

  if (totalCapitals > perPage) {
    setTimeout(function() {
      var paginationHtml = '<div class="capitals-pagination">';
      if (page > 1) {
        paginationHtml += '<button id="prevCapitals">← Previous</button>';
      }
      if (end < totalCapitals) {
        paginationHtml += '<button id="nextCapitals">Next →</button>';
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
    var args = arguments;
    var self = this;
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function() { fn.apply(self, args); }, delay);
  };
}

document.addEventListener('DOMContentLoaded', function() {
  var searchInput = document.getElementById('capitalSearch');
  if (searchInput) {
    searchInput.addEventListener('input', debounceCapitalsSearch(function() {
      fetchAllCapitalsWeather(1, 6, this.value);
    }, 400));
  }
});

function showCapitalDetails(capital, country, lat, lon) {
  fetchWeatherApi('/weather', { lat: lat, lon: lon })
    .then(function(weather) {
      var html =
        '<h5 style="font-size:1.1rem;font-weight:700;margin-bottom:0.75rem;">' + capital + ', ' + country + '</h5>' +
        '<div style="text-align:center;margin-bottom:0.75rem;"><img src="https://openweathermap.org/img/wn/' + weather.weather[0].icon + '@2x.png" width="64" alt="' + weather.weather[0].main + '"></div>' +
        '<div style="font-size:1.5rem;font-weight:700;text-align:center;margin-bottom:0.5rem;">' + Math.round(weather.main.temp) + '°C <span style="font-size:0.85rem;font-weight:400;color:var(--text-muted);">' + weather.weather[0].main + '</span></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;font-size:0.85rem;">' +
        '<div style="color:var(--text-muted);">Humidity</div><div style="font-weight:600;">' + weather.main.humidity + '%</div>' +
        '<div style="color:var(--text-muted);">Pressure</div><div style="font-weight:600;">' + weather.main.pressure + ' hPa</div>' +
        '<div style="color:var(--text-muted);">Wind</div><div style="font-weight:600;">' + formatWindSpeed(weather.wind.speed) + '</div>' +
        '<div style="color:var(--text-muted);">Clouds</div><div style="font-weight:600;">' + weather.clouds.all + '%</div>' +
        '<div style="color:var(--text-muted);">Visibility</div><div style="font-weight:600;">' + (weather.visibility / 1000) + ' km</div>' +
        '</div>';
      document.getElementById('capitalModalBody').innerHTML = html;
      // Use custom modal instead of Bootstrap
      if (typeof showCapitalModal === 'function') {
        showCapitalModal();
      } else {
        // Fallback: try to open modal-overlay directly
        var modal = document.getElementById('capitalModal');
        if (modal) modal.classList.add('open');
      }
    })
    .catch(function() {
      if (typeof showToast === 'function') showToast('Failed to load capital weather details', 'error');
    });
}
