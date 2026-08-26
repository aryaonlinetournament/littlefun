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
import { authApi } from '../lib/api';

interface AuthContextValue {
  user: User | null;
  userId: string | null;       // Supabase users.id
  uniqueId: string | null;     // e.g. #LF-1001
  isLoading: boolean;
  isNewUser: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [uniqueId, setUniqueId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          // Register / sync with backend
          const result = await authApi.register();
          setIsNewUser(result.isNewUser);
          setUniqueId(result.uniqueId);

          // Store userId from token
          const idTokenResult = await firebaseUser.getIdTokenResult();
          setUserId(idTokenResult.claims['sub'] ?? null);
        } catch (err) {
          console.error('Auth sync failed:', err);
        }
      } else {
        setUserId(null);
        setUniqueId(null);
        setIsNewUser(false);
      }

      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logOut = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, userId, uniqueId, isLoading, isNewUser, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
