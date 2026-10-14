'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';

import { apiPost, apiGet } from './api-client';
import { tokenStorage } from './token-storage';

import type { SafeUser } from '@/types/api';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: SafeUser;
}

interface AuthContextValue {
  user: SafeUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<SafeUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();

  const refreshUser = useCallback(async () => {
    if (!tokenStorage.getAccessToken()) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const me = await apiGet<SafeUser>('/users/me');
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Defer so any setState inside refreshUser is not synchronous in the effect body
    queueMicrotask(() => {
      void refreshUser();
    });
  }, [refreshUser]);

  const login = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<SafeUser> => {
      const result = await apiPost<LoginResponse>(
        '/auth/login',
        {
          email,
          password,
        },
      );

      tokenStorage.setTokens(
        result.accessToken,
        result.refreshToken,
      );

      setUser(result.user);

      return result.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();

    tokenStorage.clear();
    setUser(null);

    if (refreshToken) {
      apiPost('/auth/logout', { refreshToken }).catch(() => {});
    }

    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider',
    );
  }

  return context;
}