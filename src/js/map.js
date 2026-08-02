import { getConfig } from './config.js';
import { fetchWeatherApi, fetchPublicConfig } from './api.js';
import { formatWindSpeed, createElementWithText } from './utils.js';
import { getCurrentLanguage } from './translate.js';

const MAPS_CALLBACK = '__weatherHubMapsReady';

let map;
let marker;
let infoWindow;
let AdvancedMarkerElement;
let clickTimer = null;

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

/**
 * Google calls this global when the key is invalid, unauthorised for this
 * referrer, or billing is disabled. Without it the map just renders blank.
 */
window.gm_authFailure = () => {
  showMapError(
    'Google Maps rejected this API key. Check that the key is valid, billing is enabled, ' +
    'and this domain is allowed under the key\'s HTTP referrer restrictions.'
  );
};

function loadMapsSdk(apiKey) {
  if (window.google?.maps?.importLibrary) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      key: apiKey,
      v: 'weekly',
      loading: 'async',
      libraries: 'maps,marker,places',
      callback: MAPS_CALLBACK
    });

    window[MAPS_CALLBACK] = () => resolve();

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => reject(new Error('The Google Maps script could not be loaded.'));
    document.head.appendChild(script);
  });
}

function placeMarker(position) {
  if (marker) marker.map = null;
  marker = new AdvancedMarkerElement({ map, position });
}

async function fetchMapWeather(lat, lon, displayName) {
  try {
    const data = await fetchWeatherApi('/weather', { lat, lon, lang: getCurrentLanguage() });
    const condition = data?.weather?.[0] || {};
    const name = displayName || data?.name || 'Selected location';

    const container = document.createElement('div');
    container.className = 'weather-popup';
    container.appendChild(createElementWithText('strong', name));
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

    infoWindow.setContent(container);
    infoWindow.open({ map, anchor: marker });
  } catch (error) {
    infoWindow.setContent(
      createElementWithText('div', error.message || 'Failed to load weather', 'weather-popup text-danger')
    );
    infoWindow.open({ map, anchor: marker });
  }
}

/**
 * `google.maps.places.SearchBox` was deprecated in March 2025; the replacement
 * is a web component, so the plain input is swapped for it.
 */
async function initPlaceSearch(placesLibrary) {
  const input = document.getElementById('mapSearch');
  if (!input || !placesLibrary?.PlaceAutocompleteElement) return null;

  const autocomplete = new placesLibrary.PlaceAutocompleteElement();
  autocomplete.id = 'mapSearch';
  autocomplete.className = 'map-search-input';
  input.replaceWith(autocomplete);

  const onSelect = async (event) => {
    const prediction = event.placePrediction || event.detail?.placePrediction;
    if (!prediction) return;

    const place = prediction.toPlace();
    await place.fetchFields({ fields: ['location', 'displayName'] });
    if (!place.location) return;

    const position = { lat: place.location.lat(), lng: place.location.lng() };
    map.setCenter(position);
    map.setZoom(10);
    placeMarker(position);
    fetchMapWeather(position.lat, position.lng, place.displayName);
  };

  autocomplete.addEventListener('gmp-select', onSelect);
  return autocomplete;
}

async function initMap(mapId) {
  const { Map, InfoWindow } = await google.maps.importLibrary('maps');
  const markerLibrary = await google.maps.importLibrary('marker');
  const placesLibrary = await google.maps.importLibrary('places');

  // `Marker` was deprecated in February 2024; AdvancedMarkerElement needs a mapId.
  AdvancedMarkerElement = markerLibrary.AdvancedMarkerElement;

  const urlParams = getUrlParams();
  const center = urlParams
    ? { lat: urlParams.lat, lng: urlParams.lon }
    : { lat: 5.3302, lng: 103.1408 };

  map = new Map(document.getElementById('map'), {
    center,
    zoom: urlParams ? 8 : 10,
    mapId: mapId || 'DEMO_MAP_ID'
  });

  infoWindow = new InfoWindow();

  // Rapid clicks would otherwise queue overlapping weather requests.
  map.addListener('click', (event) => {
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => {
      placeMarker(event.latLng);
      fetchMapWeather(event.latLng.lat(), event.latLng.lng());
    }, 200);
  });

  await initPlaceSearch(placesLibrary);

  if (urlParams) {
    const position = { lat: urlParams.lat, lng: urlParams.lon };
    placeMarker(position);
    fetchMapWeather(urlParams.lat, urlParams.lon, urlParams.name);

    const routeInfo = document.getElementById('routeInfo');
    if (routeInfo) {
      routeInfo.textContent = `Showing weather for ${urlParams.name || `${urlParams.lat}, ${urlParams.lon}`}`;
    }
  }
}

export async function loadGoogleMaps() {
  let apiKey = getConfig().GOOGLE_MAPS_API_KEY;
  let mapId = '';

  if (!apiKey) {
    try {
      const config = await fetchPublicConfig();
      apiKey = config.googleMapsApiKey || '';
      mapId = config.mapId || '';
    } catch (error) {
      showMapError(`Unable to load map configuration from the server. ${error.message}`);
      return;
    }
  }

  if (!apiKey) {
    showMapError('Google Maps is not configured. Set GOOGLE_MAPS_API_KEY as a Firebase Functions secret.');
    return;
  }

  try {
    await loadMapsSdk(apiKey);
    await initMap(mapId);
  } catch (error) {
    console.error('Google Maps failed to initialise:', error);
    showMapError(error.message || 'Google Maps failed to load.');
  }
}
