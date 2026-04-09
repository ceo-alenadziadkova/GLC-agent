import { next } from '@vercel/functions';

/**
 * Vercel Routing Middleware — runs before static/SPA response.
 * Security headers only; SPA rewrites stay in vercel.json.
 */
export default function middleware(_request: Request) {
  return next({
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|assets/).*)'],
};
