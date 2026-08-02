const DEFAULT_TIMEOUT_MS = 6000;
const DEFAULT_RETRIES = 1;

class UpstreamError extends Error {
  constructor(message, { status = 502, cause } = {}) {
    super(message);
    this.name = 'UpstreamError';
    this.status = status;
    this.cause = cause;
  }
}

function isRetryable(status) {
  return status >= 500 || status === 429;
}

function backoffMs(attempt) {
  // Exponential with jitter so concurrent instances do not retry in lockstep.
  return 200 * 2 ** attempt + Math.floor(Math.random() * 150);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Redacts key/appid query parameters so upstream URLs are safe to log.
 */
function safeUrl(url) {
  try {
    const parsed = new URL(url);
    for (const param of ['key', 'appid', 'apikey']) {
      if (parsed.searchParams.has(param)) parsed.searchParams.set(param, 'REDACTED');
    }
    return parsed.toString();
  } catch {
    return 'invalid-url';
  }
}

function logUpstream(level, service, fields) {
  const entry = JSON.stringify({ service, ...fields });
  if (level === 'error') console.error(entry);
  else console.warn(entry);
}

/**
 * Fetches an upstream API with a hard timeout, bounded retries on transient
 * failures, and structured logging. Resolves to { response, data }.
 */
async function fetchUpstream(url, options = {}) {
  const {
    service = 'upstream',
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    ...init
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const startedAt = Date.now();

    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs)
      });

      let data = null;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new UpstreamError('Upstream returned a malformed response', {
          status: 502,
          cause: parseError
        });
      }

      if (isRetryable(response.status) && attempt < retries) {
        logUpstream('warn', service, {
          event: 'retrying',
          status: response.status,
          attempt,
          url: safeUrl(url)
        });
        await sleep(backoffMs(attempt));
        continue;
      }

      return { response, data, durationMs: Date.now() - startedAt };
    } catch (error) {
      lastError = error;
      const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError';

      if (attempt < retries) {
        logUpstream('warn', service, {
          event: timedOut ? 'timeout' : 'network-error',
          attempt,
          message: error.message,
          url: safeUrl(url)
        });
        await sleep(backoffMs(attempt));
        continue;
      }

      logUpstream('error', service, {
        event: timedOut ? 'timeout-exhausted' : 'network-error-exhausted',
        attempts: attempt + 1,
        message: error.message,
        url: safeUrl(url)
      });

      throw new UpstreamError(
        timedOut ? `${service} timed out` : `${service} is unreachable`,
        { status: 504, cause: error }
      );
    }
  }

  throw new UpstreamError(`${service} is unreachable`, { status: 502, cause: lastError });
}

module.exports = { fetchUpstream, UpstreamError, safeUrl, logUpstream };
