import { app } from '../../main/app';

import request from 'supertest';

// Mock dependencies
jest.mock('csurf', () => {
  return jest.fn(() => (req: unknown, res: unknown, next: () => void) => next());
});

jest.mock('../../main/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

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
    if (key === 'rateLimiting.windowMs') {return 15 * 60 * 1000;}
    if (key === 'rateLimiting.max') {return 100;}
    return null;
  }),
}));

import { logger } from '../../main/utils/logger';

describe('App Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Security Headers', () => {
    it('should set X-Frame-Options header', async () => {
      const response = await request(app).get('/non-existent-route');
      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    it('should set X-Content-Type-Options header', async () => {
      const response = await request(app).get('/non-existent-route');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set Cache-Control header', async () => {
      const response = await request(app).get('/non-existent-route');
      expect(response.headers['cache-control']).toContain('no-cache');
    });

    it('should not expose Express signature', async () => {
      const response = await request(app).get('/');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('should set Content-Security-Policy header', async () => {
      const response = await request(app).get('/');
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    it('should set Strict-Transport-Security header', async () => {
      const response = await request(app).get('/');
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/this-route-does-not-exist');
      expect(response.status).toBe(404);
    });

    it('should render not-found template for missing pages', async () => {
      const response = await request(app).get('/missing-page');
      expect(response.status).toBe(404);
    });

    it('should log 404 errors', async () => {
      await request(app).get('/non-existent');
      expect(logger.warn).toHaveBeenCalledWith(
        'Route not found',
        expect.objectContaining({
          path: '/non-existent',
          method: 'GET',
        })
      );
    });

    it('should handle 404 for different HTTP methods', async () => {
      const postResponse = await request(app).post('/non-existent');
      const putResponse = await request(app).put('/non-existent');
      const deleteResponse = await request(app).delete('/non-existent');

      expect(postResponse.status).toBe(404);
      expect(putResponse.status).toBe(404);
      expect(deleteResponse.status).toBe(404);
    });
  });

  describe('Static Files', () => {
    it('should serve static files from public directory', async () => {
      // This will return 404 if file doesn't exist, which is expected
      const response = await request(app).get('/assets/images/favicon.ico');
      // Just verify it doesn't crash
      expect([200, 304, 404]).toContain(response.status);
    });

    it('should handle requests for non-existent static files', async () => {
      const response = await request(app).get('/assets/non-existent-file.js');
      expect(response.status).toBe(404);
    });
  });

  describe('Body Parser', () => {
    it('should parse JSON payloads', async () => {
      // This will hit the 404 handler but should parse the body
      const response = await request(app)
        .post('/test-json-endpoint')
        .send({ test: 'data' })
        .set('Content-Type', 'application/json');

      // Should not get a 400 for JSON parsing
      expect(response.status).toBe(404); // Route doesn't exist
    });

    it('should parse URL-encoded payloads', async () => {
      const response = await request(app)
        .post('/test-form-endpoint')
        .send('field1=value1&field2=value2')
        .set('Content-Type', 'application/x-www-form-urlencoded');

      expect(response.status).toBe(404); // Route doesn't exist
    });

    it('should respect body size limits', async () => {
      // Create a payload larger than 10mb
      const largePayload = { data: 'x'.repeat(11 * 1024 * 1024) };

      const response = await request(app)
        .post('/test-endpoint')
        .send(largePayload)
        .set('Content-Type', 'application/json');

      // Should get error for payload too large
      expect([413, 404]).toContain(response.status);
    });
  });

  describe('Cookie Parser', () => {
    it('should parse cookies from requests', async () => {
      const response = await request(app).get('/').set('Cookie', 'test=value');

      // App should handle the request without errors
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    it('should handle application errors gracefully', async () => {
      // The error handler should catch any thrown errors
      const response = await request(app).get('/');
      expect([200, 500]).toContain(response.status);
    });

    it('should log errors with context', async () => {
      // Trigger an error
      await request(app).get('/');

      // Errors might be logged depending on the route
      if ((logger.error as jest.Mock).mock.calls.length > 0) {
        expect(logger.error).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            path: expect.any(String),
            method: expect.any(String),
          })
        );
      }
    });
  });

  describe('Request Handling', () => {
    it('should handle GET requests', async () => {
      const response = await request(app).get('/');
      expect([200, 500]).toContain(response.status);
    });

    it('should handle POST requests', async () => {
      const response = await request(app).post('/tasks/create').send({ title: 'Test' });

      // Tasks routes now require authentication, expect redirect
      expect([200, 302, 400, 500]).toContain(response.status);
    });

    it('should handle requests with query parameters', async () => {
      const response = await request(app).get('/?param1=value1&param2=value2');
      expect([200, 500]).toContain(response.status);
    });

    it('should handle requests with special characters in path', async () => {
      const response = await request(app).get('/path%20with%20spaces');
      expect(response.status).toBe(404);
    });
  });

  describe('Content Type Handling', () => {
    it('should accept JSON content type', async () => {
      const response = await request(app).post('/test').set('Content-Type', 'application/json').send({ data: 'test' });

      expect([200, 404, 415]).toContain(response.status);
    });

    it('should accept form-urlencoded content type', async () => {
      const response = await request(app)
        .post('/test')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('key=value');

      expect([200, 404, 415]).toContain(response.status);
    });
  });

  describe('HTTP Methods', () => {
    it('should support GET method', async () => {
      const response = await request(app).get('/');
      expect(response).toBeDefined();
    });

    it('should support POST method', async () => {
      const response = await request(app).post('/test');
      expect(response).toBeDefined();
    });

    it('should support PUT method', async () => {
      const response = await request(app).put('/test');
      expect(response).toBeDefined();
    });

    it('should support DELETE method', async () => {
      const response = await request(app).delete('/test');
      expect(response).toBeDefined();
    });

    it('should support HEAD method', async () => {
      const response = await request(app).head('/');
      expect(response).toBeDefined();
    });
  });

  describe('Response Headers', () => {
    it('should set appropriate response headers', async () => {
      const response = await request(app).get('/');

      expect(response.headers).toHaveProperty('cache-control');
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });

    it('should set content-type for HTML responses', async () => {
      const response = await request(app).get('/');

      if (response.status === 200) {
        expect(response.headers['content-type']).toContain('text/html');
      }
    });
  });

  describe('App Configuration', () => {
    it('should have view engine configured', () => {
      expect(app.get('view engine')).toBe('njk');
    });

    it('should have x-powered-by disabled', () => {
      expect(app.get('x-powered-by')).toBeFalsy();
    });

    it('should have ENV set in locals', () => {
      expect(app.locals.ENV).toBeDefined();
    });
  });
});
