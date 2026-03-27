// Session Management Utility for CareForAb
// Configurable timeout with improved activity tracking

// Get timeout from env (default 30 minutes for health apps)
const SESSION_TIMEOUT_MINUTES = parseInt(
  process.env.NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES || '30',
  10
);
export const SESSION_TIMEOUT = SESSION_TIMEOUT_MINUTES * 60 * 1000;

const ACTIVITY_KEY = 'careforab_last_activity';
const RATE_LIMIT_KEY = 'careforab_rate_limit';

let isTabVisible = true;
let lastActivityTime = Date.now();

/**
 * Updates the last activity timestamp in localStorage.
 * Only updates if tab is visible to prevent false activity while backgrounded.
 */
export const updateLastActivity = () => {
  if (typeof window === 'undefined') return;
  if (!isTabVisible) return; // Don't update when tab is hidden
  
  lastActivityTime = Date.now();
  localStorage.setItem(ACTIVITY_KEY, lastActivityTime.toString());
};

/**
 * Gets the last activity timestamp
 */
export const getLastActivity = (): number => {
  if (typeof window === 'undefined') return 0;
  const stored = localStorage.getItem(ACTIVITY_KEY);
  return stored ? parseInt(stored, 10) : 0;
};

/**
 * Checks if the session has expired based on the timeout rule.
 * @returns {boolean} True if session is expired or doesn't exist.
 */
export const isSessionExpired = (): boolean => {
    if (typeof window === 'undefined') return false;
    
    const lastActivity = localStorage.getItem(ACTIVITY_KEY);
    if (!lastActivity) return true;
    
    // If tab is visible, use current time. If hidden, use stored time.
    const referenceTime = isTabVisible ? Date.now() : lastActivityTime;
    const elapsed = referenceTime - parseInt(lastActivity);
    
    return elapsed > SESSION_TIMEOUT;
};

/**
 * Clears the session activity timestamp.
 */
export const clearSession = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACTIVITY_KEY);
    lastActivityTime = 0;
};

/**
 * Sets up comprehensive activity tracking including:
 * - visibilitychange (tab switch)
 * - focus/blur (window focus)
 * - mousemove, keydown, click
 * 
 * Returns cleanup function.
 */
export const setupActivityTracking = (onActivity: () => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  
  const handleActivity = () => {
    onActivity();
  };
  
  const handleVisibilityChange = () => {
    isTabVisible = document.visibilityState === 'visible';
    if (isTabVisible) {
      // Tab became visible - check if expired
      onActivity();
    }
  };
  
  const handleFocus = () => {
    isTabVisible = true;
    onActivity();
  };
  
  const handleBlur = () => {
    // Don't mark as immediately invisible - let visibilitychange handle it
    // This prevents flickering during alert() or confirm()
  };
  
  // Throttled mousemove - only update every 1 second max
  let mouseMoveTimeout: NodeJS.Timeout | null = null;
  const handleMouseMove = () => {
    if (mouseMoveTimeout) return;
    mouseMoveTimeout = setTimeout(() => {
      mouseMoveTimeout = null;
    }, 1000);
    onActivity();
  };
  
  // Register all event listeners
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleFocus);
  window.addEventListener('blur', handleBlur);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('keydown', handleActivity);
  document.addEventListener('click', handleActivity);
  document.addEventListener('touchstart', handleActivity);
  document.addEventListener('scroll', handleActivity);
  
  // Initialize visibility state
  isTabVisible = document.visibilityState === 'visible';
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('blur', handleBlur);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('keydown', handleActivity);
    document.removeEventListener('click', handleActivity);
    document.removeEventListener('touchstart', handleActivity);
    document.removeEventListener('scroll', handleActivity);
    if (mouseMoveTimeout) clearTimeout(mouseMoveTimeout);
  };
};

/**
 * Simple client-side rate limiting check.
 * Prevents more than 'limit' actions within 'window' ms.
 * @returns {boolean} True if the action is allowed.
 */
export const checkRateLimit = (action: string, limit: number = 5, windowMs: number = 60000) => {
    if (typeof window === 'undefined') return true;
    
    const now = Date.now();
    const rawData = localStorage.getItem(RATE_LIMIT_KEY);
    const data = rawData ? JSON.parse(rawData) : {};
    
    const actionData = data[action] || [];
    const recentActions = actionData.filter((t: number) => now - t < windowMs);
    
    if (recentActions.length >= limit) {
        return false;
    }
    
    recentActions.push(now);
    data[action] = recentActions;
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
    
    return true;
};
