import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import { authApi, usersApi } from '../lib/api';
import toast from 'react-hot-toast';

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
    const token = Cookies.get('token');
    const storedUserId = localStorage.getItem('userId');

    console.log('🔍 Checking auth - token:', token ? 'exists' : 'missing', 'userId:', storedUserId); // DEBUG

    if (token && storedUserId) {
      try {
        const response = await usersApi.getProfile();
        setUser(response.data);
        console.log('✅ User loaded:', response.data); // DEBUG
      } catch (error) {
        console.error('❌ Auth check failed:', error); // DEBUG
        Cookies.remove('token');
        localStorage.removeItem('userId');
      }
    }
    setIsLoading(false);
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      console.log('📥 Login response:', response.data); // DEBUG
      
      const { access_token, user: userData } = response.data;

      if (!access_token) {
        throw new Error('No token received from server');
      }

      // ⭐ Зберігаємо токен в cookies
      Cookies.set('token', access_token, { 
        expires: 7, // 7 днів
        path: '/',
        sameSite: 'lax'
      });
      localStorage.setItem('userId', userData.id);
      
      console.log('✅ Token saved to cookie:', access_token.substring(0, 20) + '...'); // DEBUG
      
      setUser(userData);
      toast.success('Login successful!');

      // ⭐ Невелика затримка щоб cookie встиг збережеться
      await new Promise(resolve => setTimeout(resolve, 100));

      // Редирект залежно від ролі
      if (userData.role === 'ADMIN') {
        router.push('/admin');
      } else if (userData.role === 'DOCTOR') {
        router.push('/doctor');
      } else if (userData.role === 'COURIER') {
        router.push('/courier');
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('❌ Login error:', error.response?.data); // DEBUG
      toast.error(error.response?.data?.message || 'Login failed');
      throw error;
    }
  };

  const logout = () => {
    Cookies.remove('token');
    localStorage.removeItem('userId');
    setUser(null);
    router.push('/login');
    toast.success('Logged out successfully');
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