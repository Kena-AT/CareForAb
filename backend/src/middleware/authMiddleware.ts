import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../services/reminderService';

// Augment Express Request type using interface augmentation
interface AuthenticatedRequest extends Request {
  user?: { id: string; [key: string]: unknown };
  requestId?: string;
}

export type AuthRequest = AuthenticatedRequest;

// JWT verification is faster than calling Supabase for every request
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL || '';

const EXPECTED_AUDIENCE = `authenticated`;
const EXPECTED_ISSUER = `${SUPABASE_URL}/auth/v1`;

/**
 * Hardened JWT verification options
 * - Explicit algorithm restriction (prevent algorithm confusion attacks)
 * - Issuer verification
 * - Audience verification
 * - Clock skew tolerance (60 seconds)
 */
const JWT_VERIFY_OPTIONS: jwt.VerifyOptions = {
  algorithms: ['HS256'],
  issuer: EXPECTED_ISSUER,
  audience: EXPECTED_AUDIENCE,
  clockTolerance: 60, // 60 second tolerance for clock skew
  complete: false,
};

/**
 * Extract and verify JWT token locally with full security checks.
 * Falls back to Supabase verification if local verification fails or secret not configured.
 */
export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized: No token provided',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Attempt local JWT verification first (faster, no network call)
    if (SUPABASE_JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, SUPABASE_JWT_SECRET, JWT_VERIFY_OPTIONS) as { sub: string; exp?: number; nbf?: number; [key: string]: unknown };
        
        // Additional explicit validation beyond jwt.verify
        const now = Math.floor(Date.now() / 1000);
        
        if (decoded.exp && decoded.exp < now - 60) {
          throw new Error('Token expired');
        }
        if (decoded.nbf && decoded.nbf > now + 60) {
          throw new Error('Token not yet valid');
        }
        if (!decoded.sub) {
          throw new Error('Token missing subject claim');
        }
        
        req.user = { id: decoded.sub, ...decoded };
        return next();
      } catch (jwtError: unknown) {
        // Local verification failed - fall through to Supabase
        const errorMessage = jwtError instanceof Error ? jwtError.message : 'Unknown error';
        console.log('[AuthMiddleware] Local JWT verify failed:', errorMessage);
      }
    }

    // Fallback: Verify with Supabase (makes network call)
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized: Invalid or expired token',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[AuthMiddleware] Unexpected error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during authentication',
    });
  }
};
