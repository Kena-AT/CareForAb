"use client";

import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HealthProvider } from "@/contexts/HealthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "sonner";
import { SessionWatcher } from "@/components/auth/SessionWatcher";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { initializeNotifications } from "@/services/notifications";
import PageTransition from "@/components/layout/PageTransition";

const queryClient = new QueryClient();

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initializeNotifications();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <HealthProvider>
            <ThemeProvider>
              <TooltipProvider>
                <SessionWatcher />
                <PageTransition>
                  {children}
                </PageTransition>
                <Toaster position="top-right" richColors />
              </TooltipProvider>
            </ThemeProvider>
          </HealthProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
