import { Request, Response, NextFunction } from 'express';

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

interface RequestLog {
  timestamps: number[];
}

export function createRateLimiter(options: RateLimiterOptions) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests from this IP, please try again later.',
    keyGenerator = (req: Request) => req.ip || req.socket.remoteAddress || '127.0.0.1'
  } = options;

  const hits = new Map<string, RequestLog>();

  // Cleanup expired entries periodically (every 5 minutes)
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, log] of hits.entries()) {
      const validTimestamps = log.timestamps.filter((ts) => now - ts < windowMs);
      if (validTimestamps.length === 0) {
        hits.delete(key);
      } else {
        log.timestamps = validTimestamps;
      }
    }
  }, 5 * 60 * 1000);

  // Unref timer so Node process doesn't hang on exit
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    let log = hits.get(key);
    if (!log) {
      log = { timestamps: [] };
      hits.set(key, log);
    }

    // Filter timestamps within current window
    log.timestamps = log.timestamps.filter((ts) => now - ts < windowMs);

    if (log.timestamps.length >= maxRequests) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      return res.status(429).json({
        error: message,
        retryAfterSeconds: Math.ceil(windowMs / 1000)
      });
    }

    log.timestamps.push(now);
    next();
  };
}

// Pre-configured rate limiters
export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 15,
  message: 'Too many authentication attempts. Please wait 1 minute before trying again.'
});

export const transactionRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,
  message: 'Too many transaction requests submitted. Please wait a moment.'
});

export const generalApiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 120,
  message: 'API rate limit exceeded. Please slow down your requests.'
});
