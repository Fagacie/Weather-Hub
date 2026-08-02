function fetchWeatherApi(endpoint, params) {
  return fetch(buildWeatherApiUrl(endpoint, params)).then(parseWeatherResponse);
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

  content.textContent = '';
  const alerts = [];
  const temp = data.main.temp;
  const wind = data.wind.speed;
  const main = data.weather[0].main.toLowerCase();
  const now = data.dt;

  if (main === 'thunderstorm') {
    alerts.push({
      event: 'Thunderstorm Advisory',
      description: 'Thunderstorm conditions detected. Seek shelter if necessary.',
      start: now
    });
  }
  if (temp >= 38) {
    alerts.push({
      event: 'Extreme Heat Advisory',
      description: 'Temperature is ' + Math.round(temp) + '°C. Stay hydrated and limit outdoor activity.',
      start: now
    });
  }
  if (temp <= -5) {
    alerts.push({
      event: 'Extreme Cold Advisory',
      description: 'Temperature is ' + Math.round(temp) + '°C. Dress warmly and limit exposure.',
      start: now
    });
  }
  if (wind >= 15) {
    alerts.push({
      event: 'High Wind Advisory',
      description: 'Wind speed is ' + formatWindSpeed(wind) + '. Secure loose objects outdoors.',
      start: now
    });
  }

  card.style.display = '';
  if (alerts.length > 0) {
    const alert = alerts[0];
    const eventDiv = createElementWithText('div', alert.event, 'fw-bold mb-1');
    const descDiv = createElementWithText('div', alert.description, 'mb-1');
    const timeDiv = createElementWithText('div', 'Detected at ' + new Date(alert.start * 1000).toLocaleString(), 'small text-muted');
    content.appendChild(eventDiv);
    content.appendChild(descDiv);
    content.appendChild(timeDiv);
  } else {
    const successSpan = createElementWithText('span', 'No severe weather conditions detected for your area.', 'text-success');
    content.appendChild(successSpan);
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
  fetchWeatherApi('/reverse-geocode', { lat: lat, lon: lon })
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
  const hourlyDiv = document.getElementById('hourlyForecast');
  hourlyDiv.textContent = '';

  data.list.slice(0, 8).forEach(function(item) {
    const card = createElementWithText('div', '', 'text-center');
    const timeEl = createElementWithText('div', new Date(item.dt_txt).getHours() + ':00');
    const imgEl = document.createElement('img');
    const iconCode = escapeHTML(item.weather[0].icon);
    imgEl.src = 'https://openweathermap.org/img/wn/' + iconCode + '.png';
    imgEl.width = 40;
    const tempEl = createElementWithText('div', Math.round(item.main.temp) + '°C');

    card.appendChild(timeEl);
    card.appendChild(imgEl);
    card.appendChild(tempEl);
    hourlyDiv.appendChild(card);
  });

  const iconsDiv = document.getElementById('forecastIcons');
  iconsDiv.textContent = '';
  const days = {};
  data.list.forEach(function(item) {
    const date = item.dt_txt.split(' ')[0];
    const hour = item.dt_txt.split(' ')[1];
    if (hour === '12:00:00' && !days[date]) {
      days[date] = item;
    }
  });

  Object.values(days).slice(0, 5).forEach(function(item) {
    const imgEl = document.createElement('img');
    const iconCode = escapeHTML(item.weather[0].icon);
    imgEl.src = 'https://openweathermap.org/img/wn/' + iconCode + '.png';
    imgEl.width = 32;
    imgEl.title = item.weather[0].main;
    iconsDiv.appendChild(imgEl);
  });

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
  container.textContent = '';
  const loadingDiv = createElementWithText('div', 'Loading world capitals weather...', 'w-100 text-center py-3');
  container.appendChild(loadingDiv);
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
        container.textContent = '';
        const errDiv = createElementWithText('div', 'Failed to load capitals data.', 'w-100 text-center py-3 text-danger');
        container.appendChild(errDiv);
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
    filtered = allCapitals.filter(function(c) {
      return c.capital[0].toLowerCase().includes(term) || c.name.common.toLowerCase().includes(term);
    });
  }
  const totalCapitals = filtered.length;
  const start = (page - 1) * perPage;
  const end = start + perPage;

  if (filtered.length === 0) {
    const emptyDiv = createElementWithText('div', 'No results found.', 'w-100 text-center py-3 text-muted');
    container.appendChild(emptyDiv);
    document.getElementById('capitalsCount').textContent = '';
    return;
  }

  const scrollWrapper = createElementWithText('div', '', 'horizontal-scroll');
  const sliced = filtered.slice(start, end);

  sliced.forEach(function(country) {
    const lat = country.latlng[0];
    const lon = country.latlng[1];
    const capital = country.capital[0];
    const countryName = country.name.common;
    const cacheKey = capital + ',' + countryName;

    const card = document.createElement('div');
    card.className = 'frosted nearby-card p-2 text-center capital-card mx-1';
    card.dataset.capital = capital;
    card.dataset.country = countryName;
    card.dataset.lat = lat;
    card.dataset.lon = lon;

    const title = createElementWithText('div', capital + ', ' + countryName, 'fw-bold');
    const weatherDiv = createElementWithText('div', 'Loading...', 'capital-weather');
    weatherDiv.id = 'capitalWeather-' + cacheKey.replace(/\s/g, '_');

    const btnWrapper = createElementWithText('div', '', 'mt-2');
    const mapBtn = document.createElement('a');
    mapBtn.className = 'btn btn-sm btn-outline-success';
    mapBtn.href = 'map.html?lat=' + lat + '&lon=' + lon + '&name=' + encodeURIComponent(capital + ', ' + countryName);
    mapBtn.textContent = ' View on Map';

    const icon = document.createElement('i');
    icon.className = 'bi bi-geo-alt';
    mapBtn.prepend(icon);

    btnWrapper.appendChild(mapBtn);
    card.appendChild(title);
    card.appendChild(weatherDiv);
    card.appendChild(btnWrapper);
    scrollWrapper.appendChild(card);
  });

  container.appendChild(scrollWrapper);
  document.getElementById('capitalsCount').textContent = 'Showing ' + (start + sliced.length) + ' of ' + totalCapitals + ' capitals';

  sliced.forEach(function(country) {
    const lat = country.latlng[0];
    const lon = country.latlng[1];
    const capital = country.capital[0];
    const countryName = country.name.common;
    const cacheKey = capital + ',' + countryName;
    const weatherDiv = document.getElementById('capitalWeather-' + cacheKey.replace(/\s/g, '_'));
    if (!weatherDiv) return;

    const updateDiv = function(weather) {
      weatherDiv.textContent = Math.round(weather.main.temp) + '°C, ' + weather.weather[0].main + ' ';
      const img = document.createElement('img');
      img.src = 'https://openweathermap.org/img/wn/' + escapeHTML(weather.weather[0].icon) + '.png';
      img.width = 32;
      weatherDiv.appendChild(img);
    };

    if (capitalsWeatherCache[cacheKey]) {
      updateDiv(capitalsWeatherCache[cacheKey]);
    } else {
      fetchWeatherApi('/weather', { lat: lat, lon: lon })
        .then(function(weather) {
          capitalsWeatherCache[cacheKey] = weather;
          updateDiv(weather);
        })
        .catch(function() {
          weatherDiv.textContent = '';
          const errSpan = createElementWithText('span', 'Failed to load', 'text-danger');
          weatherDiv.appendChild(errSpan);
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
    const paginationWrapper = createElementWithText('div', '', 'd-flex justify-content-center mt-2 gap-2');
    if (page > 1) {
      const prevBtn = createElementWithText('button', 'Previous', 'btn btn-sm btn-outline-primary');
      prevBtn.id = 'prevCapitals';
      prevBtn.onclick = function() {
        fetchAllCapitalsWeather(page - 1, perPage, document.getElementById('capitalSearch').value);
      };
      paginationWrapper.appendChild(prevBtn);
    }
    if (end < totalCapitals) {
      const nextBtn = createElementWithText('button', 'Next', 'btn btn-sm btn-outline-primary');
      nextBtn.id = 'nextCapitals';
      nextBtn.onclick = function() {
        fetchAllCapitalsWeather(page + 1, perPage, document.getElementById('capitalSearch').value);
      };
      paginationWrapper.appendChild(nextBtn);
    }
    container.appendChild(paginationWrapper);
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
      const modalBody = document.getElementById('capitalModalBody');
      modalBody.textContent = '';

      const h5 = createElementWithText('h5', capital + ', ' + country);
      const imgDiv = document.createElement('div');
      const img = document.createElement('img');
      img.src = 'https://openweathermap.org/img/wn/' + escapeHTML(weather.weather[0].icon) + '.png';
      img.width = 48;
      imgDiv.appendChild(img);

      const tempDiv = createElementWithText('div', Math.round(weather.main.temp) + '°C (' + weather.weather[0].main + ')');
      const humDiv = createElementWithText('div', 'Humidity: ' + weather.main.humidity + '%');
      const pressDiv = createElementWithText('div', 'Pressure: ' + weather.main.pressure + ' hPa');
      const windDiv = createElementWithText('div', 'Wind: ' + formatWindSpeed(weather.wind.speed));
      const cloudDiv = createElementWithText('div', 'Clouds: ' + weather.clouds.all + '%');
      const visDiv = createElementWithText('div', 'Visibility: ' + (weather.visibility / 1000) + ' km');

      modalBody.appendChild(h5);
      modalBody.appendChild(imgDiv);
      modalBody.appendChild(tempDiv);
      modalBody.appendChild(humDiv);
      modalBody.appendChild(pressDiv);
      modalBody.appendChild(windDiv);
      modalBody.appendChild(cloudDiv);
      modalBody.appendChild(visDiv);

      new bootstrap.Modal(document.getElementById('capitalModal')).show();
    })
    .catch(function() {
      if (typeof showToast === 'function') showToast('Failed to load capital weather details', 'error');
    });
}
