import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { auth, AuthUser, AuthSession } from '@/lib/api';
import type { UserRole } from '@/types';

interface AuthContextValue {
  user: AuthUser | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      try {
        const { data } = await auth.getUser();
        setUser(data.user);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Subscribe to auth changes
    const { data: { subscription } } = auth.onAuthStateChange((_event: string, session: AuthSession | null) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await auth.signInWithPassword({ email, password });
    if (error) {
      return { error: error.message };
    }
    setUser(data.user);
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await auth.signOut();
    setUser(null);
  }, []);

  // Extract role from user metadata
  const role = user?.app_metadata?.role as UserRole | undefined
    || user?.user_metadata?.role as UserRole | undefined
    || null;

  return (
    <AuthContext.Provider value={{
      user,
      role,
      isLoading,
      isAuthenticated: !!user,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;
