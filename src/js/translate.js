import { fetchTranslate } from './api.js';
import { applyDirection, getStoredLanguage, storeLanguage, isSupportedLanguage } from './i18n.js';

const CACHE_PREFIX = 'weatherhub:tr:';
const listeners = new Set();

let currentLang = 'en';

function cacheKey(text, target) {
  return `${CACHE_PREFIX}${target}:${text}`;
}

function readCache(text, target) {
  try {
    return sessionStorage.getItem(cacheKey(text, target));
  } catch {
    return null;
  }
}

function writeCache(text, target, value) {
  try {
    sessionStorage.setItem(cacheKey(text, target), value);
  } catch {
    // Quota exceeded or storage disabled: translation still works, just uncached.
  }
}

export function getCurrentLanguage() {
  return currentLang;
}

export function onLanguageChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Translates one string or an array of strings, serving cached entries locally
 * and only sending the misses upstream.
 */
export async function translate(text, targetLang) {
  const target = isSupportedLanguage(targetLang) ? targetLang : 'en';
  const isBatch = Array.isArray(text);
  const items = isBatch ? text : [text];

  if (target === 'en') return isBatch ? items : items[0];

  const results = new Array(items.length);
  const missingIndexes = [];
  const missingTexts = [];

  items.forEach((item, index) => {
    const value = String(item ?? '');
    if (value.trim() === '') {
      results[index] = value;
      return;
    }
    const cached = readCache(value, target);
    if (cached !== null) {
      results[index] = cached;
    } else {
      missingIndexes.push(index);
      missingTexts.push(value);
    }
  });

  if (missingTexts.length === 0) {
    return isBatch ? results : results[0];
  }

  try {
    const data = await fetchTranslate(missingTexts, target);
    const translations = data?.data?.translations || [];

    missingIndexes.forEach((targetIndex, i) => {
      const translated = translations[i]?.translatedText;
      const original = missingTexts[i];
      if (typeof translated === 'string' && translated.length) {
        results[targetIndex] = translated;
        writeCache(original, target, translated);
      } else {
        results[targetIndex] = original;
      }
    });
  } catch (error) {
    console.error('Translation failed:', error);
    // Falling back to the source text keeps the page readable.
    missingIndexes.forEach((targetIndex, i) => {
      results[targetIndex] = missingTexts[i];
    });
    throw Object.assign(error, { partial: isBatch ? results : results[0] });
  }

  return isBatch ? results : results[0];
}

/**
 * Legacy callback-style wrapper retained for existing call sites.
 */
export function translateText(text, targetLang, callback) {
  translate(text, targetLang)
    .then((result) => callback(result))
    .catch((error) => callback(error.partial ?? text));
}

function collectTranslatable(root) {
  const scope = root || document;
  return Array.from(scope.querySelectorAll('.translatable')).filter((el) => {
    if (!el.dataset.original) {
      const text = el.textContent.trim();
      if (!text) return false;
      el.dataset.original = el.textContent;
    }
    return true;
  });
}

/**
 * Applies the active language to every `.translatable` element in scope. Pass a
 * root element to translate content that was rendered after the initial load.
 */
export async function translateAll(targetLang = currentLang, root) {
  const elements = collectTranslatable(root);
  if (!elements.length) return;

  const originals = elements.map((el) => el.dataset.original);

  if (targetLang === 'en') {
    elements.forEach((el, i) => { el.textContent = originals[i]; });
    return;
  }

  try {
    const translated = await translate(originals, targetLang);
    elements.forEach((el, i) => {
      el.textContent = translated[i] || originals[i];
    });
  } catch (error) {
    const partial = error.partial;
    elements.forEach((el, i) => {
      el.textContent = (Array.isArray(partial) && partial[i]) || originals[i];
    });
  }
}

export async function setLanguage(code) {
  const target = isSupportedLanguage(code) ? code : 'en';
  currentLang = target;
  storeLanguage(target);
  applyDirection(target);
  await translateAll(target);
  listeners.forEach((listener) => {
    try {
      listener(target);
    } catch (error) {
      console.error('Language listener failed:', error);
    }
  });
}

export function initTranslation() {
  currentLang = getStoredLanguage();
  applyDirection(currentLang);

  const select = document.getElementById('languageSelect');
  if (select) {
    select.value = currentLang;
    select.addEventListener('change', (event) => setLanguage(event.target.value));
  }

  if (currentLang !== 'en') {
    translateAll(currentLang);
  }
}
