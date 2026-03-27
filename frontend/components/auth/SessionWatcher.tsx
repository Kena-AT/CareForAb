"use client";

import { useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { updateLastActivity, isSessionExpired, clearSession } from '@/lib/session';
import { toast } from 'sonner';

/**
 * SessionWatcher monitors user activity and handles session timeouts.
 * It ensures the user lands on the Welcome Page (/) on boot if the session is expired.
 */
export const SessionWatcher = () => {
    const router = useRouter();
    const pathname = usePathname();
    const { loading } = useAuth();

    const handleTimeout = useCallback(() => {
        if (pathname !== '/') {
            toast.warning('Session expired. Redirecting to start page.');
            router.push('/');
        }
    }, [pathname, router]);

    // Track user activity
    useEffect(() => {
        const handleActivity = () => {
            updateLastActivity();
        };

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
        events.forEach(event => window.addEventListener(event, handleActivity));

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
        };
    }, []);

    // Session health check on boot and periodically
    useEffect(() => {
        if (loading) return;

        // Check on initial mount (app boot)
        if (isSessionExpired()) {
            // Always redirect to / when session is expired, regardless of user state
            if (pathname !== '/') {
                clearSession();
                handleTimeout();
            }
        } else {
            // Update activity on successful mount of a valid session
            updateLastActivity();
        }

        // Periodic check every 30 seconds
        const interval = setInterval(() => {
            if (isSessionExpired() && pathname !== '/') {
                clearSession();
                handleTimeout();
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [loading, pathname, handleTimeout]);

    return null;
};
