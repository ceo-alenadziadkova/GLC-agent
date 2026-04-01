import rateLimit from 'express-rate-limit';
import type { AuthRequest } from './auth.js';

/**
 * Rate limiter for audit creation: max 5 audits per user per day.
 */
export const createAuditLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5,
  keyGenerator: (req) => (req as AuthRequest).userId ?? req.ip ?? 'unknown',
  message: {
    error: 'Too many audits created. Maximum 5 per day.',
    retry_after_hours: 24,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for pipeline operations: max 30 phase runs per hour.
 */
export const pipelineLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  keyGenerator: (req) => (req as AuthRequest).userId ?? req.ip ?? 'unknown',
  message: {
    error: 'Too many pipeline operations. Please wait before retrying.',
    retry_after_minutes: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limiter: 100 requests per minute.
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  keyGenerator: (req) => (req as AuthRequest).userId ?? req.ip ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Public free snapshot: limit abuse by IP (no auth).
 */
export const snapshotPublicLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    error: 'Too many snapshot requests from this address. Try again later.',
    retry_after_minutes: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Public intake token endpoints: 30 requests per hour by IP.
 * Generous enough for legitimate re-submissions and refreshes.
 */
export const intakePublicLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    error: 'Too many requests to this intake link. Try again later.',
    retry_after_minutes: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Authenticated client log ingest: max 120 entries per user per hour.
 */
export const logIngestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 120,
  keyGenerator: (req) => (req as AuthRequest).userId ?? req.ip ?? 'unknown',
  message: {
    error: 'Too many log events. Please wait before retrying.',
    retry_after_minutes: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});
