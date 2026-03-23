import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { reminderService } from './services/reminderService';
import authRoutes from './routes/authRoutes';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);

app.post('/api/reminders/test', async (req, res) => {
  await reminderService.checkAndSendReminders();
  res.json({ message: 'Reminder check triggered' });
});

// Start the reminder service
reminderService.startCron();

app.listen(port, () => {
  console.log('[Backend] Server running on http://localhost:'+port);
});