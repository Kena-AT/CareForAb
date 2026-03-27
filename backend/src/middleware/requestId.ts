import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { AuthRequest } from './authMiddleware';
import { getRequestLogger } from '../utils/logger';

/**
 * Request correlation ID middleware.
 * Attaches a unique request ID to each request for distributed tracing.
 * Also attaches a child logger with request context.
 */
export const requestIdMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Generate or extract request ID
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  
  // Attach to request
  req.id = requestId;
  
  // Create child logger with request context
  const requestLogger = getRequestLogger(requestId);
  (req as any).log = requestLogger;
  
  // Set response header so client can correlate
  res.setHeader('X-Request-Id', requestId);
  
  // Log request start
  requestLogger.info({
    req: {
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    }
  }, 'Request started');
  
  // Log response finish
  res.on('finish', () => {
    requestLogger.info({
      res: {
        statusCode: res.statusCode,
      },
      duration: Date.now() - (req as any).startTime,
    }, 'Request completed');
  });
  
  (req as any).startTime = Date.now();
  next();
};
