import '../styles/main.css';
import { mountNav } from '../js/components/nav.js';
import { initNav } from '../js/nav.js';
import { initTranslation } from '../js/translate.js';
import { initNavScroll } from '../js/ui.js';
import { loadGoogleMaps } from '../js/map.js';

mountNav({ active: 'map' });
initNav();
initTranslation();
initNavScroll();
loadGoogleMaps();
