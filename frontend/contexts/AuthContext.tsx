"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, dateOfBirth: string) => Promise<{ error: Error | null }>;
  verifyOtp: (email: string, code: string) => Promise<{ success: boolean; error: string | null }>;
  resendOtp: (email: string, fullName: string) => Promise<{ success: boolean; error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
    const HEARTBEAT_INTERVAL = 60 * 1000; // 1 minute

    const checkSessionExpiry = () => {
      const lastActivity = localStorage.getItem('last_activity');
      if (lastActivity) {
        const inactiveTime = Date.now() - parseInt(lastActivity, 10);
        if (inactiveTime > ACTIVITY_TIMEOUT) {
          console.log('[AuthContext] Session expired due to inactivity');
          signOut();
          return true;
        }
      }
      return false;
    };

    const updateActivity = () => {
      localStorage.setItem('last_activity', Date.now().toString());
    };

    // Initial check
    const isExpired = checkSessionExpiry();
    if (!isExpired) {
      updateActivity();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session) updateActivity();
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session) updateActivity();
    });

    // Heartbeat to keep session alive while page is open
    const interval = setInterval(() => {
      if (user) {
        updateActivity();
      }
    }, HEARTBEAT_INTERVAL);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, dateOfBirth: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            date_of_birth: dateOfBirth
          }
        }
      });

      if (authError) throw authError;

      // Call backend to send verification code via Brevo
      const response = await fetch('http://localhost:3001/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName, dateOfBirth }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to send verification code');
      }

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const verifyOtp = async (email: string, code: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return { success: false, error: result.error || 'Verification failed' };
      }

      if (result.confirmed) {
        toast.success("Account verified! You can now sign in.");
      } else {
        toast.info("Code verified! Manual confirmation might be pending by system administrator.");
      }

      return { success: true, error: null };
    } catch (error: any) {
      return { success: false, error: error.message || 'Verification failed' };
    }
  };

  const resendOtp = async (email: string, fullName: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName }),
      });

      if (!response.ok) {
        const result = await response.json();
        return { success: false, error: result.error || 'Failed to resend code' };
      }

      return { success: true, error: null };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to resend code' };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signOut = async () => {
    localStorage.removeItem('last_activity');
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, verifyOtp, resendOtp }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
