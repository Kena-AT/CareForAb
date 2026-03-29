import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Identifies if an error is a transient network error (like a connection drop or CORS failure).
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  const message = error.message || (typeof error === 'string' ? error : '');
  
  // Handle Firefox/Chrome/Safari Network Error strings
  if (message.includes('NetworkError') || 
      message.includes('Failed to fetch') || 
      message.includes('Load failed')) {
    return true;
  }

  // Supabase/PostgREST specific network error indicators
  if (error.code === 'PGRST301' || error.status === 0 || error.code === 'NS_ERROR_CONNECTION_REFUSED' || error.code === 'TypeError: NetworkError') {
    return true;
  }
  
  // If it's an empty object {} and a TypeError, it's often a network failure in Firefox
  if (typeof error === 'object' && Object.keys(error).length === 0 && (message === '' || message.includes('fetch'))) {
    return true;
  }

  return false;
}
