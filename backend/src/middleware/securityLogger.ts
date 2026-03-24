import { Request, Response, NextFunction } from 'express';

const FAILED_ATTEMPTS_THRESHOLD = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const suspiciousActivity = new Map<string, { count: number, firstAttempt: number }>();

export const monitorSuspiciousActivity = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const ip = req.ip || req.get('x-forwarded-for') || 'unknown';
  
  // Track failed auth attempts or 404s/403s
  res.on('finish', () => {
    if (res.statusCode === 401 || res.statusCode === 403) {
      const now = Date.now();
      const activity = suspiciousActivity.get(ip) || { count: 0, firstAttempt: now };
      
      if (now - activity.firstAttempt > WINDOW_MS) {
        // Reset after window
        suspiciousActivity.set(ip, { count: 1, firstAttempt: now });
      } else {
        activity.count += 1;
        suspiciousActivity.set(ip, activity);
        
        if (activity.count >= FAILED_ATTEMPTS_THRESHOLD) {
          console.warn(`[Security] Suspicious activity detected from IP: ${ip} (${activity.count} failed attempts)`);
          // Here we could trigger an alert or temporary IP block in a real production system
        }
      }
    }
  });

  next();
};
