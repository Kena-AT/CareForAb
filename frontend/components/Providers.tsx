"use client";

import { AuthProvider } from '@/contexts/AuthContext';
import { HealthProvider } from '@/contexts/HealthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <HealthProvider>
            {children}
            <Toaster position="top-right" closeButton richColors />
          </HealthProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
