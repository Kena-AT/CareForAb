import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { AuthRequest } from './authMiddleware';
import { getRequestLogger } from '../utils/logger';

interface RequestWithLogger extends AuthRequest {
  log: ReturnType<typeof getRequestLogger>;
  startTime: number;
  requestId: string;
}

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
  
  // Attach to request (cast needed for Express type compatibility)
  (req as unknown as RequestWithLogger).requestId = requestId;
  
  // Create child logger with request context
  const requestLogger = getRequestLogger(requestId);
  (req as unknown as RequestWithLogger).log = requestLogger;
  
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
  const startTime = Date.now();
  (req as unknown as RequestWithLogger).startTime = startTime;
  
  res.on('finish', () => {
    requestLogger.info({
      res: {
        statusCode: res.statusCode,
      },
      duration: Date.now() - startTime,
    }, 'Request completed');
  });
  
  next();
};
