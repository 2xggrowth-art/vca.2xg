import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { auth, AuthUser, AuthSession } from '@/lib/api';
import type { UserRole } from '@/types';

// Refresh 1 day before the 7-day JWT expiry (every 6 days)
const REFRESH_INTERVAL_MS = 6 * 24 * 60 * 60 * 1000;

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
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start/stop the token refresh timer
  const startRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    refreshTimerRef.current = setInterval(async () => {
      const { error } = await auth.refreshSession();
      if (error) {
        // Refresh failed — session expired, force sign out
        setUser(null);
      }
    }, REFRESH_INTERVAL_MS);
  }, []);

  const stopRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      try {
        const { data } = await auth.getUser();
        setUser(data.user);
        if (data.user) startRefreshTimer();
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Subscribe to auth changes
    const { data: { subscription } } = auth.onAuthStateChange((_event: string, session: AuthSession | null) => {
      if (session?.user) {
        setUser(session.user);
      } else if (_event === 'SIGNED_OUT') {
        setUser(null);
        stopRefreshTimer();
      }
    });

    return () => {
      subscription.unsubscribe();
      stopRefreshTimer();
    };
  }, [startRefreshTimer, stopRefreshTimer]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await auth.signInWithPassword({ email, password });
    if (error) {
      return { error: error.message };
    }
    setUser(data.user);
    startRefreshTimer();
    return { error: null };
  }, [startRefreshTimer]);

  const signOut = useCallback(async () => {
    stopRefreshTimer();
    await auth.signOut();
    setUser(null);
  }, [stopRefreshTimer]);

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
