// Re-export key types used across the backend

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MODERATOR'
  | 'SUPPORT'
  | 'OPERATIONS'
  | 'CUSTOMER'
  | 'PROVIDER';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED' | 'PENDING';

export type ProfileType = 'REAL_PERSON' | 'PROVIDER' | 'AI_ASSISTED' | 'SIMULATED';

export type DiscoveryStatus = 'VISIBLE' | 'HIDDEN' | 'PAUSED' | 'PENDING_REVIEW';

export type VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export type RequirementType =
  | 'OUTING'
  | 'DINNER'
  | 'COFFEE'
  | 'EVENT'
  | 'TRAVEL'
  | 'COMPANIONSHIP'
  | 'OTHER';

export type RequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'MATCHING'
  | 'PENDING_RESPONSE'
  | 'ACCEPTED'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'DISPUTED';

export type NotificationType =
  | 'NEW_MATCH'
  | 'NEW_MESSAGE'
  | 'REQUEST_RECEIVED'
  | 'REQUEST_ACCEPTED'
  | 'REQUEST_REJECTED'
  | 'REQUEST_CANCELLED'
  | 'MEETING_REMINDER'
  | 'PROFILE_VERIFIED'
  | 'ACCOUNT_WARNING'
  | 'LIKE_RECEIVED';

export type PlanName = 'FREE' | 'BASIC' | 'PRO' | 'PREMIUM';

export interface ApiResponse<T = undefined> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
