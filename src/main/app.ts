import * as path from 'path';

import { HTTPError } from './HttpError';
import { Nunjucks } from './modules/nunjucks';
import { logger } from './utils/logger';

import * as bodyParser from 'body-parser';
import config from 'config';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import express, { NextFunction, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { glob } from 'glob';
import helmet from 'helmet';
import favicon from 'serve-favicon';

const { setupDev } = require('./development');

const env = process.env.NODE_ENV || 'development';
const developmentMode = env === 'development';

export const app = express();
app.locals.ENV = env;

// Security: Disable Express signature
app.disable('x-powered-by');

// Security: Helmet for security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// Security: Rate limiting
const limiter = rateLimit({
  windowMs: config.has('rateLimiting.windowMs') ? config.get<number>('rateLimiting.windowMs') : 15 * 60 * 1000,
  max: config.has('rateLimiting.max') ? config.get<number>('rateLimiting.max') : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.',
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path });
    res.status(429).render('error', {
      message: 'Too many requests, please try again later.',
      error: {},
    });
  },
});
app.use(limiter);

new Nunjucks(developmentMode).enableFor(app);

app.use(favicon(path.join(__dirname, '/public/assets/images/favicon.ico')));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());

// CSRF Protection
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: env === 'production',
    sameSite: 'strict',
  },
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use(csrfProtection as any);

app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: env === 'production' ? '1d' : 0,
    etag: true,
  })
);

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-cache, max-age=0, must-revalidate, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

glob
  .sync(__dirname + '/routes/**/*.+(ts|js)')
  .map(filename => require(filename))
  .forEach(route => route.default(app));

setupDev(app, developmentMode);

// 404 handler - must come before error handler
app.use((req: Request, res: Response) => {
  logger.warn('Route not found', { path: req.path, method: req.method, ip: req.ip });
  res.status(404).render('not-found', {
    message: 'Page not found',
  });
});

// Error handler
app.use((err: HTTPError, req: Request, res: Response, next: NextFunction) => {
  void next;

  // Log error with context
  logger.error('Application error', {
    error: err.message,
    stack: env === 'development' ? err.stack : undefined,
    status: err.status,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Handle CSRF errors specifically
  if (err.code === 'EBADCSRFTOKEN') {
    logger.warn('CSRF token validation failed', { ip: req.ip, path: req.path });
    return res.status(403).render('error', {
      message: 'Form submission failed. Please refresh the page and try again.',
      error: {},
    });
  }

  // Sanitize error message for production
  const sanitizedMessage = env === 'development' ? err.message : 'An error occurred';
  const status = err.status || 500;

  res.locals.message = sanitizedMessage;
  res.locals.error = env === 'development' ? err : {};
  res.status(status);
  res.render('error');
});
