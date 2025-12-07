import { logger } from '../utils/logger';

import config from 'config';

interface RequiredConfig {
  path: string;
  type: 'string' | 'number' | 'boolean';
  description: string;
}

const requiredConfigs: RequiredConfig[] = [
  { path: 'services.backend.url', type: 'string', description: 'Backend service URL' },
  { path: 'services.backend.timeout', type: 'number', description: 'Backend service timeout' },
  { path: 'server.port', type: 'number', description: 'Server port' },
  { path: 'logging.level', type: 'string', description: 'Logging level' },
];

export function validateEnvironment(): void {
  const errors: string[] = [];

  requiredConfigs.forEach(({ path, type, description }) => {
    if (!config.has(path)) {
      errors.push(`Missing required configuration: ${path} (${description})`);
      return;
    }

    const value = config.get(path);
    const actualType = typeof value;

    if (actualType !== type) {
      errors.push(`Invalid type for ${path}: expected ${type}, got ${actualType} (${description})`);
    }

    // Additional validations
    if (type === 'string' && (!value || (value as string).trim() === '')) {
      errors.push(`Configuration ${path} cannot be empty (${description})`);
    }

    if (type === 'number' && (isNaN(value as number) || (value as number) <= 0)) {
      errors.push(`Configuration ${path} must be a positive number (${description})`);
    }
  });

  // Environment-specific validations
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (nodeEnv === 'production') {
    const backendUrl = config.get<string>('services.backend.url');

    if (backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1')) {
      errors.push('Backend URL should not point to localhost in production');
    }

    if (backendUrl.startsWith('http://') && !backendUrl.includes('localhost')) {
      logger.warn('Backend URL is using HTTP in production. HTTPS is recommended.');
    }
  }

  if (errors.length > 0) {
    logger.error('Environment validation failed', { errors });
    // eslint-disable-next-line no-console
    errors.forEach(error => console.error(`❌ ${error}`));
    throw new Error(`Environment validation failed: ${errors.length} error(s) found`);
  }

  logger.info('Environment validation passed', {
    nodeEnv,
    backendUrl: config.get<string>('services.backend.url'),
  });
}
