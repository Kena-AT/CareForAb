import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { logger } from './utils/logger';
import { reminderService } from './services/reminderService';
import authRoutes from './routes/authRoutes';
import aiRoutes from './routes/aiRoutes';
import { errorHandler } from './middleware/errorHandler';
import { standardLimiter, authLimiter } from './middleware/rateLimiter';
import { monitorSuspiciousActivity } from './middleware/securityLogger';
import { requireAuth } from './middleware/authMiddleware';

const app = express();
const port = process.env.PORT || 3001;

const corsOrigins = (process.env.CORS_ORIGINS || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000,http://127.0.0.1:3000'))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (corsOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

// Structured logging with Pino
app.use(pinoHttp({ 
  logger,
  customLogLevel: (req, res) => {
    if (res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  }
}));

// Global security monitor
app.use(monitorSuspiciousActivity);

// Global rate limiter for all /api routes
app.use('/api', standardLimiter);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/ai', requireAuth, aiRoutes);

app.post('/api/reminders/test', requireAuth, async (req, res) => {
  await reminderService.checkAndSendReminders();
  res.json({ message: 'Reminder check triggered by admin' });
});

app.post('/api/reminders/inventory', requireAuth, async (req, res) => {
  await reminderService.checkLowInventory();
  res.json({ message: 'Low inventory check triggered manually' });
});

app.post('/api/reminders/summary', requireAuth, async (req, res) => {
  await reminderService.sendWeeklyHealthSummaries();
  res.json({ message: 'Weekly summary dispatch triggered manually' });
});

// Start the reminder service
reminderService.startCron();

// Error handling - must be last
app.use(errorHandler);

app.listen(port, () => {
  logger.info({ port }, 'Server started');
});