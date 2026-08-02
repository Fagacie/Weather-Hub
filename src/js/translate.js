import { fetchTranslate } from './api.js';

export function translateText(text, targetLang, callback) {
  if (!targetLang || targetLang === 'en') {
    callback(text);
    return;
  }

  fetchTranslate(text, targetLang)
    .then((data) => {
      if (data?.data?.translations) {
        if (Array.isArray(text)) {
          callback(data.data.translations.map((t) => t.translatedText));
        } else {
          callback(data.data.translations[0]?.translatedText || text);
        }
      } else {
        callback(text);
      }
    })
    .catch(() => callback(text));
}

export function translateAll(targetLang, callback) {
  const elements = document.querySelectorAll('.translatable');
  if (!elements.length) {
    if (callback) callback();
    return;
  }

  const texts = Array.from(elements).map((el) => {
    if (!el.dataset.original) {
      el.dataset.original = el.textContent;
    }
    return el.dataset.original;
  });

  translateText(texts, targetLang, (translated) => {
    if (Array.isArray(translated)) {
      elements.forEach((el, i) => {
        el.textContent = translated[i] || el.dataset.original;
      });
    }
    if (callback) callback();
  });
}

export function initTranslation() {
  const select = document.getElementById('languageSelect');
  if (!select) return;

  select.addEventListener('change', function () {
    translateAll(this.value);
  });
}
