const WEATHER_API_BASE_URL = (window.WEATHER_HUB_CONFIG && window.WEATHER_HUB_CONFIG.WEATHER_API_BASE_URL) || '/api';
const GOOGLE_MAPS_API_KEY = (window.WEATHER_HUB_CONFIG && window.WEATHER_HUB_CONFIG.GOOGLE_MAPS_API_KEY) || "";

function buildWeatherApiUrl(endpoint, params) {
  const query = new URLSearchParams(params);
  const base = WEATHER_API_BASE_URL.replace(/\/$/, '');
  return base + endpoint + '?' + query.toString();
}

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

  if (urlParams) {
    const location = new google.maps.LatLng(urlParams.lat, urlParams.lon);
    placeMarker(location);
    fetchWeather(urlParams.lat, urlParams.lon, urlParams.name);
    if (urlParams.name) {
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
  fetch(buildWeatherApiUrl('/weather', { lat: lat, lon: lon }))
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
      const windKmh = Math.round(data.wind.speed * 3.6);
      const content =
        '<div class="weather-popup">' +
        '<strong>' + name + '</strong><br>' +
        data.weather[0].main + ', ' + Math.round(data.main.temp) + '°C<br>' +
        'Humidity: ' + data.main.humidity + '%<br>' +
        'Wind: ' + windKmh + ' km/h' +
        '</div>';
      infowindow.setContent(content);
      infowindow.open(map, marker);
    })
    .catch(function(err) {
      infowindow.setContent('<div class="weather-popup text-danger">' + (err.message || 'Failed to load weather') + '</div>');
      infowindow.open(map, marker);
    });
}

function loadGoogleMaps() {
  if (!GOOGLE_MAPS_API_KEY) {
    const mapEl = document.getElementById('map');
    if (mapEl) {
      mapEl.innerHTML = '<div class="alert alert-warning m-3">Google Maps API key is not configured.</div>';
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
