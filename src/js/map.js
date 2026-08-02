import { getConfig } from './config.js';
import { buildWeatherApiUrl, parseWeatherResponse, fetchPublicConfig } from './api.js';
import { formatWindSpeed, createElementWithText } from './utils.js';

let map;
let marker;
let infowindow;

function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const lat = parseFloat(params.get('lat'));
  const lon = parseFloat(params.get('lon'));
  const name = params.get('name');
  if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
    return { lat, lon, name: name || null };
  }
  return null;
}

function initMap() {
  const urlParams = getUrlParams();
  const defaultCenter = { lat: 5.3302, lng: 103.1408 };
  const center = urlParams ? { lat: urlParams.lat, lng: urlParams.lon } : defaultCenter;
  const zoom = urlParams ? 8 : 10;

  map = new google.maps.Map(document.getElementById('map'), { center, zoom });
  infowindow = new google.maps.InfoWindow();

  map.addListener('click', (e) => {
    placeMarker(e.latLng);
    fetchMapWeather(e.latLng.lat(), e.latLng.lng());
  });

  const input = document.getElementById('mapSearch');
  if (input && google.maps.places) {
    const searchBox = new google.maps.places.SearchBox(input);
    searchBox.addListener('places_changed', () => {
      const places = searchBox.getPlaces();
      if (!places.length || !places[0].geometry?.location) return;
      const place = places[0];
      map.setCenter(place.geometry.location);
      placeMarker(place.geometry.location);
      fetchMapWeather(place.geometry.location.lat(), place.geometry.location.lng());
    });
  }

  if (urlParams) {
    const location = new google.maps.LatLng(urlParams.lat, urlParams.lon);
    placeMarker(location);
    fetchMapWeather(urlParams.lat, urlParams.lon, urlParams.name);
    if (urlParams.name && input) input.value = urlParams.name;
    const routeInfo = document.getElementById('routeInfo');
    if (routeInfo) {
      routeInfo.textContent = `Showing weather for ${urlParams.name || `${urlParams.lat}, ${urlParams.lon}`}`;
    }
  }
}

function placeMarker(location) {
  if (marker) marker.setMap(null);
  marker = new google.maps.Marker({ position: location, map });
}

function fetchMapWeather(lat, lon, displayName) {
  fetch(buildWeatherApiUrl('/weather', { lat, lon }))
    .then(parseWeatherResponse)
    .then((data) => {
      const name = displayName || data.name;
      const container = document.createElement('div');
      container.className = 'weather-popup';
      container.appendChild(createElementWithText('strong', name));
      container.appendChild(document.createElement('br'));
      container.appendChild(createElementWithText('span', `${data.weather[0].main}, ${Math.round(data.main.temp)}°C`));
      container.appendChild(document.createElement('br'));
      container.appendChild(createElementWithText('span', `Humidity: ${data.main.humidity}%`));
      container.appendChild(document.createElement('br'));
      container.appendChild(createElementWithText('span', `Wind: ${formatWindSpeed(data.wind.speed)}`));
      infowindow.setContent(container);
      infowindow.open(map, marker);
    })
    .catch((err) => {
      infowindow.setContent(createElementWithText('div', err.message || 'Failed to load weather', 'weather-popup text-danger'));
      infowindow.open(map, marker);
    });
}

function injectMapsScript(apiKey) {
  window.weatherHubInitMap = initMap;
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&callback=weatherHubInitMap`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

function showMapsConfigError(mapEl, message) {
  if (!mapEl) return;
  mapEl.textContent = '';
  mapEl.appendChild(createElementWithText('div', message, 'alert alert-warning m-3'));
}

export async function loadGoogleMaps() {
  const mapEl = document.getElementById('map');
  let apiKey = getConfig().GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    try {
      const config = await fetchPublicConfig();
      apiKey = config.googleMapsApiKey || '';
    } catch {
      showMapsConfigError(mapEl, 'Unable to load map configuration from the server.');
      return;
    }
  }

  if (!apiKey) {
    showMapsConfigError(mapEl, 'Google Maps is not configured. Set GOOGLE_MAPS_API_KEY as a Firebase Functions secret.');
    return;
  }

  injectMapsScript(apiKey);
}
