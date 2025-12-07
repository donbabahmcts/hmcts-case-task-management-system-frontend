import { logger } from '../utils/logger';

import { NextFunction, Request, Response } from 'express';

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Middleware to log all incoming requests
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });

  next();
}

/**
 * Middleware to validate content type for POST/PUT requests
 */
export function validateContentType(req: Request, res: Response, next: NextFunction): void {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('content-type');

    if (!contentType) {
      logger.warn('Request missing content-type header', { method: req.method, path: req.path });
      res.status(400).json({ error: 'Content-Type header is required' });
      return;
    }

    const validTypes = ['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data'];

    const isValid = validTypes.some(type => contentType.includes(type));

    if (!isValid) {
      logger.warn('Invalid content-type', { contentType, method: req.method, path: req.path });
      res.status(415).json({ error: 'Unsupported Media Type' });
      return;
    }
  }

  next();
}

/**
 * Middleware to prevent common attack patterns
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
}

/**
 * Middleware to detect and block suspicious requests
 */
export function detectSuspiciousActivity(req: Request, res: Response, next: NextFunction): void {
  const suspiciousPatterns = [
    /(\.\.|\/etc\/|\/bin\/)/i, // Path traversal
    /(union|select|insert|update|delete|drop|exec|script)/i, // SQL injection
    /(<script|javascript:|onerror=|onload=)/i, // XSS attempts
  ];

  const checkString = `${req.path}${JSON.stringify(req.query)}${JSON.stringify(req.body)}`;

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      logger.warn('Suspicious activity detected', {
        pattern: pattern.source,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(403).render('error', {
        message: 'Forbidden: Suspicious activity detected',
        error: {},
      });
      return;
    }
  }

  next();
}
