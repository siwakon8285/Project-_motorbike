'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'customer' | 'admin' | 'mechanic';
  profile?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
  };
  vehicles?: any[];
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Configure Axios
axios.defaults.baseURL = 'http://127.0.0.1:5001';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Safety timeout to prevent infinite loading
    const safetyTimer = setTimeout(() => {
        console.warn('Auth check timed out, forcing loading to false');
        setLoading(false);
    }, 1500); // Reduced to 1.5s for faster feedback

    const initAuth = async () => {
      try {
        console.log('Initializing Auth...');
        const token = localStorage.getItem('token');
        if (token) {
          console.log('Found token, fetching user...');
          axios.defaults.headers.common['x-auth-token'] = token;
          try {
             // Use explicit full URL to be sure
             const res = await axios.get('http://127.0.0.1:5001/api/auth/me', { timeout: 2000 });
             setUser(res.data);
             console.log('User fetched successfully');
          } catch (e) {
             console.error("Fetch user failed", e);
             localStorage.removeItem('token');
             delete axios.defaults.headers.common['x-auth-token'];
             setUser(null);
          }
        } else {
          console.log('No token found');
          setUser(null);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    return () => clearTimeout(safetyTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUser = async () => {
    // Legacy function, might be used by login/register
    try {
        const res = await axios.get('http://127.0.0.1:5001/api/auth/me', { timeout: 3000 });
        setUser(res.data);
    } catch (e) {
        console.error("Fetch user failed", e);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await axios.post('/api/auth/login', { email, password }, { timeout: 10000 });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      axios.defaults.headers.common['x-auth-token'] = token;
      setUser(user);
      toast.success('Login successful!');
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      toast.error(err.response?.data?.message || 'Login failed');
      throw err;
    }
  };

  const register = async (userData: any) => {
    try {
      const res = await axios.post('/api/auth/register', userData, { timeout: 10000 });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      axios.defaults.headers.common['x-auth-token'] = token;
      setUser(user);
      toast.success('Registration successful!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['x-auth-token'];
    setUser(null);
    router.push('/login');
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
