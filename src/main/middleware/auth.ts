import { logger } from '../utils/logger';

import { NextFunction, Request, Response } from 'express';

/**
 * Middleware to protect routes requiring authentication.
 * Checks for JWT token in session and redirects to login if not found.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.session?.token;

  if (!token) {
    logger.info('Unauthenticated access attempt', { path: req.path });
    res.redirect('/auth/login');
    return;
  }

  logger.info('Authenticated request', { path: req.path });
  next();
}

/**
 * Middleware to redirect authenticated users away from login pages.
 * Useful for login/register pages that shouldn't be accessible when already logged in.
 */
export function redirectIfAuthenticated(req: Request, res: Response, next: NextFunction): void {
  const token = req.session?.token;

  if (token) {
    logger.info('Authenticated user accessing auth page, redirecting', { path: req.path });
    res.redirect('/tasks');
    return;
  }

  next();
}

/**
 * Middleware to clear authentication session.
 */
export function clearAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session) {
    delete req.session.token;
    delete req.session.email;
  }
  next();
}
