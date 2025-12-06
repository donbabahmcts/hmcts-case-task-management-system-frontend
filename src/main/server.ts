#!/usr/bin/env node
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';
import * as util from 'util';

// Polyfill for config library compatibility with Node.js 18+
// The config 3.3.9 library uses util.isRegExp which was removed in Node.js 18
if (!(util as unknown as { isRegExp?: (val: unknown) => boolean }).isRegExp) {
  (util as unknown as { isRegExp: (val: unknown) => boolean }).isRegExp = (val: unknown): boolean =>
    val instanceof RegExp;
}

import { app } from './app';
import { logger } from './utils/logger';

import config from 'config';

let httpsServer: https.Server | null = null;

// used by shutdownCheck in readinessChecks
app.locals.shutdown = false;

const port: number = config.has('server.port')
  ? config.get<number>('server.port')
  : parseInt(process.env.PORT || '3100', 10);
const shutdownTimeout: number = config.has('server.shutdownTimeout')
  ? config.get<number>('server.shutdownTimeout')
  : 10000;

if (app.locals.ENV === 'development') {
  const sslDirectory = path.join(__dirname, 'resources', 'localhost-ssl');
  const sslOptions = {
    cert: fs.readFileSync(path.join(sslDirectory, 'localhost.crt')),
    key: fs.readFileSync(path.join(sslDirectory, 'localhost.key')),
  };
  httpsServer = https.createServer(sslOptions, app);
  httpsServer.listen(port, () => {
    logger.info(`Application started: https://localhost:${port}`);
  });
} else {
  app.listen(port, () => {
    logger.info('Application started: http://localhost:' + port);
  });
}

function gracefulShutdownHandler(signal: string): void {
  logger.warn(`Caught ${signal}, gracefully shutting down. Setting readiness to DOWN`);
  // stop the server from accepting new connections
  app.locals.shutdown = true;

  setTimeout(() => {
    logger.info('Shutting down application');
    // Close server if it's running
    httpsServer?.close(() => {
      logger.info('HTTPS server closed');
      process.exit(0);
    });

    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 5000);
  }, shutdownTimeout);
}

process.on('SIGINT', gracefulShutdownHandler);
process.on('SIGTERM', gracefulShutdownHandler);
