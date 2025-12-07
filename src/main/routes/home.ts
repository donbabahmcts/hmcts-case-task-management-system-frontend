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
      // Check backend health
      const backendConfig = config.get<ServiceConfig>('services.backend');
      const response = await axios.get(`${backendConfig.url}/health`, {
        timeout: backendConfig.timeout,
      });
      logger.info('Backend is healthy', { status: response.data.status });
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
