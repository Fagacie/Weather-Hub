const buckets = new Map();

const LIMITS = {
  default: { windowMs: 60_000, max: 120 },
  translate: { windowMs: 60_000, max: 30 },
  contact: { windowMs: 60_000, max: 5 }
};

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}

function checkRateLimit(req, tier = 'default') {
  const config = LIMITS[tier] || LIMITS.default;
  const ip = getClientIp(req);
  const key = `${tier}:${ip}`;
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket || now - bucket.start >= config.windowMs) {
    bucket = { start: now, count: 0 };
    buckets.set(key, bucket);
  }

  bucket.count += 1;

  if (bucket.count > config.max) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((config.windowMs - (now - bucket.start)) / 1000)
    };
  }

  return { allowed: true };
}

function rateLimitMiddleware(tier = 'default') {
  return (req, res) => {
    const result = checkRateLimit(req, tier);
    if (!result.allowed) {
      res.set('Retry-After', String(result.retryAfterSec));
      res.status(429).json({
        message: `Too many requests. Try again in ${result.retryAfterSec} seconds.`
      });
      return false;
    }
    return true;
  };
}

module.exports = { rateLimitMiddleware, checkRateLimit };
