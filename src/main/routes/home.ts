import { logger } from '../utils/logger';

import axios from 'axios';
import config from 'config';
import { Application, Request, Response } from 'express';

interface ServiceConfig {
  url: string;
  timeout: number;
}

export default function (app: Application): void {
  app.get('/', async (req: Request, res: Response) => {
    try {
      // Check backend health - use a simple request to verify backend is responding
      const backendConfig = config.get<ServiceConfig>('services.backend');
      // Try to reach any public endpoint just to verify backend is alive
      await axios.get(`${backendConfig.url}/api/auth/validate-email`, {
        timeout: backendConfig.timeout || 5000,
        validateStatus: () => true, // Accept any status code - we just want to know it's reachable
      });
      logger.info('Backend is healthy', { url: backendConfig.url });
      res.render('home', {
        backendStatus: 'UP',
        backendUrl: backendConfig.url,
        email: req.session?.email || null,
      });
    } catch (error) {
      logger.warn('Backend health check failed', { error });
      res.render('home', {
        backendStatus: 'DOWN',
        backendUrl: config.get<ServiceConfig>('services.backend').url,
        email: req.session?.email || null,
      });
    }
  });
}
