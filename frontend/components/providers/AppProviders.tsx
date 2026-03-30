"use client";

import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "sonner";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { initializeNotifications } from "@/services/notifications";
import PageTransition from "@/components/layout/PageTransition";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 300000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initializeNotifications();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <ThemeProvider>
            <TooltipProvider>
              <PageTransition>
                {children}
              </PageTransition>
              <Toaster position="top-right" richColors />
            </TooltipProvider>
          </ThemeProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
