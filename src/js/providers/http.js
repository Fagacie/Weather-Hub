const DEFAULT_TIMEOUT_MS = 12000;

export class ApiError extends Error {
  constructor(message, { status = 0, provider = 'api' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.provider = provider;
  }
}

function combineSignals(signal, timeoutMs) {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  if (!signal) return timeoutSignal;
  return AbortSignal.any ? AbortSignal.any([signal, timeoutSignal]) : signal;
}

/**
 * Fetches JSON with a hard timeout. Network and timeout failures are converted
 * into ApiError so callers never have to inspect DOMException names.
 */
export async function getJson(url, { provider = 'api', signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  let response;

  try {
    response = await fetch(url, { signal: combineSignals(signal, timeoutMs) });
  } catch (error) {
    if (error.name === 'AbortError' && signal?.aborted) throw error;
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new ApiError('The request timed out. Please try again.', { provider });
    }
    throw new ApiError('Network error. Check your internet connection.', { provider });
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { response, data };
}
