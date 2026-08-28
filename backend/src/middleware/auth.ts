import { Request, Response, NextFunction } from 'express';
import { verifyFirebaseToken } from '../services/firebase/firebaseAdmin';
import { getSupabaseAdmin } from '../services/supabase/supabaseClient';
import { UserRole, ADMIN_ROLES } from '../config/constants';


import { config } from '../config/env';

export interface AuthenticatedUser {
  id: string;            // Supabase users.id (UUID)
  firebase_uid: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  status: string;
  plan_id: string | null;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

function extractBearer(req: Request): string | null {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

/**
 * requireAuth — Validates Firebase ID token, loads Supabase user.
 * Sets req.user with full user record.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractBearer(req);
  if (!token) {
    res.status(401).json({
      success: false,
      error: { code: 'AUTH_REQUIRED', message: 'Authentication required.' },
    });
    return;
  }

  try {
    const decoded = await verifyFirebaseToken(token);

    const supabase = getSupabaseAdmin();

    // 1. Try lookup by firebase_uid
    let { data: user } = await supabase
      .from('users')
      .select('id, firebase_uid, email, phone, role, status, plan_id')
      .eq('firebase_uid', decoded.uid)
      .maybeSingle();

    // 2. If not found by firebase_uid, try lookup by email (and link firebase_uid)
    if (!user && decoded.email) {
      const { data: userByEmail } = await supabase
        .from('users')
        .select('id, firebase_uid, email, phone, role, status, plan_id')
        .ilike('email', decoded.email)
        .maybeSingle();

      if (userByEmail) {
        await supabase
          .from('users')
          .update({ firebase_uid: decoded.uid })
          .eq('id', userByEmail.id);

        userByEmail.firebase_uid = decoded.uid;
        user = userByEmail;
      }
    }

    let currentUser = user;

    const superAdminEmail = (config.SUPER_ADMIN_EMAIL || 'aryaonlinetournament@gmail.com').toLowerCase().trim();
    const superAdminUid = config.SUPER_ADMIN_UID || 'FkCSTRi6JBSfBf2haCnj8yCoOiC2';

    const isSuperAdminMatch =
      (decoded.uid === superAdminUid) ||
      (Boolean(decoded.email) && decoded.email?.toLowerCase().trim() === superAdminEmail);

    if (!currentUser) {
      if (isSuperAdminMatch) {
        // 1. Try finding existing user by email
        const { data: existingAdmin } = await supabase
          .from('users')
          .select('id, firebase_uid, email, phone, role, status, plan_id')
          .ilike('email', superAdminEmail)
          .maybeSingle();

        if (existingAdmin) {
          await supabase
            .from('users')
            .update({ firebase_uid: decoded.uid, role: 'SUPER_ADMIN', status: 'ACTIVE' })
            .eq('id', existingAdmin.id);

          existingAdmin.firebase_uid = decoded.uid;
          existingAdmin.role = 'SUPER_ADMIN';
          existingAdmin.status = 'ACTIVE';
          currentUser = existingAdmin;
        } else {
          // 2. Insert new super admin record
          const { data: newAdmin } = await supabase
            .from('users')
            .insert({
              firebase_uid: decoded.uid,
              email: superAdminEmail,
              role: 'SUPER_ADMIN',
              status: 'ACTIVE',
            })
            .select('id, firebase_uid, email, phone, role, status, plan_id')
            .single();
          currentUser = newAdmin;
        }
      } else {
        // Auto-provision standard customer user with PENDING status
        const { data: newUser, error: insertErr } = await supabase
          .from('users')
          .insert({
            firebase_uid: decoded.uid,
            email: decoded.email || null,
            phone: (decoded as any).phone_number || null,
            role: 'CUSTOMER',
            status: 'PENDING',
          })
          .select('id, firebase_uid, email, phone, role, status, plan_id')
          .single();

        if (!insertErr && newUser) {
          currentUser = newUser;
          // Create initial stub profile & preferences
          const displayName = decoded.email?.split('@')[0] ?? (decoded as any).name ?? 'Client';
          await supabase.from('profiles').insert({
            user_id: newUser.id,
            display_name: displayName,
            profile_completion: 10,
            verification_status: 'PENDING',
            discovery_status: 'HIDDEN',
          });
          await supabase.from('user_preferences').insert({ user_id: newUser.id });
        }
      }
    } else if (currentUser && isSuperAdminMatch && currentUser.role !== 'SUPER_ADMIN') {
      // Elevate role if UID or Email matches super admin configuration
      await supabase.from('users').update({ role: 'SUPER_ADMIN', status: 'ACTIVE' }).eq('id', currentUser.id);
      currentUser.role = 'SUPER_ADMIN';
    }

    if (!currentUser) {
      res.status(401).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Unable to establish user profile. Please try logging in again.' },
      });
      return;
    }

    if (currentUser.status === 'SUSPENDED') {
      res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_SUSPENDED', message: 'Your account has been suspended.' },
      });
      return;
    }

    if (currentUser.status === 'BANNED') {
      res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_BANNED', message: 'Your account has been banned.' },
      });
      return;
    }

    if (currentUser.status === 'DELETED') {
      res.status(401).json({
        success: false,
        error: { code: 'ACCOUNT_DELETED', message: 'Account not found.' },
      });
      return;
    }

    req.user = currentUser as AuthenticatedUser;

    // Update last_active_at (non-blocking)
    supabase
      .from('users')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', currentUser.id)
      .then(() => {});

    next();
  } catch (err: unknown) {
    const isExpired =
      err instanceof Error &&
      (err.message.includes('expired') || (err as { code?: string }).code === 'auth/id-token-expired');

    res.status(401).json({
      success: false,
      error: {
        code: isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
        message: isExpired
          ? 'Session expired. Please sign in again.'
          : 'Invalid authentication token.',
      },
    });
  }
}

/**
 * requireRole — RBAC middleware. Must be used AFTER requireAuth.
 * Never trusts role from the frontend — always reads from DB via requireAuth.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required.' },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to perform this action.',
        },
      });
      return;
    }

    next();
  };
}

/**
 * requireAdmin — Shorthand for any admin-level role.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireRole(...ADMIN_ROLES)(req, res, next);
}

/**
 * requireSuperAdmin
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  requireRole('SUPER_ADMIN')(req, res, next);
}

/**
 * optionalAuth — Loads user if token present, continues without error if not.
 * Used for public endpoints that have different behavior for logged-in users.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractBearer(req);
  if (!token) {
    next();
    return;
  }

  try {
    const decoded = await verifyFirebaseToken(token);
    const supabase = getSupabaseAdmin();
    const { data: user } = await supabase
      .from('users')
      .select('id, firebase_uid, email, phone, role, status, plan_id')
      .eq('firebase_uid', decoded.uid)
      .single();

    if (user && user.status === 'ACTIVE') {
      req.user = user as AuthenticatedUser;
    }
  } catch {
    // Silently ignore invalid tokens on optional auth
  }

  next();
}
