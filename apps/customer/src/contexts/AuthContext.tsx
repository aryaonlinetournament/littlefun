import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { useQueryClient } from '@tanstack/react-query';
import { auth } from '../lib/firebase';
import { authApi, usersApi, clearTokenCache, type ClientRegisterPayload } from '../lib/api';

export type UserStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'BANNED' | 'DELETED';
export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_SUBMITTED';

interface UserMeResponse {
  success: boolean;
  user: {
    id: string;
    unique_id: string | null;
    status: UserStatus;
    role: string;
    email: string | null;
    profiles?: {
      id: string;
      display_name: string;
      verification_status: VerificationStatus;
      discovery_status: string;
      profile_completion: number;
    } | null;
  };
}

interface AuthContextValue {
  user: User | null;
  userId: string | null;            // Supabase users.id
  uniqueId: string | null;          // e.g. #LF-1001
  userStatus: UserStatus | null;    // ACTIVE, PENDING, etc.
  verificationStatus: VerificationStatus | null;
  isPendingApproval: boolean;       // true if status === 'PENDING'
  isLoading: boolean;
  isNewUser: boolean;
  signIn: (email: string, password: string) => Promise<{ userStatus: UserStatus | null; isApproved: boolean; isPendingApproval: boolean }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  registerClient: (payload: ClientRegisterPayload) => Promise<{ uniqueId: string }>;
  refreshUser: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [uniqueId, setUniqueId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  const syncUserData = useCallback(async () => {
    try {
      // ⚡ Run /register and /me in PARALLEL (was serial — 2 roundtrips → now 1)
      const [regResult, meData] = await Promise.all([
        authApi.register().catch(() => ({ isNewUser: false, uniqueId: null })),
        usersApi.me().catch(() => null) as Promise<UserMeResponse | null>,
      ]);

      if (regResult?.isNewUser !== undefined) setIsNewUser(regResult.isNewUser);
      if (regResult?.uniqueId) setUniqueId(regResult.uniqueId);

      if (meData?.user) {
        setUserId(meData.user.id);
        setUserStatus(meData.user.status);
        setUserRole(meData.user.role);
        if (meData.user.unique_id) setUniqueId(meData.user.unique_id);

        const profileObj = Array.isArray(meData.user.profiles)
          ? meData.user.profiles[0]
          : meData.user.profiles;

        const effectiveVerifStatus: VerificationStatus =
          profileObj?.verification_status ?? (meData.user.status === 'ACTIVE' ? 'APPROVED' : 'PENDING');
        setVerificationStatus(effectiveVerifStatus);

        const isSuperAdmin =
          meData.user.role === 'SUPER_ADMIN' ||
          meData.user.email?.toLowerCase().trim() === 'aryaonlinetournament@gmail.com';

        const isApproved =
          isSuperAdmin ||
          meData.user.status === 'ACTIVE' ||
          effectiveVerifStatus === 'APPROVED';

        return {
          userStatus: meData.user.status,
          isApproved,
          isPendingApproval: !isApproved,
        };
      }
    } catch (err) {
      console.error('Auth status sync error:', err);
    }
    setUserStatus((prev) => prev ?? 'PENDING');
    setVerificationStatus((prev) => prev ?? 'PENDING');
    return { userStatus: 'PENDING' as UserStatus, isApproved: false, isPendingApproval: true };
  }, []);

  // ── Periodic re-sync: poll every 30s while user is logged in ──────────
  // This ensures that if an admin changes user status (PENDING → ACTIVE),
  // the customer app reflects it within ~30 seconds without a page refresh.
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTokenCache();
      queryClient.clear();
      setUser(firebaseUser);

      // Clear any existing polling interval first
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }

      if (firebaseUser) {
        await syncUserData();

        // Start 30s polling to detect admin-side status changes in real-time
        syncIntervalRef.current = setInterval(async () => {
          if (auth.currentUser) {
            await syncUserData();
          }
        }, 30_000);
      } else {
        setUserId(null);
        setUniqueId(null);
        setUserRole(null);
        setUserStatus(null);
        setVerificationStatus(null);
        setIsNewUser(false);
      }

      setIsLoading(false);
    });

    return () => {
      unsubscribe();
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [syncUserData, queryClient]);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    clearTokenCache();
    queryClient.clear();
    const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    setUser(cred.user);
    const result = await syncUserData();
    setIsLoading(false);
    return result;
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    setIsLoading(true);
    clearTokenCache();
    queryClient.clear();
    const cred = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    if (displayName && cred.user) {
      await updateProfile(cred.user, { displayName });
    }
    setUser(cred.user);
    await syncUserData();
    setIsLoading(false);
  };

  const registerClient = async (payload: ClientRegisterPayload) => {
    try {
      const res = await authApi.registerClient(payload);
      if (res?.uniqueId) setUniqueId(res.uniqueId);
      setUserStatus('PENDING');
      setVerificationStatus('PENDING');
      return { uniqueId: res?.uniqueId || ('#LF-' + Math.floor(100000 + Math.random() * 900000)) };
    } catch (e) {
      console.warn('registerClient backend sync deferred:', e);
      setUserStatus('PENDING');
      setVerificationStatus('PENDING');
      const fallbackId = '#LF-' + Math.floor(100000 + Math.random() * 900000);
      setUniqueId(fallbackId);
      return { uniqueId: fallbackId };
    }
  };

  const refreshUser = async () => {
    if (auth.currentUser) {
      await syncUserData();
    }
  };

  const logOut = async () => {
    // Stop polling before sign-out
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
    clearTokenCache();
    queryClient.clear();
    await signOut(auth);
    setUser(null);
    setUserId(null);
    setUniqueId(null);
    setUserRole(null);
    setUserStatus(null);
    setVerificationStatus(null);
  };

  const isSuperAdmin = userRole === 'SUPER_ADMIN' || user?.email?.toLowerCase().trim() === 'aryaonlinetournament@gmail.com';
  const isApproved = isSuperAdmin || userStatus === 'ACTIVE' || verificationStatus === 'APPROVED';
  const isPendingApproval = Boolean(user) && !isApproved;

  return (
    <AuthContext.Provider value={{
      user,
      userId,
      uniqueId,
      userStatus,
      verificationStatus,
      isPendingApproval,
      isLoading,
      isNewUser,
      signIn,
      signUp,
      registerClient,
      refreshUser,
      logOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
