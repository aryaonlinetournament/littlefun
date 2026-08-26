export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MODERATOR: 'MODERATOR',
  SUPPORT: 'SUPPORT',
  OPERATIONS: 'OPERATIONS',
  CUSTOMER: 'CUSTOMER',
  PROVIDER: 'PROVIDER',
} as const;

export type UserRole = keyof typeof USER_ROLES;

export const USER_STATUSES = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  BANNED: 'BANNED',
  DELETED: 'DELETED',
  PENDING: 'PENDING',
} as const;

export const PROFILE_TYPES = {
  REAL_PERSON: 'REAL_PERSON',
  PROVIDER: 'PROVIDER',
  AI_ASSISTED: 'AI_ASSISTED',
  SIMULATED: 'SIMULATED',
} as const;

export const DISCOVERY_STATUSES = {
  VISIBLE: 'VISIBLE',
  HIDDEN: 'HIDDEN',
  PAUSED: 'PAUSED',
  PENDING_REVIEW: 'PENDING_REVIEW',
} as const;

export const REQUEST_STATUSES = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  MATCHING: 'MATCHING',
  PENDING_RESPONSE: 'PENDING_RESPONSE',
  ACCEPTED: 'ACCEPTED',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  DISPUTED: 'DISPUTED',
} as const;

export const NOTIFICATION_TYPES = {
  NEW_MATCH: 'NEW_MATCH',
  NEW_MESSAGE: 'NEW_MESSAGE',
  REQUEST_RECEIVED: 'REQUEST_RECEIVED',
  REQUEST_ACCEPTED: 'REQUEST_ACCEPTED',
  REQUEST_REJECTED: 'REQUEST_REJECTED',
  REQUEST_CANCELLED: 'REQUEST_CANCELLED',
  MEETING_REMINDER: 'MEETING_REMINDER',
  PROFILE_VERIFIED: 'PROFILE_VERIFIED',
  ACCOUNT_WARNING: 'ACCOUNT_WARNING',
  LIKE_RECEIVED: 'LIKE_RECEIVED',
} as const;

export const PLAN_NAMES = {
  FREE: 'FREE',
  BASIC: 'BASIC',
  PRO: 'PRO',
  PREMIUM: 'PREMIUM',
} as const;

// Role permissions — server-side only, never trust client
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: [
    'manage:users', 'manage:profiles', 'manage:requests',
    'manage:config', 'manage:plans', 'view:audit_logs', 'manage:cities',
  ],
  MODERATOR: ['review:reports', 'review:profiles', 'moderate:conversations'],
  SUPPORT: ['view:users', 'view:requests', 'respond:support'],
  OPERATIONS: ['manage:requests', 'view:schedules'],
  CUSTOMER: ['manage:own_profile', 'use:discovery', 'send:messages', 'create:requirements'],
  PROVIDER: ['manage:own_profile', 'view:requirements', 'respond:requests'],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes('*') || perms.includes(permission);
}

// Admin roles (non-customer facing)
export const ADMIN_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT', 'OPERATIONS'];

// Profile completion weights
export const COMPLETION_WEIGHTS = {
  display_name: 15,
  date_of_birth: 10,
  gender: 10,
  bio: 15,
  city_id: 10,
  area_id: 5,
  photos: 20,  // at least 1 photo
  interests: 10,
  availability: 5,
} as const;

export const PROFILE_COMPLETION_BUCKETS = {
  INCOMPLETE: { min: 0, max: 49, label: 'Incomplete' },
  BASIC: { min: 50, max: 79, label: 'Basic' },
  ALMOST: { min: 80, max: 99, label: 'Almost Complete' },
  COMPLETE: { min: 100, max: 100, label: 'Complete' },
} as const;
