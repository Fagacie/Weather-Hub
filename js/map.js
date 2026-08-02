const GOOGLE_MAPS_API_KEY = (window.WEATHER_HUB_CONFIG && window.WEATHER_HUB_CONFIG.GOOGLE_MAPS_API_KEY) || "";

let map, marker, infowindow;

function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const lat = parseFloat(params.get('lat'));
  const lon = parseFloat(params.get('lon'));
  const name = params.get('name');
  if (!isNaN(lat) && !isNaN(lon)) {
    return { lat: lat, lon: lon, name: name || null };
  }
  return null;
}

function initMap() {
  const urlParams = getUrlParams();
  const defaultCenter = { lat: 5.3302, lng: 103.1408 };
  const center = urlParams ? { lat: urlParams.lat, lng: urlParams.lon } : defaultCenter;
  const zoom = urlParams ? 8 : 10;

  map = new google.maps.Map(document.getElementById('map'), {
    center: center,
    zoom: zoom
  });

  infowindow = new google.maps.InfoWindow();

  map.addListener('click', function(e) {
    placeMarker(e.latLng);
    fetchWeather(e.latLng.lat(), e.latLng.lng());
  });

  const input = document.getElementById('mapSearch');
  if (input && google.maps.places) {
    const searchBox = new google.maps.places.SearchBox(input);

    searchBox.addListener('places_changed', function() {
      const places = searchBox.getPlaces();
      if (places.length === 0) return;
      const place = places[0];
      if (!place.geometry || !place.geometry.location) return;
      map.setCenter(place.geometry.location);
      placeMarker(place.geometry.location);
      fetchWeather(place.geometry.location.lat(), place.geometry.location.lng());
    });
  }

  if (urlParams) {
    const location = new google.maps.LatLng(urlParams.lat, urlParams.lon);
    placeMarker(location);
    fetchWeather(urlParams.lat, urlParams.lon, urlParams.name);
    if (urlParams.name && input) {
      input.value = urlParams.name;
    }
    const routeInfo = document.getElementById('routeInfo');
    if (routeInfo) {
      routeInfo.textContent = 'Showing weather for ' + (urlParams.name || (urlParams.lat + ', ' + urlParams.lon));
    }
  }
}

function placeMarker(location) {
  if (marker) marker.setMap(null);
  marker = new google.maps.Marker({
    position: location,
    map: map
  });
}

function fetchWeather(lat, lon, displayName) {
  const url = typeof buildWeatherApiUrl === 'function'
    ? buildWeatherApiUrl('/weather', { lat: lat, lon: lon })
    : '/api/weather?lat=' + lat + '&lon=' + lon;

  fetch(url)
    .then(function(res) {
      return res.json().then(function(data) {
        if (!res.ok || (data.cod && Number(data.cod) !== 200)) {
          throw new Error(data.message || 'Weather data unavailable');
        }
        return data;
      });
    })
    .then(function(data) {
      const name = displayName || data.name;
      const windKmh = typeof formatWindSpeed === 'function' ? formatWindSpeed(data.wind.speed) : Math.round(data.wind.speed * 3.6) + ' km/h';

      const container = document.createElement('div');
      container.className = 'weather-popup';

      const titleEl = createElementWithText('strong', name);
      container.appendChild(titleEl);
      container.appendChild(document.createElement('br'));

      const weatherText = createElementWithText('span', data.weather[0].main + ', ' + Math.round(data.main.temp) + '°C');
      container.appendChild(weatherText);
      container.appendChild(document.createElement('br'));

      const humidityText = createElementWithText('span', 'Humidity: ' + data.main.humidity + '%');
      container.appendChild(humidityText);
      container.appendChild(document.createElement('br'));

      const windText = createElementWithText('span', 'Wind: ' + windKmh);
      container.appendChild(windText);

      infowindow.setContent(container);
      infowindow.open(map, marker);
    })
    .catch(function(err) {
      const errDiv = createElementWithText('div', err.message || 'Failed to load weather', 'weather-popup text-danger');
      infowindow.setContent(errDiv);
      infowindow.open(map, marker);
    });
}

function loadGoogleMaps() {
  if (!GOOGLE_MAPS_API_KEY) {
    const mapEl = document.getElementById('map');
    if (mapEl) {
      mapEl.textContent = '';
      const warnDiv = createElementWithText('div', 'Google Maps API key is not configured.', 'alert alert-warning m-3');
      mapEl.appendChild(warnDiv);
    }
    return;
  }

  window.weatherHubInitMap = initMap;
  const script = document.createElement('script');
  script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(GOOGLE_MAPS_API_KEY) + '&libraries=places&callback=weatherHubInitMap';
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

window.onload = loadGoogleMaps;
