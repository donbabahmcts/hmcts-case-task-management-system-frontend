import { Application, Request, Response } from 'express';
import { AuthenticationService } from '../services/authenticationService';
import { redirectIfAuthenticated } from '../middleware/auth';
import { logger } from '../utils/logger';
import config from 'config';

interface ServiceConfig {
  url: string;
  timeout: number;
}

export default function (app: Application): void {
  const backendUrl = config.get<ServiceConfig>('services.backend').url;
  const authService = new AuthenticationService(backendUrl);

  /**
   * GET /auth/login
   * Display email validation page (Step 1)
   */
  app.get('/auth/login', redirectIfAuthenticated, (req: Request, res: Response) => {
    logger.info('Rendering login page (step 1: email validation)');
    res.render('auth/login', {
      pageTitle: 'Sign in',
      errors: req.session?.errors || [],
      email: req.session?.tempEmail || '',
      csrfToken: req.csrfToken?.() || '',
    });
    // Clear any previous errors
    delete req.session?.errors;
  });

  /**
   * POST /auth/validate-email
   * Validate email and proceed to password page (Step 1 -> Step 2)
   */
  app.post('/auth/validate-email', redirectIfAuthenticated, async (req: Request, res: Response) => {
    const { email } = req.body;

    try {
      logger.info('Processing email validation', { email });

      // Validate email with backend
      const result = await authService.validateEmail(email);

      if (result.success && result.emailValidated) {
        // Store email temporarily in session and redirect to password page
        req.session!.tempEmail = email;
        logger.info('Email validated successfully, redirecting to password page', { email });
        res.redirect('/auth/password');
      } else {
        // Email invalid - show error
        logger.warn('Email validation failed', { email, message: result.message });
        req.session!.errors = [
          {
            text: result.message || 'Invalid email address',
            href: '#email',
          },
        ];
        res.redirect('/auth/login');
      }
    } catch (error: any) {
      logger.error('Email validation error', { error: error.message, email });

      const errorMessage =
        error.statusCode === 429
          ? 'Too many attempts. Please try again later.'
          : error.message || 'An error occurred. Please try again.';

      req.session!.errors = [
        {
          text: errorMessage,
          href: '#email',
        },
      ];
      res.redirect('/auth/login');
    }
  });

  /**
   * GET /auth/password
   * Display password entry page (Step 2)
   */
  app.get('/auth/password', redirectIfAuthenticated, (req: Request, res: Response) => {
    const email = req.session?.tempEmail;

    if (!email) {
      logger.warn('Password page accessed without validated email');
      res.redirect('/auth/login');
      return;
    }

    logger.info('Rendering password page (step 2)', { email });
    res.render('auth/password', {
      pageTitle: 'Enter your password',
      email,
      errors: req.session?.errors || [],
      csrfToken: req.csrfToken?.() || '',
    });
    // Clear any previous errors
    delete req.session?.errors;
  });

  /**
   * POST /auth/authenticate
   * Authenticate with password and create session (Step 2 -> Complete)
   */
  app.post('/auth/authenticate', redirectIfAuthenticated, async (req: Request, res: Response) => {
    const email = req.session?.tempEmail;
    const { password } = req.body;

    if (!email) {
      logger.warn('Authentication attempted without validated email');
      res.redirect('/auth/login');
      return;
    }

    try {
      logger.info('Processing authentication', { email });

      // Authenticate with backend
      const result = await authService.authenticate(email, password);

      // Store token in session
      req.session!.token = result.token;
      req.session!.email = email;
      delete req.session!.tempEmail;

      logger.info('Authentication successful, redirecting to tasks', { email });
      res.redirect('/tasks');
    } catch (error: any) {
      logger.error('Authentication error', { error: error.message, email });

      const errorMessage =
        error.statusCode === 429
          ? 'Too many attempts. Please try again later.'
          : error.statusCode === 401
            ? 'Invalid password. Please try again.'
            : error.message || 'An error occurred. Please try again.';

      req.session!.errors = [
        {
          text: errorMessage,
          href: '#password',
        },
      ];
      res.redirect('/auth/password');
    }
  });

  /**
   * GET /auth/logout
   * Logout user and clear session
   */
  app.get('/auth/logout', async (req: Request, res: Response) => {
    const token = req.session?.token;

    if (token) {
      try {
        logger.info('Processing logout');
        await authService.logout(token);
        logger.info('Logout successful');
      } catch (error: any) {
        logger.error('Logout error', { error: error.message });
        // Continue with session cleanup even if backend logout fails
      }
    }

    // Clear session
    req.session?.destroy((err) => {
      if (err) {
        logger.error('Session destruction error', { error: err.message });
      }
      res.redirect('/auth/login');
    });
  });

  /**
   * POST /auth/back-to-email
   * Allow user to go back from password page to email page
   */
  app.post('/auth/back-to-email', (req: Request, res: Response) => {
    logger.info('User going back to email page');
    delete req.session?.tempEmail;
    res.redirect('/auth/login');
  });
}
