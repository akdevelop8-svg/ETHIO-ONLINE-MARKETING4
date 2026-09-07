import { Request, Response, NextFunction } from 'express';
import { generateSecureToken } from '../services/auth/crypto.js';

export interface SecurityRequest extends Request {
  id?: string;
}

/**
 * Express Security Headers Middleware
 * Protects against XSS, clickjacking, MIME-sniffing, and protocol downgrade.
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Prevent MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Clickjacking protection
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // XSS protection for older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Enforce HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Download options for IE8+
  res.setHeader('X-Download-Options', 'noopen');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Basic CSP
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https:;"
  );

  next();
}

/**
 * Request Correlation ID Middleware
 * Attaches unique X-Request-ID to incoming requests and response headers.
 */
export function correlationIdMiddleware(req: SecurityRequest, res: Response, next: NextFunction) {
  const existingId = req.headers['x-request-id'] as string;
  const requestId = existingId || generateSecureToken('req');

  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

/**
 * Centralized Production-Safe Error Handler Middleware
 * Sanitizes errors so stack traces and internal secrets are never leaked.
 */
export function errorHandlerMiddleware(err: any, req: SecurityRequest, res: Response, next: NextFunction) {
  const requestId = req.id || 'unknown';
  const isProd = process.env.NODE_ENV === 'production';

  // Log error internally with correlation ID
  console.error(`[SERVER ERROR] [ReqID: ${requestId}]`, err?.stack || err?.message || err);

  const statusCode = err.status || err.statusCode || 500;
  const safeMessage = isProd
    ? 'An unexpected error occurred. Please contact EOM support if the problem persists.'
    : err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: safeMessage,
    requestId,
    ...(isProd ? {} : { details: err.message, stack: err.stack })
  });
}
