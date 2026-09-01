import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import adminFetch from '../lib/api';

type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'SUPPORT' | 'OPERATIONS';

interface AdminUser {
  id: string;
  email: string | null;
  role: AdminRole;
  unique_id: string | null;
}

interface AdminAuthContextValue {
  user: User | null;
  adminUser: AdminUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

const ADMIN_ROLES: AdminRole[] = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT', 'OPERATIONS'];

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        const isSuperAdminEmail =
          fbUser.email?.toLowerCase().trim() === 'aryaonlinetournament@gmail.com' ||
          fbUser.uid === 'FkCSTRi6JBSfBf2haCnj8yCoOiC2';

        if (isSuperAdminEmail) {
          setAdminUser({
            id: fbUser.uid,
            email: fbUser.email,
            role: 'SUPER_ADMIN',
            unique_id: '#LF-1001',
          });
        }

        try {
          const data = await adminFetch<{ user: AdminUser }>('/api/users/me');
          if (ADMIN_ROLES.includes(data.user.role as AdminRole)) {
            setAdminUser(data.user);
          } else if (!isSuperAdminEmail) {
            // Not an admin — sign them out
            await signOut(auth);
            setAdminUser(null);
          }
        } catch {
          if (!isSuperAdminEmail) {
            setAdminUser(null);
          }
        }
      } else {
        setAdminUser(null);
      }
      setIsLoading(false);
    });

    return unsub;
  }, []);

  const signIn = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
    setUser(cred.user);

    const isSuperAdminEmail =
      cleanEmail === 'aryaonlinetournament@gmail.com' ||
      cred.user.uid === 'FkCSTRi6JBSfBf2haCnj8yCoOiC2';

    if (isSuperAdminEmail) {
      setAdminUser({
        id: cred.user.uid,
        email: cred.user.email,
        role: 'SUPER_ADMIN',
        unique_id: '#LF-1001',
      });
    }

    try {
      const data = await adminFetch<{ user: AdminUser }>('/api/users/me');
      if (ADMIN_ROLES.includes(data.user.role as AdminRole)) {
        setAdminUser(data.user);
      } else if (!isSuperAdminEmail) {
        await signOut(auth);
        setAdminUser(null);
        throw new Error('Access denied. Admin accounts only.');
      }
    } catch (err) {
      if (!isSuperAdminEmail) {
        await signOut(auth);
        setAdminUser(null);
        throw err;
      }
    }
  };

  const logOut = async () => {
    await signOut(auth);
    setAdminUser(null);
  };

  return (
    <AdminAuthContext.Provider value={{
      user, adminUser, isLoading,
      isAdmin: adminUser !== null,
      signIn, logOut,
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be inside <AdminAuthProvider>');
  return ctx;
}
