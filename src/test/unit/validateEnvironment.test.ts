import config from 'config';

// Mock dependencies
jest.mock('config');
jest.mock('../../main/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { logger } from '../../main/utils/logger';
import { validateEnvironment } from '../../main/config/validateEnvironment';

const mockedConfig = config as jest.Mocked<typeof config>;

describe('validateEnvironment', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    // Reset NODE_ENV to development for most tests
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('successful validation', () => {
    beforeEach(() => {
      mockedConfig.has.mockImplementation((path: string) => {
        return ['services.backend.url', 'services.backend.timeout', 'server.port', 'logging.level'].includes(path);
      });

      mockedConfig.get.mockImplementation((path: string) => {
        const configs: Record<string, unknown> = {
          'services.backend.url': 'http://localhost:4000',
          'services.backend.timeout': 10000,
          'server.port': 3100,
          'logging.level': 'info',
        };
        return configs[path];
      });
    });

    it('should pass validation with all required configs present', () => {
      expect(() => validateEnvironment()).not.toThrow();
      expect(logger.info).toHaveBeenCalledWith(
        'Environment validation passed',
        expect.objectContaining({
          nodeEnv: 'development',
          backendUrl: 'http://localhost:4000',
        })
      );
    });

    it('should not log any errors when validation passes', () => {
      validateEnvironment();
      expect(logger.error).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('missing configuration', () => {
    it('should fail when backend URL is missing', () => {
      mockedConfig.has.mockImplementation((path: string) => {
        return path !== 'services.backend.url';
      });

      mockedConfig.get.mockImplementation((path: string) => {
        if (path === 'services.backend.timeout') {return 10000;}
        if (path === 'server.port') {return 3100;}
        if (path === 'logging.level') {return 'info';}
        return undefined;
      });

      expect(() => validateEnvironment()).toThrow('Environment validation failed');
      expect(logger.error).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Missing required configuration: services.backend.url')
      );
    });

    it('should fail when multiple configs are missing', () => {
      mockedConfig.has.mockReturnValue(false);

      expect(() => validateEnvironment()).toThrow('Environment validation failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Environment validation failed',
        expect.objectContaining({
          errors: expect.arrayContaining([expect.stringContaining('Missing required configuration')]),
        })
      );
      expect(consoleErrorSpy.mock.calls.length).toBeGreaterThan(1);
    });

    it('should report all missing configurations', () => {
      mockedConfig.has.mockReturnValue(false);

      expect(() => validateEnvironment()).toThrow();

      const errorCalls = consoleErrorSpy.mock.calls;
      expect(errorCalls.some(call => call[0].includes('services.backend.url'))).toBeTruthy();
      expect(errorCalls.some(call => call[0].includes('services.backend.timeout'))).toBeTruthy();
      expect(errorCalls.some(call => call[0].includes('server.port'))).toBeTruthy();
      expect(errorCalls.some(call => call[0].includes('logging.level'))).toBeTruthy();
    });
  });

  describe('type validation', () => {
    beforeEach(() => {
      mockedConfig.has.mockReturnValue(true);
    });

    it('should check types of configuration values', () => {
      mockedConfig.get.mockImplementation((path: string) => {
        if (path === 'services.backend.url') {return 12345 as unknown as string;}
        if (path === 'services.backend.timeout') {return 10000;}
        if (path === 'server.port') {return 3100;}
        if (path === 'logging.level') {return 'info';}
        return undefined;
      });

      // The validation should detect type mismatch
      expect(() => validateEnvironment()).toThrow();
    });

    it('should fail when port is not a number', () => {
      mockedConfig.get.mockImplementation((path: string) => {
        if (path === 'services.backend.url') {return 'http://localhost:4000';}
        if (path === 'services.backend.timeout') {return 10000;}
        if (path === 'server.port') {return '3100';} // Wrong type
        if (path === 'logging.level') {return 'info';}
        return undefined;
      });

      expect(() => validateEnvironment()).toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid type for server.port: expected number, got string')
      );
    });

    it('should fail when timeout is not a number', () => {
      mockedConfig.get.mockImplementation((path: string) => {
        if (path === 'services.backend.url') {return 'http://localhost:4000';}
        if (path === 'services.backend.timeout') {return '10000';} // Wrong type
        if (path === 'server.port') {return 3100;}
        if (path === 'logging.level') {return 'info';}
        return undefined;
      });

      expect(() => validateEnvironment()).toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid type for services.backend.timeout: expected number, got string')
      );
    });
  });

  describe('value validation', () => {
    beforeEach(() => {
      mockedConfig.has.mockReturnValue(true);
    });

    it('should fail when string config is empty', () => {
      mockedConfig.get.mockImplementation((path: string) => {
        if (path === 'services.backend.url') {return '';}
        if (path === 'services.backend.timeout') {return 10000;}
        if (path === 'server.port') {return 3100;}
        if (path === 'logging.level') {return 'info';}
        return undefined;
      });

      expect(() => validateEnvironment()).toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('services.backend.url cannot be empty'));
    });

    it('should fail when string config is only whitespace', () => {
      mockedConfig.get.mockImplementation((path: string) => {
        if (path === 'services.backend.url') {return '   ';}
        if (path === 'services.backend.timeout') {return 10000;}
        if (path === 'server.port') {return 3100;}
        if (path === 'logging.level') {return 'info';}
        return undefined;
      });

      expect(() => validateEnvironment()).toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('services.backend.url cannot be empty'));
    });

    it('should fail when number config is not positive', () => {
      mockedConfig.get.mockImplementation((path: string) => {
        if (path === 'services.backend.url') {return 'http://localhost:4000';}
        if (path === 'services.backend.timeout') {return -1000;} // Invalid
        if (path === 'server.port') {return 3100;}
        if (path === 'logging.level') {return 'info';}
        return undefined;
      });

      expect(() => validateEnvironment()).toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('services.backend.timeout must be a positive number')
      );
    });

    it('should fail when number config is zero', () => {
      mockedConfig.get.mockImplementation((path: string) => {
        if (path === 'services.backend.url') {return 'http://localhost:4000';}
        if (path === 'services.backend.timeout') {return 10000;}
        if (path === 'server.port') {return 0;} // Invalid
        if (path === 'logging.level') {return 'info';}
        return undefined;
      });

      expect(() => validateEnvironment()).toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('server.port must be a positive number'));
    });

    it('should fail when number config is NaN', () => {
      mockedConfig.get.mockImplementation((path: string) => {
        if (path === 'services.backend.url') {return 'http://localhost:4000';}
        if (path === 'services.backend.timeout') {return NaN;} // Invalid
        if (path === 'server.port') {return 3100;}
        if (path === 'logging.level') {return 'info';}
        return undefined;
      });

      expect(() => validateEnvironment()).toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('services.backend.timeout must be a positive number')
      );
    });
  });

  describe('production environment validation', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      mockedConfig.has.mockReturnValue(true);
    });

    it('should fail when backend URL points to localhost in production', () => {
      mockedConfig.get.mockImplementation((path: string) => {
        if (path === 'services.backend.url') {return 'http://localhost:4000';}
        if (path === 'services.backend.timeout') {return 10000;}
        if (path === 'server.port') {return 3100;}
        if (path === 'logging.level') {return 'info';}
        return undefined;
      });

      expect(() => validateEnvironment()).toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Backend URL should not point to localhost in production')
      );
    });

    it('should fail when backend URL points to 127.0.0.1 in production', () => {
      mockedConfig.get.mockImplementation((path: string) => {
        if (path === 'services.backend.url') {return 'http://127.0.0.1:4000';}
        if (path === 'services.backend.timeout') {return 10000;}
        if (path === 'server.port') {return 3100;}
        if (path === 'logging.level') {return 'info';}
        return undefined;
      });

      expect(() => validateEnvironment()).toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Backend URL should not point to localhost in production')
      );
    });

    it('should warn when using HTTP in production for non-localhost URLs', () => {
      mockedConfig.get.mockImplementation((path: string) => {
        if (path === 'services.backend.url') {return 'http://api.example.com';}
        if (path === 'services.backend.timeout') {return 10000;}
        if (path === 'server.port') {return 3100;}
        if (path === 'logging.level') {return 'info';}
        return undefined;
      });

      validateEnvironment();
      expect(logger.warn).toHaveBeenCalledWith('Backend URL is using HTTP in production. HTTPS is recommended.');
    });

    it('should pass with HTTPS URL in production', () => {
      mockedConfig.get.mockImplementation((path: string) => {
        if (path === 'services.backend.url') {return 'https://api.example.com';}
        if (path === 'services.backend.timeout') {return 10000;}
        if (path === 'server.port') {return 3100;}
        if (path === 'logging.level') {return 'info';}
        return undefined;
      });

      expect(() => validateEnvironment()).not.toThrow();
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Environment validation passed',
        expect.objectContaining({
          nodeEnv: 'production',
          backendUrl: 'https://api.example.com',
        })
      );
    });
  });

  describe('error message format', () => {
    it('should include error count in error message', () => {
      mockedConfig.has.mockReturnValue(false);

      expect(() => validateEnvironment()).toThrow(/Environment validation failed: \d+ error\(s\) found/);
    });

    it('should log all errors before throwing', () => {
      mockedConfig.has.mockReturnValue(false);

      try {
        validateEnvironment();
      } catch {
        // Expected to throw
      }

      expect(logger.error).toHaveBeenCalledWith(
        'Environment validation failed',
        expect.objectContaining({
          errors: expect.any(Array),
        })
      );
    });
  });
});
