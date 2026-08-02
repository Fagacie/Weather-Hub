import { getJson, ApiError } from './http.js';

const BASE_URL = 'https://api.mymemory.translated.net/get';

// MyMemory rejects q longer than 500 bytes and translates one string per
// request, so page-wide translation is fanned out with bounded concurrency.
const MAX_QUERY_LENGTH = 500;
const MAX_CONCURRENCY = 4;

function langPair(source, target) {
  return `${source}|${target}`;
}

async function translateOne(text, source, target, signal) {
  const params = new URLSearchParams({
    q: text.slice(0, MAX_QUERY_LENGTH),
    langpair: langPair(source, target)
  });

  const { response, data } = await getJson(`${BASE_URL}?${params.toString()}`, {
    provider: 'mymemory',
    signal,
    timeoutMs: 10000
  });

  // MyMemory reports quota problems in the body with HTTP 200.
  const status = Number(data?.responseStatus);
  if (!response.ok || status === 429) {
    throw new ApiError('Translation quota reached. Try again later.', {
      status: 429,
      provider: 'mymemory'
    });
  }

  if (status >= 400) {
    throw new ApiError(data?.responseDetails || 'Translation failed.', {
      status,
      provider: 'mymemory'
    });
  }

  const translated = data?.responseData?.translatedText;
  if (typeof translated !== 'string' || !translated.length) {
    throw new ApiError('Translation service returned an empty result.', { provider: 'mymemory' });
  }

  return translated;
}

/**
 * Runs tasks with a fixed worker pool so a page with many strings cannot open
 * dozens of simultaneous connections and trip MyMemory's rate limiting.
 */
async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
}

/**
 * Translates one string or an array. Individual failures fall back to the
 * source text so a partial outage degrades instead of blanking the page.
 */
export async function translateTexts(texts, source, target, { signal } = {}) {
  const items = Array.isArray(texts) ? texts : [texts];
  let firstError = null;

  const results = await mapWithConcurrency(items, MAX_CONCURRENCY, async (text) => {
    const value = String(text ?? '');
    if (value.trim() === '') return value;

    try {
      return await translateOne(value, source, target, signal);
    } catch (error) {
      if (!firstError) firstError = error;
      return value;
    }
  });

  if (firstError && results.every((value, i) => value === String(items[i] ?? ''))) {
    throw firstError;
  }

  return Array.isArray(texts) ? results : results[0];
}
