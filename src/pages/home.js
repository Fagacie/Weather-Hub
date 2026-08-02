import '../styles/main.css';
import { mountNav } from '../js/components/nav.js';
import { initNav } from '../js/nav.js';
import { initTranslation } from '../js/translate.js';
import {
  initThemeToggle,
  initNavScroll,
  initForecastTabs
} from '../js/ui.js';
import {
  loadHomeWeather,
  fetchWeatherAndForecast,
  getLocationName,
  setLocationName,
  initCapitalsSearch
} from '../js/weather.js';
import { randomFunFact } from '../js/utils.js';

mountNav({ active: 'home', showTheme: true });
initNav();
initTranslation();
initThemeToggle();
initNavScroll();
initForecastTabs();
initCapitalsSearch();

const funFactEl = document.getElementById('funFactText');
const funFactCard = document.getElementById('funFactCard');

function setRandomFunFact() {
  if (funFactEl) funFactEl.textContent = randomFunFact();
}

setRandomFunFact();
if (funFactCard) funFactCard.onclick = setRandomFunFact;

document.getElementById('refreshWeatherBtn')?.addEventListener('click', () => {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition((pos) => {
    getLocationName(pos.coords.latitude, pos.coords.longitude, setLocationName);
    fetchWeatherAndForecast(pos.coords.latitude, pos.coords.longitude);
  });
});

loadHomeWeather();
