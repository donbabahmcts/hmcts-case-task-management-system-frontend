/// <reference path="../types/express-session.d.ts" />

import { logger } from '../utils/logger';
import { requireAuth } from '../middleware/auth';

import axios from 'axios';
import config from 'config';
import { Application, Request, Response } from 'express';

interface ServiceConfig {
  url: string;
  timeout: number;
}

export default function (app: Application): void {
  // Protect all tasks routes with authentication
  app.get('/tasks', requireAuth, async (req: Request, res: Response) => {
    try {
      const backendConfig = config.get<ServiceConfig>('services.backend');
      const token = req.session?.token;

      const response = await axios.get(`${backendConfig.url}/api/tasks`, {
        timeout: backendConfig.timeout,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      logger.info('Tasks fetched successfully', { count: response.data.length });

      res.render('tasks/list', {
        pageTitle: 'Task List',
        tasks: response.data,
        email: req.session?.email,
      });
    } catch (error) {
      logger.error('Error fetching tasks', { error });
      res.render('error', {
        message: 'Unable to fetch tasks',
        error: process.env.NODE_ENV === 'development' ? error : {},
      });
    }
  });

  app.get('/tasks/create', requireAuth, (req: Request, res: Response) => {
    res.render('tasks/manage', {
      pageTitle: 'Create New Task',
      csrfToken: req.csrfToken?.() || '',
      action: 'create',
      formAction: '/tasks/create',
    });
  });

  app.post('/tasks/create', requireAuth, async (req: Request, res: Response) => {
    try {
      const backendConfig = config.get<ServiceConfig>('services.backend');
      const token = req.session?.token;

      const taskData = {
        title: req.body.title,
        description: req.body.description,
        status: req.body.status,
        dueDateTime: req.body.dueDateTime,
      };

      logger.info('Submitting task creation request', { title: taskData.title });

      const response = await axios.post(`${backendConfig.url}/api/tasks`, taskData, {
        timeout: backendConfig.timeout,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      logger.info('Task created successfully', { taskId: response.data.id });

      res.render('tasks/success', {
        pageTitle: 'Task Created Successfully',
        task: response.data,
      });
    } catch (error) {
      logger.error('Error creating task', { error });

      let errorMessage = 'An unexpected error occurred while creating the task.';
      let validationErrors: Record<string, string> = {};

      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { data?: { validationErrors?: Record<string, string>; message?: string } } }).response
      ) {
        const errorData = (
          error as { response: { data?: { validationErrors?: Record<string, string>; message?: string } } }
        ).response.data;

        if (errorData && errorData.validationErrors) {
          validationErrors = errorData.validationErrors;
          errorMessage = 'Please correct the validation errors below.';
        } else if (errorData && errorData.message) {
          errorMessage = errorData.message;
        }
      }

      res.status(400).render('tasks/manage', {
        pageTitle: 'Create New Task',
        errorMessage,
        validationErrors,
        formData: req.body,
        csrfToken: req.csrfToken?.() || '',
        action: 'create',
        formAction: '/tasks/create',
      });
    }
  });
}
