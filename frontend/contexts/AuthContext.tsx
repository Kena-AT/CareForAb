"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  setupActivityTracking, 
  isSessionExpired, 
  updateLastActivity, 
  clearSession
} from '@/lib/session';
import { useQueryClient } from '@tanstack/react-query';
import { isNetworkError } from '@/lib/utils';

interface Profile {
  id: string;
  full_name: string | null;
  date_of_birth: string | null;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  signUp: (email: string, password: string, fullName: string, dateOfBirth: string) => Promise<{ error: Error | null }>;
  verifyOtp: (email: string, code: string) => Promise<{ success: boolean; error: string | null }>;
  resendOtp: (email: string, fullName: string) => Promise<{ success: boolean; error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Public routes that don't require auth
const PUBLIC_ROUTES = ['/', '/auth'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log("[AuthContext] render");
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Unified signOut - single source of truth for logout
  const signOut = useCallback(async (options?: { skipSupabase?: boolean }) => {
    // 1. Sign out from Supabase FIRST (let it clean its own keys)
    if (!options?.skipSupabase) {
      await supabase.auth.signOut();
    }
    
    // 2. Clear local state after Supabase
    clearSession();
    setUser(null);
    setSession(null);
    setProfile(null);
    
    // 3. Remove only auth-scoped queries (not public data)
    queryClient.removeQueries({ 
      predicate: (q) => {
        const key = String(q.queryKey[0]);
        return ['health', 'medications', 'readings', 'profile', 'user'].includes(key);
      }
    });
    
    // 4. Clear our activity keys only (not Supabase keys)
    localStorage.removeItem('last_activity');
    localStorage.removeItem('careforab_last_activity');
    
    // 5. Broadcast logout to other tabs
    localStorage.setItem('careforab_logout_event', Date.now().toString());
    localStorage.removeItem('careforab_logout_event');
    
    // 6. Redirect to home if on protected route
    if (!PUBLIC_ROUTES.includes(pathname)) {
      router.replace('/');
    }
  }, [queryClient, router, pathname]);

  // Fetch profile - auto-create on failure
  const fetchProfile = useCallback(async (userId: string, userMetadata?: { full_name?: string; date_of_birth?: string }): Promise<Profile | null> => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, date_of_birth, created_at')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        if (isNetworkError(error)) {
          console.warn('[AuthContext] Profile fetch failed due to network connection. Keeping current session.');
          return null;
        }
        console.error('[AuthContext] Profile fetch error:', error);
        toast.error('Failed to load profile. Please sign in again.');
        await signOut();
        return null;
      }
      
      if (!data) {
        // Profile doesn't exist - create it on-demand
        console.log('[AuthContext] Profile not found, creating for user:', userId);
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            full_name: userMetadata?.full_name || null,
            date_of_birth: userMetadata?.date_of_birth || null,
          })
          .select('id, full_name, date_of_birth, created_at')
          .single();
        
        if (createError) {
          console.error('[AuthContext] Profile creation error:', createError);
          toast.error('Failed to create profile. Please sign in again.');
          await signOut();
          return null;
        }
        
        return newProfile;
      }
      
      return data;
    } catch (error) {
      if (isNetworkError(error)) {
        console.warn('[AuthContext] Unexpected profile fetch network error. Keeping current session.');
        return null;
      }
      console.error('[AuthContext] Unexpected profile fetch error:', error);
      toast.error('Authentication error. Please sign in again.');
      await signOut();
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, [signOut]);

  // Handle session timeout check
  const handleTimeoutCheck = useCallback(async () => {
    if (!user) return;
    
    if (isSessionExpired()) {
      console.log('[AuthContext] Session expired due to inactivity');
      toast.warning('Session expired due to inactivity. Please sign in again.');
      await signOut();
    } else {
      updateLastActivity();
    }
  }, [user, signOut]);

  useEffect(() => {
    let mounted = true;
    let activityCleanup: (() => void) | null = null;

    const initAuth = async () => {
      console.log("[AuthContext] initAuth started");
      // Check if session expired before restoring
      if (isSessionExpired()) {
        console.log('[AuthContext] Session expired on init, clearing state');
        clearSession();
        await supabase.auth.signOut();
        if (mounted) {
          setUser(null);
          setSession(null);
          setProfile(null);
          setLoading(false);
          setInitialized(true);
        }
        return;
      }

      // Get current session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          updateLastActivity();
          // Fetch profile - will auto-create if missing
          const profileData = await fetchProfile(session.user.id, {
            full_name: session.user.user_metadata?.full_name,
            date_of_birth: session.user.user_metadata?.date_of_birth
          });
          if (mounted) {
            setProfile(profileData);
          }
        }
        
        setLoading(false);
        setInitialized(true);
      }
    };

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        console.log(`[AuthContext] onAuthStateChange: ${event}`);
        
        if (event === 'SIGNED_OUT') {
           setSession(null);
           setUser(null);
           setProfile(null);
           setLoading(false);
           return;
        }

        if (event === 'TOKEN_REFRESHED') return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          updateLastActivity();
          const profileData = await fetchProfile(session.user.id, {
            full_name: session.user.user_metadata?.full_name,
            date_of_birth: session.user.user_metadata?.date_of_birth
          });
          if (mounted) {
            setProfile(profileData);
          }
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Multi-tab sync: Listen for storage changes (logout in other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'careforab_logout_event') {
        // Another tab logged out - sync logout here
        console.log('[AuthContext] Logout detected in another tab');
        signOut({ skipSupabase: true }); // Skip Supabase to avoid loop
      }
    };
    window.addEventListener('storage', handleStorageChange);
    activityCleanup = setupActivityTracking(() => {
      // Only update activity, don't check timeout here
      // Timeout check happens in the interval
      if (user) {
        updateLastActivity();
      }
    });

    // Periodic timeout check (every 30 seconds)
    intervalRef.current = setInterval(() => {
      handleTimeoutCheck();
    }, 30000);

    // Initial auth setup
    initAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      if (activityCleanup) activityCleanup();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchProfile, handleTimeoutCheck, user]);

  // Redirect protection: ensure we don't stay on protected routes when logged out
  // Also block until profile is loaded (prevent race conditions)
  useEffect(() => {
    if (!initialized || loading) return;
    
    // Block protected routes until auth is ready AND profile is loaded (if logged in)
    const isAuthReady = user ? (profile && !profileLoading) : true;
    if (!isAuthReady) return;
    
    // If not authenticated and on protected route, redirect to home
    if (!user && !PUBLIC_ROUTES.includes(pathname)) {
      router.replace('/');
    }
  }, [initialized, loading, user, profile, profileLoading, pathname, router]);

  const signUp = async (email: string, password: string, fullName: string, dateOfBirth: string) => {
    try {
      const { data: _authData, error: authError } = await supabase.auth.signUp({
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
    
    if (!error) {
      updateLastActivity();
    }
    
    return { error };
  };

  if (!initialized || (user && !profile && loading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500 animate-pulse font-sans">Wait for it...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile,
      loading, 
      initialized,
      signUp, 
      signIn, 
      signOut, 
      verifyOtp, 
      resendOtp 
    }}>
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
