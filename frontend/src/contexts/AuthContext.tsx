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
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
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
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    console.log('🔍 Checking auth - token:', token ? 'exists' : 'missing');

    if (token) {
      try {
        const userData = await api.getProfile();
        setUser(userData);
        console.log('✅ User loaded:', userData);
      } catch (error) {
        console.error('❌ Auth check failed:', error);
        localStorage.removeItem('token');
      }
    }
    setIsLoading(false);
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 Attempting login...', email);
      
      const response = await api.login(email, password);
      console.log('🔥 Login response:', response);
      
      const { access_token, user: userData } = response;

      if (!access_token) {
        throw new Error('No token received from server');
      }

      // Зберігаємо токен
      localStorage.setItem('token', access_token);
      
      console.log('✅ Token saved:', access_token.substring(0, 20) + '...');
      console.log('👤 User data:', userData);
      console.log('👤 User role:', userData.role, '(type:', typeof userData.role + ')');
      
      setUser(userData);

      // Невелика затримка щоб token встиг зберегтися
      await new Promise(resolve => setTimeout(resolve, 100));

      // ✅ Редирект залежно від ролі (case-insensitive)
      const role = userData.role.toUpperCase();
      
      console.log('🔄 Redirecting based on role:', role);
      
      if (role === 'ADMIN') {
        console.log('➡️ Redirecting to /admin');
        router.push('/admin');
      } else if (role === 'DOCTOR') {
        console.log('➡️ Redirecting to /doctor');
        router.push('/doctor');
      } else if (role === 'COURIER') {
        console.log('➡️ Redirecting to /courier');
        router.push('/courier');
      } else {
        console.log('➡️ Redirecting to /dashboard');
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    router.push('/login');
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