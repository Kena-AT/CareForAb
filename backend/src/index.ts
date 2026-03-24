import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { reminderService } from './services/reminderService';
import authRoutes from './routes/authRoutes';
import { errorHandler } from './middleware/errorHandler';
import { standardLimiter, authLimiter } from './middleware/rateLimiter';
import { monitorSuspiciousActivity } from './middleware/securityLogger';
import { requireAuth } from './middleware/authMiddleware';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

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

app.post('/api/reminders/test', requireAuth, async (req, res) => {
  await reminderService.checkAndSendReminders();
  res.json({ message: 'Reminder check triggered by admin' });
});

// Start the reminder service
reminderService.startCron();

// Error handling - must be last
app.use(errorHandler);

app.listen(port, () => {
  console.log('[Backend] Server running on http://localhost:'+port);
});