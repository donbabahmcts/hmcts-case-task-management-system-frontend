import { requireAuth, redirectIfAuthenticated, clearAuth } from '../../main/middleware/auth';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../../main/utils/logger';

jest.mock('../../main/utils/logger');

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockRequest = {
      session: {
        id: 'test-session-id',
        cookie: {} as any,
        regenerate: jest.fn(),
        destroy: jest.fn(),
        reload: jest.fn(),
        resetMaxAge: jest.fn(),
        save: jest.fn(),
        touch: jest.fn(),
      } as any,
      path: '/test',
    };
    mockResponse = {
      redirect: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('requireAuth', () => {
    it('should call next() when token exists in session', () => {
      // Given
      mockRequest.session = { token: 'valid-jwt-token' };

      // When
      requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Then
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.redirect).not.toHaveBeenCalled();
    });

    it('should redirect to /auth/login when token does not exist', () => {
      // Given
      mockRequest.session = {};

      // When
      requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Then
      expect(mockResponse.redirect).toHaveBeenCalledWith('/auth/login');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should redirect to /auth/login when session is undefined', () => {
      // Given
      mockRequest.session = undefined;

      // When
      requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Then
      expect(mockResponse.redirect).toHaveBeenCalledWith('/auth/login');
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('redirectIfAuthenticated', () => {
    it('should redirect to /tasks when token exists in session', () => {
      // Given
      mockRequest.session = { token: 'valid-jwt-token' };

      // When
      redirectIfAuthenticated(mockRequest as Request, mockResponse as Response, mockNext);

      // Then
      expect(mockResponse.redirect).toHaveBeenCalledWith('/tasks');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() when token does not exist', () => {
      // Given
      mockRequest.session = {};

      // When
      redirectIfAuthenticated(mockRequest as Request, mockResponse as Response, mockNext);

      // Then
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.redirect).not.toHaveBeenCalled();
    });

    it('should call next() when session is undefined', () => {
      // Given
      mockRequest.session = undefined;

      // When
      redirectIfAuthenticated(mockRequest as Request, mockResponse as Response, mockNext);

      // Then
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.redirect).not.toHaveBeenCalled();
    });
  });

  describe('clearAuth', () => {
    it('should clear token and email from session', () => {
      // Given
      mockRequest.session = {
        token: 'jwt-token',
        email: 'test@example.com',
      };

      // When
      clearAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Then
      expect(mockRequest.session?.token).toBeUndefined();
      expect(mockRequest.session?.email).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next() even when session is undefined', () => {
      // Given
      mockRequest.session = undefined;

      // When
      clearAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Then
      expect(mockNext).toHaveBeenCalled();
    });

    it('should preserve other session data', () => {
      // Given
      mockRequest.session = {
        token: 'jwt-token',
        email: 'test@example.com',
        tempEmail: 'temp@example.com',
      } as any;

      // When
      clearAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Then
      expect(mockRequest.session?.token).toBeUndefined();
      expect(mockRequest.session?.email).toBeUndefined();
      expect((mockRequest.session as any)?.tempEmail).toBe('temp@example.com');
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
