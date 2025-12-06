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
        url: 'http://localhost:9090',
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
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:9090/api/tasks', {
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
        'http://localhost:9090/api/tasks',
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
  });
});
