import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    // Check both localStorage and sessionStorage for token
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    if (token) {
      try {
        const userData = await api.getProfile();
        setUser(userData);
      } catch (error) {
        console.error('Auth check failed:', error);
        // Don't remove token immediately - might be temporary network issue
        // Auto-refresh will handle expired tokens
      }
    }
    setIsLoading(false);
  };

  const login = async (email: string, password: string, rememberMe: boolean = true) => {
    try {
      const response = await api.login(email, password);

      const { access_token, refresh_token, user: userData } = response;

      if (!access_token || !refresh_token) {
        throw new Error('No tokens received from server');
      }

      // ✅ SECURITY: Store tokens based on "Remember Me" preference
      if (rememberMe) {
        // Persistent storage - tokens survive browser restart
        localStorage.setItem('token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
      } else {
        // Session storage - tokens cleared when browser/tab closes
        // Only store access_token (15 min), no refresh_token
        sessionStorage.setItem('token', access_token);
        // Don't store refresh_token for security - user will need to login again after 15 min
      }

      setUser(userData);

      // Небольшая задержка чтобы token успел сохраниться
      await new Promise(resolve => setTimeout(resolve, 100));

      // ✅ Redirect based on user role (case-insensitive)
      const role = userData.role.toUpperCase();

      if (role === 'ADMIN') {
        router.push('/admin');
      } else if (role === 'DOCTOR') {
        router.push('/doctor');
      } else if (role === 'COURIER') {
        router.push('/courier');
      } else {
        router.push('/dashboard');
      }
    } catch (error: unknown) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // ✅ SECURITY: Invalidate refresh token on server
      await api.logout();
    } catch (error) {
      console.error('Logout request failed:', error);
      // Continue with local cleanup even if request fails
    } finally {
      // Clear tokens from both storages
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('refresh_token');
      }
      // Clear local state
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}