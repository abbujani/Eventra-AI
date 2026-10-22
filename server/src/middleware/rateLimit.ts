import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

/**
 * Rate limiter for expensive AI endpoints. Keeps the canonical error shape so
 * clients render a consistent message.
 */
export const aiRateLimiter = rateLimit({
  windowMs: config.aiRateLimitWindowMs,
  limit: config.aiRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many AI requests. Please try again shortly.',
    },
  },
});
