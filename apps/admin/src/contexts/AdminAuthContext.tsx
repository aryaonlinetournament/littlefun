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
        try {
          const data = await adminFetch<{ user: AdminUser }>('/api/users/me');
          if (ADMIN_ROLES.includes(data.user.role as AdminRole)) {
            setAdminUser(data.user);
          } else {
            // Not an admin — sign them out
            await signOut(auth);
            setAdminUser(null);
          }
        } catch {
          setAdminUser(null);
        }
      } else {
        setAdminUser(null);
      }
      setIsLoading(false);
    });

    return unsub;
  }, []);

  const signIn = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    setUser(cred.user);

    try {
      const data = await adminFetch<{ user: AdminUser }>('/api/users/me');
      if (ADMIN_ROLES.includes(data.user.role as AdminRole)) {
        setAdminUser(data.user);
      } else {
        await signOut(auth);
        setAdminUser(null);
        throw new Error('Access denied. Admin accounts only.');
      }
    } catch (err) {
      await signOut(auth);
      setAdminUser(null);
      throw err;
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
