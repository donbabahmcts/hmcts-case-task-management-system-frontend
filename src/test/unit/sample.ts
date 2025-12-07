import { HTTPError } from '../../main/HttpError';

describe('HTTPError', () => {
  it('should create an error with a message and status code', () => {
    const error = new HTTPError('Not Found', 404);
    expect(error.message).toBe('Not Found');
    expect(error.status).toBe(404);
  });

  it('should extend Error class', () => {
    const error = new HTTPError('Server Error', 500);
    expect(error).toBeInstanceOf(Error);
  });

  it('should set status code 500 when provided', () => {
    const error = new HTTPError('Error', 500);
    expect(error.status).toBe(500);
  });
});
