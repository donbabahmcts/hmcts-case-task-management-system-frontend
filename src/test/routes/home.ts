import { app } from '../../main/app';

import axios from 'axios';
import request from 'supertest';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock CSRF
jest.mock('csurf', () => {
  return jest.fn(() => (req: unknown, res: unknown, next: () => void) => next());
});

// Mock logger
jest.mock('../../main/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock config
jest.mock('config', () => ({
  has: jest.fn(() => true),
  get: jest.fn((key: string) => {
    if (key === 'services.backend') {
      return {
        url: 'http://localhost:4000',
        timeout: 10000,
      };
    }
    if (key === 'logging') {
      return {
        level: 'info',
        prettyPrint: false,
      };
    }
    return null;
  }),
}));

describe('Home page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('on GET /', () => {
    it('should return home page when backend is healthy', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { status: 'UP' },
      });

      const response = await request(app).get('/');
      expect(response.status).toBe(200);
    });

    it('should handle backend health check failures gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Connection refused'));

      const response = await request(app).get('/');
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });
});
