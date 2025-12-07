import { AuthenticationService } from '../../../main/services/authenticationService';
import axios from 'axios';
import { logger } from '../../../main/utils/logger';

jest.mock('axios');
jest.mock('../../../main/utils/logger');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AuthenticationService', () => {
  let authService: AuthenticationService;
  const mockBackendUrl = 'http://localhost:8080';

  beforeEach(() => {
    authService = new AuthenticationService(mockBackendUrl);
    jest.clearAllMocks();
  });

  describe('validateEmail', () => {
    it('should validate email successfully', async () => {
      // Given
      const email = 'test@example.com';
      const mockResponse = {
        data: {
          valid: true,
          message: 'Email is valid',
        },
        status: 200,
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      // When
      const result = await authService.validateEmail(email);

      // Then
      expect(result.valid).toBe(true);
      expect(result.message).toBe('Email is valid');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${mockBackendUrl}/api/auth/validate-email`,
        { email },
        expect.any(Object)
      );
    });

    it('should handle invalid email', async () => {
      // Given
      const email = 'invalid-email';
      const mockError = {
        response: {
          status: 400,
          data: {
            error: 'Invalid email format',
          },
        },
      };
      mockedAxios.post.mockRejectedValue(mockError);

      // When/Then
      await expect(authService.validateEmail(email)).rejects.toThrow('Invalid email format');
    });

    it('should handle rate limiting (429)', async () => {
      // Given
      const email = 'test@example.com';
      const mockError = {
        response: {
          status: 429,
          data: {
            message: 'Rate limit exceeded. Please try again later.',
            resetTime: '2025-12-07T15:30:00',
          },
          headers: {
            'retry-after': '900',
            'x-ratelimit-remaining': '0',
          },
        },
      };
      mockedAxios.post.mockRejectedValue(mockError);

      // When/Then
      await expect(authService.validateEmail(email)).rejects.toMatchObject({
        message: 'Rate limit exceeded. Please try again later.',
        statusCode: 429,
        retryAfter: '900',
      });
    });

    it('should handle network errors', async () => {
      // Given
      const email = 'test@example.com';
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      // When/Then
      await expect(authService.validateEmail(email)).rejects.toThrow('Network error');
    });

    it('should validate email with null check', async () => {
      // When/Then
      await expect(authService.validateEmail(null as any)).rejects.toThrow('Email is required');
    });

    it('should validate email with empty string check', async () => {
      // When/Then
      await expect(authService.validateEmail('')).rejects.toThrow('Email is required');
    });
  });

  describe('authenticate', () => {
    it('should authenticate successfully', async () => {
      // Given
      const email = 'test@example.com';
      const password = 'password123';
      const mockResponse = {
        data: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          message: 'Authentication successful',
        },
        status: 200,
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      // When
      const result = await authService.authenticate(email, password);

      // Then
      expect(result.token).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
      expect(result.message).toBe('Authentication successful');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${mockBackendUrl}/api/auth/authenticate`,
        { email, password },
        expect.any(Object)
      );
    });

    it('should handle invalid credentials', async () => {
      // Given
      const email = 'test@example.com';
      const password = 'wrongpassword';
      const mockError = {
        response: {
          status: 401,
          data: {
            error: 'Invalid password',
          },
        },
      };
      mockedAxios.post.mockRejectedValue(mockError);

      // When/Then
      await expect(authService.authenticate(email, password)).rejects.toThrow('Invalid password');
    });

    it('should handle user not found', async () => {
      // Given
      const email = 'nonexistent@example.com';
      const password = 'password123';
      const mockError = {
        response: {
          status: 404,
          data: {
            error: 'User not found',
          },
        },
      };
      mockedAxios.post.mockRejectedValue(mockError);

      // When/Then
      await expect(authService.authenticate(email, password)).rejects.toThrow('User not found');
    });

    it('should handle rate limiting during authentication', async () => {
      // Given
      const email = 'test@example.com';
      const password = 'password123';
      const mockError = {
        response: {
          status: 429,
          data: {
            message: 'Rate limit exceeded. Please try again later.',
          },
          headers: {
            'retry-after': '900',
          },
        },
      };
      mockedAxios.post.mockRejectedValue(mockError);

      // When/Then
      await expect(authService.authenticate(email, password)).rejects.toMatchObject({
        message: 'Rate limit exceeded. Please try again later.',
        statusCode: 429,
      });
    });

    it('should validate required fields', async () => {
      // When/Then
      await expect(authService.authenticate('', 'password')).rejects.toThrow('Email is required');
      await expect(authService.authenticate('test@example.com', '')).rejects.toThrow(
        'Password is required'
      );
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      // Given
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
      const mockResponse = {
        data: {
          message: 'Logout successful',
        },
        status: 200,
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      // When
      const result = await authService.logout(token);

      // Then
      expect(result.message).toBe('Logout successful');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${mockBackendUrl}/api/auth/logout`,
        { token },
        expect.any(Object)
      );
    });

    it('should handle logout without token', async () => {
      // When/Then
      await expect(authService.logout('')).rejects.toThrow('Token is required');
    });

    it('should handle invalid token during logout', async () => {
      // Given
      const token = 'invalid-token';
      const mockError = {
        response: {
          status: 401,
          data: {
            error: 'Invalid token',
          },
        },
      };
      mockedAxios.post.mockRejectedValue(mockError);

      // When/Then
      await expect(authService.logout(token)).rejects.toThrow('Invalid token');
    });
  });
});
