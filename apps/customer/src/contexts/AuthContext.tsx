import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
import { auth } from '../lib/firebase';
import { authApi, usersApi, type ClientRegisterPayload } from '../lib/api';

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
        if (meData.user.profiles?.verification_status) {
          setVerificationStatus(meData.user.profiles.verification_status);
        }

        const isSuperAdmin = meData.user.role === 'SUPER_ADMIN' || meData.user.email?.toLowerCase().trim() === 'aryaonlinetournament@gmail.com';
        const isApproved = isSuperAdmin || meData.user.status === 'ACTIVE' || meData.user.profiles?.verification_status === 'APPROVED';

        return {
          userStatus: meData.user.status,
          isApproved,
          isPendingApproval: !isApproved && meData.user.status === 'PENDING',
        };
      }
    } catch (err) {
      console.error('Auth status sync error:', err);
    }
    setUserStatus((prev) => prev ?? 'ACTIVE');
    return { userStatus: 'ACTIVE' as UserStatus, isApproved: true, isPendingApproval: false };
  }, []);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        await syncUserData();
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

    return unsubscribe;
  }, [syncUserData]);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    setUser(cred.user);
    const result = await syncUserData();
    setIsLoading(false);
    return result;
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    setIsLoading(true);
    const cred = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    if (displayName && cred.user) {
      await updateProfile(cred.user, { displayName });
    }
    setUser(cred.user);
    await syncUserData();
    setIsLoading(false);
  };

  const registerClient = async (payload: ClientRegisterPayload) => {
    const res = await authApi.registerClient(payload);
    if (res.uniqueId) setUniqueId(res.uniqueId);
    setUserStatus('PENDING');
    setVerificationStatus('PENDING');
    return { uniqueId: res.uniqueId };
  };

  const refreshUser = async () => {
    if (auth.currentUser) {
      await syncUserData();
    }
  };

  const logOut = async () => {
    await signOut(auth);
    setUser(null);
    setUserId(null);
    setUniqueId(null);
    setUserRole(null);
    setUserStatus(null);
    setVerificationStatus(null);
  };

  const isSuperAdmin = userRole === 'SUPER_ADMIN' || user?.email?.toLowerCase().trim() === 'aryaonlinetournament@gmail.com';
  const isPendingApproval =
    Boolean(user) &&
    !isSuperAdmin &&
    userStatus === 'PENDING';

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
