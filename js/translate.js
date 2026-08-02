// Translate utility using backend proxy

function translateText(text, targetLang, callback) {
  if (!targetLang || targetLang === 'en') {
    callback(text);
    return;
  }

  const endpoint = typeof buildWeatherApiUrl === 'function'
    ? buildWeatherApiUrl('/translate', {})
    : '/api/translate';

  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: text,
      target: targetLang
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data && data.data && data.data.translations) {
        if (Array.isArray(text)) {
          callback(data.data.translations.map(t => t.translatedText));
        } else {
          callback(data.data.translations[0] ? data.data.translations[0].translatedText : text);
        }
      } else {
        callback(text);
      }
    })
    .catch(() => callback(text));
}

function translateAll(targetLang, callback) {
  const elements = document.querySelectorAll('.translatable');
  if (!elements.length) {
    if (callback) callback();
    return;
  }

  const texts = Array.from(elements).map(el => {
    if (!el.dataset.original) {
      el.dataset.original = el.textContent;
    }
    return el.dataset.original;
  });

  translateText(texts, targetLang, translated => {
    if (Array.isArray(translated)) {
      elements.forEach((el, i) => {
        el.textContent = translated[i] || el.dataset.original;
      });
    }
    if (callback) callback();
  });
}

function initTranslation() {
  const select = document.getElementById('languageSelect');
  if (!select) return;

  select.addEventListener('change', function() {
    translateAll(this.value);
  });
}
