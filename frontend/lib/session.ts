// Session Management Utility for CareForAb
// Tracks user activity and handles the 10-minute session timeout rule.

const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds
const ACTIVITY_KEY = 'careforab_last_activity';
const RATE_LIMIT_KEY = 'careforab_rate_limit';

/**
 * Updates the last activity timestamp in localStorage.
 */
export const updateLastActivity = () => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
};

/**
 * Checks if the session has expired based on the 10-minute rule.
 * @returns {boolean} True if session is expired or doesn't exist.
 */
export const isSessionExpired = () => {
    if (typeof window === 'undefined') return false;
    
    const lastActivity = localStorage.getItem(ACTIVITY_KEY);
    if (!lastActivity) return true;
    
    const now = Date.now();
    const elapsed = now - parseInt(lastActivity);
    
    return elapsed > SESSION_TIMEOUT;
};

/**
 * Clears the session activity timestamp.
 */
export const clearSession = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACTIVITY_KEY);
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
