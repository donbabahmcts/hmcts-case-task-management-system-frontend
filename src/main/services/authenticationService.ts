import axios, { AxiosError } from 'axios';
import { logger } from '../utils/logger';

export interface ValidateEmailResponse {
  valid: boolean;
  message: string;
}

export interface AuthenticateResponse {
  token: string;
  message: string;
}

export interface LogoutResponse {
  message: string;
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public retryAfter?: string
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Service for handling authentication operations with the backend API.
 * Implements the domain logic for authentication workflow.
 */
export class AuthenticationService {
  private readonly backendUrl: string;
  private readonly timeout: number = 10000; // 10 seconds

  constructor(backendUrl: string) {
    this.backendUrl = backendUrl;
  }

  /**
   * Validates an email address (Step 1 of authentication).
   *
   * @param email - The email to validate
   * @returns Promise with validation result
   * @throws AuthenticationError if validation fails
   */
  async validateEmail(email: string): Promise<ValidateEmailResponse> {
    if (!email || email.trim() === '') {
      throw new Error('Email is required');
    }

    try {
      logger.info('Validating email', { email });
      const response = await axios.post<ValidateEmailResponse>(
        `${this.backendUrl}/api/auth/validate-email`,
        { email: email.trim() },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('Email validation successful', { email, valid: response.data.valid });
      return response.data;
    } catch (error) {
      return this.handleError(error as AxiosError, 'Email validation failed');
    }
  }

  /**
   * Authenticates a user with email and password (Step 2 of authentication).
   *
   * @param email - The user's email
   * @param password - The user's password
   * @returns Promise with authentication result including JWT token
   * @throws AuthenticationError if authentication fails
   */
  async authenticate(email: string, password: string): Promise<AuthenticateResponse> {
    if (!email || email.trim() === '') {
      throw new Error('Email is required');
    }
    if (!password || password.trim() === '') {
      throw new Error('Password is required');
    }

    try {
      logger.info('Authenticating user', { email });
      const response = await axios.post<AuthenticateResponse>(
        `${this.backendUrl}/api/auth/authenticate`,
        { email: email.trim(), password },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('Authentication successful', { email });
      return response.data;
    } catch (error) {
      return this.handleError(error as AxiosError, 'Authentication failed');
    }
  }

  /**
   * Logs out a user by blacklisting their JWT token.
   *
   * @param token - The JWT token to invalidate
   * @returns Promise with logout result
   * @throws AuthenticationError if logout fails
   */
  async logout(token: string): Promise<LogoutResponse> {
    if (!token || token.trim() === '') {
      throw new Error('Token is required');
    }

    try {
      logger.info('Logging out user');
      const response = await axios.post<LogoutResponse>(
        `${this.backendUrl}/api/auth/logout`,
        { token },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('Logout successful');
      return response.data;
    } catch (error) {
      return this.handleError(error as AxiosError, 'Logout failed');
    }
  }

  /**
   * Handles errors from API calls and transforms them into AuthenticationError.
   *
   * @param error - The error from axios
   * @param context - Context message for logging
   * @throws AuthenticationError with appropriate message and status code
   */
  private handleError(error: AxiosError, context: string): never {
    if (error.response) {
      const statusCode = error.response.status;
      const data = error.response.data as any;
      const retryAfter = error.response.headers?.['retry-after'] as string | undefined;

      logger.error(context, {
        statusCode,
        message: data?.message || data?.error,
        retryAfter,
      });

      const message = data?.message || data?.error || 'An error occurred';
      throw new AuthenticationError(message, statusCode, retryAfter);
    } else if (error.request) {
      logger.error(context, { error: 'No response from server' });
      throw new Error('Network error: Unable to reach authentication server');
    } else {
      logger.error(context, { error: error.message });
      throw error;
    }
  }
}
