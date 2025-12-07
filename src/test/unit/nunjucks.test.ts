import { Nunjucks } from '../../main/modules/nunjucks';

import express from 'express';
import { Request, Response, NextFunction } from 'express';
import * as nunjucks from 'nunjucks';

jest.mock('nunjucks');

describe('Nunjucks Module', () => {
  let app: express.Express;
  let mockEnvironment: {
    configure: jest.Mock;
    addGlobal: jest.Mock;
    addFilter: jest.Mock;
  };

  beforeEach(() => {
    app = express();
    // Spy on app.use before it's called
    jest.spyOn(app, 'use');
    jest.spyOn(app, 'set');

    mockEnvironment = {
      configure: jest.fn(),
      addGlobal: jest.fn(),
      addFilter: jest.fn(),
    };

    (nunjucks.configure as jest.Mock).mockReturnValue(mockEnvironment);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with development mode true', () => {
      const nunjucksInstance = new Nunjucks(true);
      expect(nunjucksInstance.developmentMode).toBe(true);
    });

    it('should initialize with development mode false', () => {
      const nunjucksInstance = new Nunjucks(false);
      expect(nunjucksInstance.developmentMode).toBe(false);
    });
  });

  describe('enableFor', () => {
    it('should set view engine to njk', () => {
      const nunjucksInstance = new Nunjucks(false);
      const setSpy = jest.spyOn(app, 'set');

      nunjucksInstance.enableFor(app);

      expect(setSpy).toHaveBeenCalledWith('view engine', 'njk');
    });

    it('should configure nunjucks with correct path', () => {
      const nunjucksInstance = new Nunjucks(false);

      nunjucksInstance.enableFor(app);

      expect(nunjucks.configure).toHaveBeenCalled();
      const configPath = (nunjucks.configure as jest.Mock).mock.calls[0][0];
      expect(configPath).toContain('views');
    });

    it('should enable autoescape in development mode', () => {
      const nunjucksInstance = new Nunjucks(true);

      nunjucksInstance.enableFor(app);

      expect(nunjucks.configure).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          autoescape: true,
        })
      );
    });

    it('should enable autoescape in production mode', () => {
      const nunjucksInstance = new Nunjucks(false);

      nunjucksInstance.enableFor(app);

      expect(nunjucks.configure).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          autoescape: true,
        })
      );
    });

    it('should enable watch mode in development', () => {
      const nunjucksInstance = new Nunjucks(true);

      nunjucksInstance.enableFor(app);

      expect(nunjucks.configure).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          watch: true,
        })
      );
    });

    it('should disable watch mode in production', () => {
      const nunjucksInstance = new Nunjucks(false);

      nunjucksInstance.enableFor(app);

      expect(nunjucks.configure).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          watch: false,
        })
      );
    });

    it('should pass express app to nunjucks configuration', () => {
      const nunjucksInstance = new Nunjucks(false);

      nunjucksInstance.enableFor(app);

      expect(nunjucks.configure).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          express: app,
        })
      );
    });

    it('should add middleware to set pagePath in locals', () => {
      const nunjucksInstance = new Nunjucks(false);
      const useSpy = jest.spyOn(app, 'use');

      nunjucksInstance.enableFor(app);

      expect(useSpy).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should set pagePath from request path in middleware', () => {
      const nunjucksInstance = new Nunjucks(false);
      nunjucksInstance.enableFor(app);

      // Get the middleware function
      const middleware = (app.use as jest.Mock).mock.calls.find(
        call => typeof call[0] === 'function'
      )[0];

      const mockReq = { path: '/test/path' } as Request;
      const mockRes = { locals: {} } as Response;
      const mockNext = jest.fn() as NextFunction;

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.locals.pagePath).toBe('/test/path');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle different request paths', () => {
      const nunjucksInstance = new Nunjucks(false);
      nunjucksInstance.enableFor(app);

      const middleware = (app.use as jest.Mock).mock.calls.find(
        call => typeof call[0] === 'function'
      )[0];

      const testPaths = ['/', '/tasks', '/tasks/create', '/api/users/123'];

      testPaths.forEach(path => {
        const mockReq = { path } as Request;
        const mockRes = { locals: {} } as Response;
        const mockNext = jest.fn() as NextFunction;

        middleware(mockReq, mockRes, mockNext);

        expect(mockRes.locals.pagePath).toBe(path);
        expect(mockNext).toHaveBeenCalled();
      });
    });
  });

  describe('integration scenarios', () => {
    it('should work correctly for development environment', () => {
      const nunjucksInstance = new Nunjucks(true);
      nunjucksInstance.enableFor(app);

      expect(nunjucks.configure).toHaveBeenCalledWith(
        expect.any(String),
        {
          autoescape: true,
          watch: true,
          express: app,
        }
      );
    });

    it('should work correctly for production environment', () => {
      const nunjucksInstance = new Nunjucks(false);
      nunjucksInstance.enableFor(app);

      expect(nunjucks.configure).toHaveBeenCalledWith(
        expect.any(String),
        {
          autoescape: true,
          watch: false,
          express: app,
        }
      );
    });

    it('should be callable multiple times without errors', () => {
      const nunjucksInstance = new Nunjucks(true);

      expect(() => {
        nunjucksInstance.enableFor(app);
        nunjucksInstance.enableFor(app);
      }).not.toThrow();
    });
  });

  describe('security considerations', () => {
    it('should always enable autoescape to prevent XSS', () => {
      const devInstance = new Nunjucks(true);
      const prodInstance = new Nunjucks(false);

      devInstance.enableFor(app);
      prodInstance.enableFor(app);

      const calls = (nunjucks.configure as jest.Mock).mock.calls;
      calls.forEach(call => {
        expect(call[1].autoescape).toBe(true);
      });
    });
  });
});
