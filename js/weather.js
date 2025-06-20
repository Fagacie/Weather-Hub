const OPENWEATHER_API_KEY = "d38fbf146ca1ece59539858de00b1e49"; // Replace with your key

function formatDate(dt) {
  return new Date(dt * 1000).toLocaleDateString(undefined, {weekday:'long', day:'2-digit', month:'short', year:'numeric'});
}

// --- Reverse Geocoding ---
function getLocationName(lat, lon, callback) {
  fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
    .then(res => res.json())
    .then(data => {
      if (data && data.display_name) {
        callback(data.display_name);
      } else {
        callback(null);
      }
    })
    .catch(() => callback(null));
}

// --- Main Weather + Forecast ---
function fetchWeatherAndForecast(lat, lon) {
  fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`)
    .then(res => res.json())
    .then(data => {
      // Display weather
      document.getElementById('weatherMain').textContent = data.weather[0].main;
      document.getElementById('weatherTemp').textContent = Math.round(data.main.temp) + "°C";
      document.getElementById('realFeel').textContent = Math.round(data.main.feels_like) + "°";
      document.getElementById('windSpeed').textContent = data.wind.speed + " km/hr";
      document.getElementById('weatherDate').textContent = formatDate(data.dt);
      fetchGif(data.weather[0].main); // From giphy.js

      fetchForecast(lat, lon);
    });
}

function fetchWeatherByCityAndForecast(city) {
  fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric`)
    .then(res => res.json())
    .then(data => {
      document.getElementById('weatherMain').textContent = data.weather[0].main;
      document.getElementById('weatherTemp').textContent = Math.round(data.main.temp) + "°C";
      document.getElementById('realFeel').textContent = Math.round(data.main.feels_like) + "°";
      document.getElementById('windSpeed').textContent = data.wind.speed + " km/hr";
      document.getElementById('weatherDate').textContent = formatDate(data.dt);
      fetchGif(data.weather[0].main); // From giphy.js

      fetchForecastByCity(city);
    });
}

function fetchForecast(lat, lon) {
  fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`)
    .then(res => res.json())
    .then(data => {
      // 24-hour forecast (next 8 intervals)
      let hourlyHtml = '';
      data.list.slice(0, 8).forEach(item => {
        hourlyHtml += `
          <div class="text-center">
            <div>${new Date(item.dt_txt).getHours()}:00</div>
            <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" width="40">
            <div>${Math.round(item.main.temp)}°C</div>
          </div>
        `;
      });
      document.getElementById('hourlyForecast').innerHTML = hourlyHtml;

      // 5-day forecast (one per day at 12:00)
      let forecastIcons = '';
      let days = {};
      data.list.forEach(item => {
        const date = item.dt_txt.split(' ')[0];
        const hour = item.dt_txt.split(' ')[1];
        if (hour === "12:00:00" && !days[date]) {
          days[date] = item;
        }
      });
      Object.values(days).slice(0, 5).forEach(item => {
        forecastIcons += `<img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" width="32" title="${item.weather[0].main}">`;
      });
      document.getElementById('forecastIcons').innerHTML = forecastIcons;

      // Chance of rain (from first forecast item)
      if (data.list && data.list.length) {
        const chanceOfRain = data.list[0].pop !== undefined ? Math.round(data.list[0].pop * 100) + "%" : "--";
        document.getElementById('rainChance').textContent = chanceOfRain;
      }

      // UV Index not available in this API, so show --
      document.getElementById('uvIndex').textContent = "--";
    });
}

function fetchForecastByCity(city) {
  fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric`)
    .then(res => res.json())
    .then(data => {
      let hourlyHtml = '';
      data.list.slice(0, 8).forEach(item => {
        hourlyHtml += `
          <div class="text-center">
            <div>${new Date(item.dt_txt).getHours()}:00</div>
            <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" width="40">
            <div>${Math.round(item.main.temp)}°C</div>
          </div>
        `;
      });
      document.getElementById('hourlyForecast').innerHTML = hourlyHtml;

      let forecastIcons = '';
      let days = {};
      data.list.forEach(item => {
        const date = item.dt_txt.split(' ')[0];
        const hour = item.dt_txt.split(' ')[1];
        if (hour === "12:00:00" && !days[date]) {
          days[date] = item;
        }
      });
      Object.values(days).slice(0, 5).forEach(item => {
        forecastIcons += `<img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" width="32" title="${item.weather[0].main}">`;
      });
      document.getElementById('forecastIcons').innerHTML = forecastIcons;

      if (data.list && data.list.length) {
        const chanceOfRain = data.list[0].pop !== undefined ? Math.round(data.list[0].pop * 100) + "%" : "--";
        document.getElementById('rainChance').textContent = chanceOfRain;
      }
      document.getElementById('uvIndex').textContent = "--";
    });
}

// --- Capitals Weather with Search, Pagination, and Modal ---
let allCapitals = []; // Store all capitals globally
let capitalsWeatherCache = {}; // Cache weather data for capitals
let searchTimeout = null;

function fetchAllCapitalsWeather(page = 1, perPage = 6, searchTerm = '') {
  const container = document.getElementById('nearbyPlaces');
  container.innerHTML = '<div class="w-100 text-center py-3">Loading world capitals weather...</div>';
  document.getElementById('capitalsCount').textContent = '';

  // Only fetch from API if allCapitals is empty
  if (allCapitals.length === 0) {
    fetch('https://restcountries.com/v3.1/all?fields=capital,latlng,name')
      .then(res => res.json())
      .then(countries => {
        allCapitals = countries.filter(
          country => country.capital && country.capital.length && country.latlng && country.latlng.length === 2
        );
        renderCapitals(page, perPage, searchTerm);
      })
      .catch(() => {
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
    filtered = allCapitals.filter(
      c =>
        c.capital[0].toLowerCase().includes(term) ||
        c.name.common.toLowerCase().includes(term)
    );
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
  // Use horizontal scroll container
  html += '<div class="horizontal-scroll">';
  filtered.slice(start, end).forEach((country, idx) => {
    const [lat, lon] = country.latlng;
    const capital = country.capital[0];
    const countryName = country.name.common;
    const cacheKey = `${capital},${countryName}`;
    html += `<div class="frosted nearby-card p-2 text-center capital-card mx-1" 
      data-capital="${capital}" 
      data-country="${countryName}"
      data-lat="${lat}" 
      data-lon="${lon}">
      <div class="fw-bold">${capital}, ${countryName}</div>
      <div class="capital-weather" id="capitalWeather-${cacheKey.replace(/\s/g,'_')}">Loading...</div>
      <div class="mt-2">
        <a href="map.html?lat=${lat}&lon=${lon}&name=${encodeURIComponent(capital + ', ' + countryName)}" class="btn btn-sm btn-outline-success">
          <i class="bi bi-geo-alt"></i> View on Map
        </a>
      </div>
    </div>`;
    shown++;
  });
  html += '</div>';
  container.innerHTML = html;
  document.getElementById('capitalsCount').textContent = `Showing ${start + shown} of ${totalCapitals} capitals`;

  // Fetch weather for visible cards only
  filtered.slice(start, end).forEach((country, idx) => {
    const [lat, lon] = country.latlng;
    const capital = country.capital[0];
    const countryName = country.name.common;
    const cacheKey = `${capital},${countryName}`;
    const weatherDiv = document.getElementById(`capitalWeather-${cacheKey.replace(/\s/g,'_')}`);
    if (capitalsWeatherCache[cacheKey]) {
      const weather = capitalsWeatherCache[cacheKey];
      weatherDiv.innerHTML = `${Math.round(weather.main.temp)}°C, ${weather.weather[0].main} <img src="https://openweathermap.org/img/wn/${weather.weather[0].icon}.png" width="32">`;
    } else {
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`)
        .then(res => res.json())
        .then(weather => {
          capitalsWeatherCache[cacheKey] = weather;
          weatherDiv.innerHTML = `${Math.round(weather.main.temp)}°C, ${weather.weather[0].main} <img src="https://openweathermap.org/img/wn/${weather.weather[0].icon}.png" width="32">`;
        })
        .catch(() => {
          weatherDiv.innerHTML = '<span class="text-danger">Failed to load</span>';
        });
    }
  });

  // Add click handlers for modal
  setTimeout(() => {
    document.querySelectorAll('.capital-card').forEach(card => {
      card.onclick = function(e) {
        if (e.target.tagName === 'A') return; // Don't trigger on map link
        showCapitalDetails(
          this.dataset.capital,
          this.dataset.country,
          this.dataset.lat,
          this.dataset.lon
        );
      };
    });
  }, 100);

  // Pagination controls
  let paginationHtml = '';
  if (totalCapitals > perPage) {
    paginationHtml += `<div class="d-flex justify-content-center mt-2 gap-2">`;
    if (page > 1) {
      paginationHtml += `<button class="btn btn-sm btn-outline-primary" id="prevCapitals">Previous</button>`;
    }
    if (end < totalCapitals) {
      paginationHtml += `<button class="btn btn-sm btn-outline-primary" id="nextCapitals">Next</button>`;
    }
    paginationHtml += `</div>`;
    setTimeout(() => {
      container.insertAdjacentHTML('beforeend', paginationHtml);
      if (page > 1) {
        document.getElementById('prevCapitals').onclick = () => fetchAllCapitalsWeather(page - 1, perPage, document.getElementById('capitalSearch').value);
      }
      if (end < totalCapitals) {
        document.getElementById('nextCapitals').onclick = () => fetchAllCapitalsWeather(page + 1, perPage, document.getElementById('capitalSearch').value);
      }
    }, 200);
  }
}

// Debounced search input
function debounceCapitalsSearch(fn, delay) {
  return function(...args) {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => fn.apply(this, args), delay);
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

// Show details in modal
function showCapitalDetails(capital, country, lat, lon) {
  fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`)
    .then(res => res.json())
    .then(weather => {
      const html = `
        <h5>${capital}, ${country}</h5>
        <div><img src="https://openweathermap.org/img/wn/${weather.weather[0].icon}.png" width="48"></div>
        <div><strong>${Math.round(weather.main.temp)}°C</strong> (${weather.weather[0].main})</div>
        <div>Humidity: ${weather.main.humidity}%</div>
        <div>Pressure: ${weather.main.pressure} hPa</div>
        <div>Wind: ${weather.wind.speed} m/s</div>
        <div>Clouds: ${weather.clouds.all}%</div>
        <div>Visibility: ${weather.visibility / 1000} km</div>
      `;
      document.getElementById('capitalModalBody').innerHTML = html;
      var modal = new bootstrap.Modal(document.getElementById('capitalModal'));
      modal.show();
    });
}