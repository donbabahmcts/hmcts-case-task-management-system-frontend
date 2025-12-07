import config from 'config';

// Mock config before importing logger
jest.mock('config');
const mockedConfig = config as jest.Mocked<typeof config>;

// Set default config before importing
mockedConfig.has.mockReturnValue(false);

import { logger } from '../../main/utils/logger';

describe('Logger', () => {
  let consoleSpy: {
    debug: jest.SpyInstance;
    info: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    // Setup console spies
    consoleSpy = {
      debug: jest.spyOn(console, 'debug').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    };
  });

  afterEach(() => {
    // Restore all spies
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
    jest.clearAllMocks();
  });

  describe('with default configuration', () => {
    it('should log info messages', () => {
      logger.info('Test info message');
      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      const logOutput = consoleSpy.info.mock.calls[0][0];
      expect(logOutput).toContain('"level":"info"');
      expect(logOutput).toContain('"message":"Test info message"');
    });

    it('should log info messages with metadata', () => {
      const metadata = { userId: 123, action: 'login' };
      logger.info('User logged in', metadata);

      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      const logOutput = consoleSpy.info.mock.calls[0][0];
      expect(logOutput).toContain('"message":"User logged in"');
      expect(logOutput).toContain('"meta"');
      expect(logOutput).toContain('"userId":123');
      expect(logOutput).toContain('"action":"login"');
    });

    it('should log warning messages', () => {
      logger.warn('Test warning');
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      const logOutput = consoleSpy.warn.mock.calls[0][0];
      expect(logOutput).toContain('"level":"warn"');
      expect(logOutput).toContain('"message":"Test warning"');
    });

    it('should log error messages', () => {
      logger.error('Test error');
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      const logOutput = consoleSpy.error.mock.calls[0][0];
      expect(logOutput).toContain('"level":"error"');
      expect(logOutput).toContain('"message":"Test error"');
    });

    it('should not log debug messages with default info level', () => {
      logger.debug('Debug message');
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it('should include timestamp in log messages', () => {
      logger.info('Test message');
      const logOutput = consoleSpy.info.mock.calls[0][0];
      expect(logOutput).toContain('"timestamp"');
      expect(logOutput).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('metadata handling', () => {
    it('should handle complex metadata objects', () => {
      const metadata = {
        user: { id: 1, name: 'John' },
        action: 'create',
        timestamp: new Date('2025-12-07'),
      };

      logger.info('Complex metadata', metadata);
      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      const logOutput = consoleSpy.info.mock.calls[0][0];
      expect(logOutput).toContain('"meta"');
    });

    it('should handle null metadata', () => {
      logger.info('Message with null', null);
      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
    });

    it('should handle undefined metadata', () => {
      logger.info('Message with undefined', undefined);
      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
    });

    it('should handle array metadata', () => {
      const metadata = [1, 2, 3, 4, 5];
      logger.info('Array metadata', metadata);
      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      const logOutput = consoleSpy.info.mock.calls[0][0];
      expect(logOutput).toContain('[1,2,3,4,5]');
    });
  });

  describe('log levels', () => {
    it('should respect info log level (default)', () => {
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('output format', () => {
    it('should format messages as JSON by default', () => {
      logger.info('Test message');
      const logOutput = consoleSpy.info.mock.calls[0][0];

      // Should be valid JSON
      expect(() => JSON.parse(logOutput)).not.toThrow();
      const parsed = JSON.parse(logOutput);
      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('Test message');
      expect(parsed.timestamp).toBeDefined();
    });

    it('should include metadata in JSON output', () => {
      const metadata = { userId: 123, name: 'John' };
      logger.info('User action', metadata);
      const logOutput = consoleSpy.info.mock.calls[0][0];

      const parsed = JSON.parse(logOutput);
      expect(parsed.meta).toEqual(metadata);
    });
  });
});
