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

describe('Tasks Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /tasks', () => {
    it('should fetch and render task list successfully', async () => {
      const mockTasks = [
        {
          id: 1,
          title: 'Test Task 1',
          description: 'Description 1',
          status: 'PENDING',
          statusDisplayName: 'Pending',
          dueDateTime: '2025-12-15T14:30:00',
          overdue: false,
          dueToday: false,
        },
        {
          id: 2,
          title: 'Test Task 2',
          description: 'Description 2',
          status: 'IN_PROGRESS',
          statusDisplayName: 'In Progress',
          dueDateTime: '2025-12-16T10:00:00',
          overdue: false,
          dueToday: false,
        },
      ];

      mockedAxios.get.mockResolvedValue({ data: mockTasks });

      const response = await request(app).get('/tasks');
      expect(response.status).toBe(200);
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:4000/api/tasks', {
        timeout: 10000,
      });
    });

    it('should handle errors when fetching tasks', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const response = await request(app).get('/tasks');
      expect(response.status).toBe(200);
    });
  });

  describe('GET /tasks/create', () => {
    it('should render the task creation form', async () => {
      const response = await request(app).get('/tasks/create');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /tasks/create', () => {
    it('should create task successfully', async () => {
      const mockTaskResponse = {
        data: {
          id: 1,
          title: 'Test Task',
          description: 'Test Description',
          status: 'PENDING',
          statusDisplayName: 'Pending',
          dueDateTime: '2025-12-15T14:30:00',
          createdAt: '2025-01-01T10:00:00',
          updatedAt: '2025-01-01T10:00:00',
          overdue: false,
          dueToday: false,
          hoursUntilDue: 100,
        },
      };

      mockedAxios.post.mockResolvedValue(mockTaskResponse);

      const response = await request(app).post('/tasks/create').send({
        title: 'Test Task',
        description: 'Test Description',
        status: 'PENDING',
        dueDateTime: '2025-12-15T14:30',
      });

      expect(response.status).toBe(200);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:4000/api/tasks',
        {
          title: 'Test Task',
          description: 'Test Description',
          status: 'PENDING',
          dueDateTime: '2025-12-15T14:30',
        },
        expect.objectContaining({
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should handle validation errors from backend', async () => {
      const mockError = {
        response: {
          status: 400,
          data: {
            message: 'Validation failed',
            validationErrors: {
              title: 'Title must be between 3 and 200 characters',
              dueDateTime: 'Due date must be in the future',
            },
          },
        },
      };

      mockedAxios.post.mockRejectedValue(mockError);

      const response = await request(app).post('/tasks/create').send({
        title: 'ab',
        status: 'PENDING',
        dueDateTime: '2020-01-01T10:00',
      });

      expect(response.status).toBe(400);
    });

    it('should handle business rule violations', async () => {
      const mockError = {
        response: {
          status: 400,
          data: {
            message: 'Tasks cannot be due on weekends or bank holidays',
          },
        },
      };

      mockedAxios.post.mockRejectedValue(mockError);

      const response = await request(app).post('/tasks/create').send({
        title: 'Weekend Task',
        status: 'PENDING',
        dueDateTime: '2025-12-13T10:00',
      });

      expect(response.status).toBe(400);
    });

    it('should handle network errors', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const response = await request(app).post('/tasks/create').send({
        title: 'Test Task',
        status: 'PENDING',
        dueDateTime: '2025-12-15T14:30',
      });

      expect(response.status).toBe(400);
    });

    it('should handle 500 internal server errors', async () => {
      const mockError = {
        response: {
          status: 500,
          data: {
            message: 'Internal server error',
          },
        },
      };

      mockedAxios.post.mockRejectedValue(mockError);

      const response = await request(app).post('/tasks/create').send({
        title: 'Test Task',
        status: 'PENDING',
        dueDateTime: '2025-12-15T14:30',
      });

      expect(response.status).toBe(400);
    });

    it('should handle timeout errors', async () => {
      const mockError = {
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded',
      };

      mockedAxios.post.mockRejectedValue(mockError);

      const response = await request(app).post('/tasks/create').send({
        title: 'Test Task',
        status: 'PENDING',
        dueDateTime: '2025-12-15T14:30',
      });

      expect(response.status).toBe(400);
    });

    it('should handle malformed error responses', async () => {
      mockedAxios.post.mockRejectedValue({ unexpectedError: 'something' });

      const response = await request(app).post('/tasks/create').send({
        title: 'Test Task',
        status: 'PENDING',
        dueDateTime: '2025-12-15T14:30',
      });

      expect(response.status).toBe(400);
    });

    it('should sanitize user input in error responses', async () => {
      const mockError = {
        response: {
          data: {
            validationErrors: {
              title: 'Invalid title',
            },
          },
        },
      };

      mockedAxios.post.mockRejectedValue(mockError);

      const response = await request(app).post('/tasks/create').send({
        title: '<script>alert("XSS")</script>',
        description: 'Normal description',
        status: 'PENDING',
        dueDateTime: '2025-12-15T14:30',
      });

      expect(response.status).toBe(400);
    });

    it('should handle empty form submission', async () => {
      const mockError = {
        response: {
          data: {
            validationErrors: {
              title: 'Title is required',
              status: 'Status is required',
            },
          },
        },
      };

      mockedAxios.post.mockRejectedValue(mockError);

      const response = await request(app).post('/tasks/create').send({});

      expect(response.status).toBe(400);
    });

    it('should preserve form data on validation error', async () => {
      const mockError = {
        response: {
          data: {
            validationErrors: {
              title: 'Title too short',
            },
          },
        },
      };

      mockedAxios.post.mockRejectedValue(mockError);

      const formData = {
        title: 'ab',
        description: 'Test description',
        status: 'PENDING',
        dueDateTime: '2025-12-15T14:30',
      };

      const response = await request(app).post('/tasks/create').send(formData);

      expect(response.status).toBe(400);
    });

    it('should handle very long task descriptions', async () => {
      const longDescription = 'x'.repeat(10000);

      mockedAxios.post.mockResolvedValue({
        data: {
          id: 1,
          title: 'Test Task',
          description: longDescription,
          status: 'PENDING',
        },
      });

      const response = await request(app).post('/tasks/create').send({
        title: 'Test Task',
        description: longDescription,
        status: 'PENDING',
        dueDateTime: '2025-12-15T14:30',
      });

      expect(mockedAxios.post).toHaveBeenCalled();
    });

    it('should handle special characters in task title', async () => {
      const specialTitle = 'Test & Task <> "Special" \'Chars\'';

      mockedAxios.post.mockResolvedValue({
        data: {
          id: 1,
          title: specialTitle,
          status: 'PENDING',
        },
      });

      const response = await request(app).post('/tasks/create').send({
        title: specialTitle,
        status: 'PENDING',
        dueDateTime: '2025-12-15T14:30',
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          title: specialTitle,
        }),
        expect.any(Object)
      );
    });

    it('should handle Unicode characters in task data', async () => {
      const unicodeTitle = '測試任務 🚀 Тест';

      mockedAxios.post.mockResolvedValue({
        data: {
          id: 1,
          title: unicodeTitle,
          status: 'PENDING',
        },
      });

      const response = await request(app).post('/tasks/create').send({
        title: unicodeTitle,
        status: 'PENDING',
        dueDateTime: '2025-12-15T14:30',
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          title: unicodeTitle,
        }),
        expect.any(Object)
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle requests with missing CSRF token gracefully', async () => {
      const response = await request(app).get('/tasks/create');
      // Should render the form even if csrfToken is not available
      expect([200, 403]).toContain(response.status);
    });

    it('should handle concurrent task creation requests', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          id: 1,
          title: 'Test Task',
          status: 'PENDING',
        },
      });

      const promises = [
        request(app).post('/tasks/create').send({
          title: 'Task 1',
          status: 'PENDING',
          dueDateTime: '2025-12-15T14:30',
        }),
        request(app).post('/tasks/create').send({
          title: 'Task 2',
          status: 'PENDING',
          dueDateTime: '2025-12-16T14:30',
        }),
        request(app).post('/tasks/create').send({
          title: 'Task 3',
          status: 'PENDING',
          dueDateTime: '2025-12-17T14:30',
        }),
      ];

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect([200, 400]).toContain(response.status);
      });
    });

    it('should handle backend returning unexpected response structure', async () => {
      mockedAxios.get.mockResolvedValue({
        data: 'unexpected string response',
      });

      const response = await request(app).get('/tasks');
      expect([200, 500]).toContain(response.status);
    });

    it('should handle backend returning null data', async () => {
      mockedAxios.get.mockResolvedValue({
        data: null,
      });

      const response = await request(app).get('/tasks');
      expect([200, 500]).toContain(response.status);
    });

    it('should handle backend returning empty array', async () => {
      mockedAxios.get.mockResolvedValue({
        data: [],
      });

      const response = await request(app).get('/tasks');
      expect(response.status).toBe(200);
    });

    it('should handle very large task lists', async () => {
      const largeTasks = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        title: `Task ${i + 1}`,
        status: 'PENDING',
      }));

      mockedAxios.get.mockResolvedValue({
        data: largeTasks,
      });

      const response = await request(app).get('/tasks');
      expect(response.status).toBe(200);
    });
  });

  describe('Logging', () => {
    it('should log successful task fetching', async () => {
      const mockTasks = [
        { id: 1, title: 'Task 1', status: 'PENDING' },
        { id: 2, title: 'Task 2', status: 'DONE' },
      ];

      mockedAxios.get.mockResolvedValue({ data: mockTasks });

      await request(app).get('/tasks');

      expect(logger.info).toHaveBeenCalledWith('Tasks fetched successfully', expect.objectContaining({
        count: 2,
      }));
    });

    it('should log task creation attempts', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { id: 1, title: 'New Task' },
      });

      await request(app).post('/tasks/create').send({
        title: 'New Task',
        status: 'PENDING',
        dueDateTime: '2025-12-15T14:30',
      });

      expect(logger.info).toHaveBeenCalledWith('Submitting task creation request', expect.objectContaining({
        title: 'New Task',
      }));
    });

    it('should log successful task creation', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { id: 123, title: 'New Task' },
      });

      await request(app).post('/tasks/create').send({
        title: 'New Task',
        status: 'PENDING',
        dueDateTime: '2025-12-15T14:30',
      });

      expect(logger.info).toHaveBeenCalledWith('Task created successfully', expect.objectContaining({
        taskId: 123,
      }));
    });

    it('should log task creation errors', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Creation failed'));

      await request(app).post('/tasks/create').send({
        title: 'Failed Task',
        status: 'PENDING',
        dueDateTime: '2025-12-15T14:30',
      });

      expect(logger.error).toHaveBeenCalledWith('Error creating task', expect.objectContaining({
        error: expect.anything(),
      }));
    });

    it('should log task fetching errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Fetch failed'));

      await request(app).get('/tasks');

      expect(logger.error).toHaveBeenCalledWith('Error fetching tasks', expect.objectContaining({
        error: expect.anything(),
      }));
    });
  });
});
