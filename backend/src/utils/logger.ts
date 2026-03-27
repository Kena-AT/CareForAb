import pino from 'pino';

// Structured JSON logging for production debugging
// Request correlation IDs trace request paths across services
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    service: 'careforab-backend',
    version: process.env.npm_package_version || '1.0.0',
  },
  // Redact sensitive fields
  redact: ['req.headers.authorization', 'req.headers.cookie', 'password', 'token'],
  // Pretty print in development
  transport: process.env.NODE_ENV !== 'production' 
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

// Child logger factory for request context
export const getRequestLogger = (reqId: string, userId?: string) => {
  return logger.child({ 
    requestId: reqId,
    userId: userId || 'anonymous'
  });
};
