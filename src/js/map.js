import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import { fetchCurrentWeather } from './api.js';
import { searchPlaces } from './providers/openMeteo.js';
import { formatWindSpeed, createElementWithText } from './utils.js';
import { getCurrentLanguage } from './translate.js';

const DEFAULT_CENTER = [5.3302, 103.1408];

// Leaflet resolves its default icons by relative URL, which breaks once Vite
// hashes the assets, so the bundled URLs are supplied explicitly.
const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

let map;
let marker;
let clickTimer = null;
let searchTimer = null;
let searchAbort = null;

function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const lat = parseFloat(params.get('lat'));
  const lon = parseFloat(params.get('lon'));
  const name = params.get('name');

  if (Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
    return { lat, lon, name: name || null };
  }
  return null;
}

function showMapError(message) {
  const mapEl = document.getElementById('map');
  if (!mapEl) return;
  mapEl.textContent = '';
  mapEl.appendChild(createElementWithText('div', message, 'alert alert-warning m-3'));
}

function buildWeatherPopup(data, displayName) {
  const condition = data?.weather?.[0] || {};
  const container = document.createElement('div');
  container.className = 'weather-popup';

  container.appendChild(createElementWithText('strong', displayName || data?.name || 'Selected location'));
  container.appendChild(document.createElement('br'));
  container.appendChild(createElementWithText(
    'span',
    `${condition.main || 'Unknown'}, ${Number.isFinite(data?.main?.temp) ? Math.round(data.main.temp) : '--'}°C`
  ));
  container.appendChild(document.createElement('br'));
  container.appendChild(createElementWithText('span', `Humidity: ${data?.main?.humidity ?? '--'}%`));
  container.appendChild(document.createElement('br'));
  container.appendChild(createElementWithText(
    'span',
    `Wind: ${Number.isFinite(data?.wind?.speed) ? formatWindSpeed(data.wind.speed) : '--'}`
  ));

  return container;
}

function placeMarker(lat, lon) {
  if (marker) {
    marker.setLatLng([lat, lon]);
  } else {
    marker = L.marker([lat, lon], { icon: defaultIcon }).addTo(map);
  }
  return marker;
}

async function showWeatherAt(lat, lon, displayName) {
  const pin = placeMarker(lat, lon);
  pin.bindPopup(createElementWithText('div', 'Loading weather...', 'weather-popup')).openPopup();

  try {
    const data = await fetchCurrentWeather({ lat, lon, lang: getCurrentLanguage() });
    pin.setPopupContent(buildWeatherPopup(data, displayName));
  } catch (error) {
    pin.setPopupContent(
      createElementWithText('div', error.message || 'Failed to load weather', 'weather-popup text-danger')
    );
  }
}

/**
 * Supersedes any in-flight lookup so fast typing cannot render stale results.
 */
function lookupPlaces(query) {
  searchAbort?.abort();
  searchAbort = new AbortController();
  return searchPlaces(query, { signal: searchAbort.signal });
}

function renderSuggestions(listEl, places) {
  listEl.textContent = '';

  if (!places.length) {
    listEl.style.display = 'none';
    return;
  }

  places.forEach((place) => {
    const item = createElementWithText('button', place.label, 'map-suggestion');
    item.type = 'button';
    item.addEventListener('click', () => {
      map.setView([place.lat, place.lon], 10);
      showWeatherAt(place.lat, place.lon, place.name);
      listEl.style.display = 'none';
      document.getElementById('mapSearch').value = place.label;
    });
    listEl.appendChild(item);
  });

  listEl.style.display = '';
}

function initSearch() {
  const input = document.getElementById('mapSearch');
  if (!input) return;

  const listEl = document.createElement('div');
  listEl.className = 'map-suggestions';
  listEl.style.display = 'none';
  input.insertAdjacentElement('afterend', listEl);

  input.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const query = input.value.trim();

    if (query.length < 3) {
      listEl.style.display = 'none';
      return;
    }

    searchTimer = setTimeout(async () => {
      try {
        renderSuggestions(listEl, await lookupPlaces(query));
      } catch {
        listEl.style.display = 'none';
      }
    }, 500);
  });

  document.addEventListener('click', (event) => {
    if (!listEl.contains(event.target) && event.target !== input) {
      listEl.style.display = 'none';
    }
  });
}

export function loadMap() {
  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  try {
    const urlParams = getUrlParams();
    const center = urlParams ? [urlParams.lat, urlParams.lon] : DEFAULT_CENTER;

    map = L.map(mapEl).setView(center, urlParams ? 8 : 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Debounced so dragging or double-clicking cannot queue overlapping requests.
    map.on('click', (event) => {
      clearTimeout(clickTimer);
      const { lat, lng } = event.latlng;
      clickTimer = setTimeout(() => showWeatherAt(lat, lng), 200);
    });

    initSearch();

    if (urlParams) {
      showWeatherAt(urlParams.lat, urlParams.lon, urlParams.name);
      const input = document.getElementById('mapSearch');
      if (urlParams.name && input) input.value = urlParams.name;

      const routeInfo = document.getElementById('routeInfo');
      if (routeInfo) {
        routeInfo.textContent = `Showing weather for ${urlParams.name || `${urlParams.lat}, ${urlParams.lon}`}`;
      }
    }
  } catch (error) {
    console.error('Map failed to initialise:', error);
    showMapError(error.message || 'The map failed to load.');
  }
}
