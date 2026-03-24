import { requireAuth } from '../middleware/authMiddleware';
import { supabase } from '../services/reminderService';
import { Request, Response } from 'express';

jest.mock('../services/reminderService', () => ({
  supabase: {
    auth: {
      getUser: jest.fn()
    }
  }
}));

describe('AuthMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      headers: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    nextFunction = jest.fn();
  });

  test('should return 401 if no token is provided', async () => {
    await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test('should call next() if token is valid', async () => {
    mockRequest.headers!.authorization = 'Bearer valid-token';
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: '123' } },
      error: null
    });

    await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  test('should return 401 if token is invalid', async () => {
    mockRequest.headers!.authorization = 'Bearer invalid-token';
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: new Error('Invalid token')
    });

    await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(401);
  });
});
