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
import { apiUrl } from '@/lib/api';

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
  /* eslint-disable */
  signUp: (email: string, password: string, fullName: string, dateOfBirth: string) => Promise<{ error: Error | null }>;
  verifyOtp: (email: string, code: string) => Promise<{ success: boolean; error: string | null }>;
  resendOtp: (email: string, fullName: string) => Promise<{ success: boolean; error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  /* eslint-enable */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Public routes that don't require auth
const PUBLIC_ROUTES = ['/', '/auth'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<{
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
    initialized: boolean;
  }>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    initialized: false,
  });
  
  const { user, session, profile, loading, initialized } = authState;
  const [profileLoading, setProfileLoading] = useState(false);
  const fetchingProfileRef = useRef<string | null>(null);
  const initInProgressRef = useRef(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  // Unified signOut - single source of truth for logout
  const signOut = useCallback(async (options?: { skipSupabase?: boolean }) => {
    // 1. Sign out from Supabase FIRST (let it clean its own keys)
    if (!options?.skipSupabase) {
      await supabase.auth.signOut();
    }
    
    // 2. Clear local state after Supabase
    clearSession();
    setAuthState({
      user: null,
      session: null,
      profile: null,
      loading: false,
      initialized: true,
    });
    
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
    if (fetchingProfileRef.current === userId) {
      console.log('[AuthContext] Profile fetch already in progress for user:', userId);
      return null;
    }
    fetchingProfileRef.current = userId;
    
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
        // Profile doesn't exist or isn't accessible - try upserting
        console.log('[AuthContext] Profile not found, creating/upserting for user:', userId);
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            full_name: userMetadata?.full_name || null,
            date_of_birth: userMetadata?.date_of_birth || null,
          }, { onConflict: 'id' })
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
      fetchingProfileRef.current = null;
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

  // Consolidate state updates to prevent race conditions and duplicate renders
  const syncAuthState = useCallback(async (session: Session | null) => {
    const newUser = session?.user ?? null;
    console.log(`[AuthContext] syncAuthState: ${newUser ? 'User found' : 'No user'}`);
    
    if (newUser) {
      updateLastActivity();
      const profileData = await fetchProfile(newUser.id, {
        full_name: newUser.user_metadata?.full_name,
        date_of_birth: newUser.user_metadata?.date_of_birth
      });
      
      setAuthState(prev => ({
        ...prev,
        user: newUser,
        session,
        profile: profileData,
        loading: false,
        initialized: true,
      }));
    } else {
      setAuthState(prev => ({
        ...prev,
        user: null,
        session: null,
        profile: null,
        loading: false,
        initialized: true,
      }));
    }
  }, [fetchProfile]);

  const userRef = useRef<User | null>(user);
  const handleTimeoutCheckRef = useRef(handleTimeoutCheck);

  // Keep refs in sync with state/callbacks to avoid stale closures in effects
  useEffect(() => {
    userRef.current = user;
    handleTimeoutCheckRef.current = handleTimeoutCheck;
  }, [user, handleTimeoutCheck]);

  useEffect(() => {
    let mounted = true;
    let activityCleanup: (() => void) | null = null;

    const initAuth = async () => {
      if (initialized || initInProgressRef.current) return;
      initInProgressRef.current = true;
      
      console.log("[AuthContext] initAuth started");
      
      try {
        // Check if session expired before restoring
        if (isSessionExpired()) {
          console.log('[AuthContext] Session expired on init, clearing state');
          clearSession();
          await supabase.auth.signOut();
          if (mounted) {
            setAuthState(prev => ({
              ...prev,
              user: null,
              session: null,
              profile: null,
              loading: false,
              initialized: true,
            }));
          }
          return;
        }

        // Get current session from Supabase with a 30s timeout protective race (increased from 10s)
        console.log("[AuthContext] Fetching initial session...");
        const sessionPromise = supabase.auth.getSession();
        const sessionTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth init timeout')), 30000)
        );

        const { data: { session } } = await Promise.race([sessionPromise, sessionTimeout]) as any;
        
        if (mounted) {
          console.log(`[AuthContext] Session retrieved: ${session ? 'Active' : 'None'}`);
          await syncAuthState(session);
        }
      } catch (error: any) {
        if (error.message === 'Auth init timeout') {
          console.warn("[AuthContext] session check timed out after 30s. Proceeding to initialized state for better UX.");
        } else {
          console.error("[AuthContext] initAuth failed with error:", error);
        }
        
        // On timeout or error, we must still initialize to unblocked state
        if (mounted) {
          setAuthState(prev => ({
            ...prev,
            loading: false,
            initialized: true
          }));
        }
      } finally {
        if (mounted) {
          initInProgressRef.current = false;
        }
      }
    };

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        console.log(`[AuthContext] onAuthStateChange: ${event}`);
        
        if (event === 'SIGNED_OUT') {
           setAuthState(prev => ({
             ...prev,
             user: null,
             session: null,
             profile: null,
             loading: false,
             initialized: true,
           }));
           return;
        }

        if (event === 'TOKEN_REFRESHED') {
          return;
        }
        
        await syncAuthState(session);
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
      if (userRef.current) {
        updateLastActivity();
      }
    });

    // Handle session timeout check - uses ref to avoid re-triggering effect
    const timeoutInterval = setInterval(() => {
      if (userRef.current) {
        handleTimeoutCheckRef.current();
      }
    }, 30000);

    // Initial auth setup - only run once
    initAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      if (activityCleanup) activityCleanup();
      clearInterval(timeoutInterval);
    };
  }, [initialized, signOut, syncAuthState]); // Added missing dependencies

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
      const { error: authError } = await supabase.auth.signUp({
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
      const response = await fetch(apiUrl('/api/auth/send-code'), {
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
      const response = await fetch(apiUrl('/api/auth/verify-code'), {
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
      const response = await fetch(apiUrl('/api/auth/send-code'), {
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
