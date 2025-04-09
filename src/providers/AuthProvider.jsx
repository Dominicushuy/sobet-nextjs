// src/providers/AuthProvider.jsx
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { toast } from 'sonner';
import { getSession, signOut as serverSignOut } from '@/app/actions/auth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      setLoading(true);
      const { user, userData, error } = await getSession();

      if (error || !user) {
        console.error('Error fetching session:', error);
        setUser(null);
        setUserData(null);
        setRole(null);
        return;
      }

      setUser(user);
      setUserData(userData);
      setRole(userData?.roles?.name);
    } catch (error) {
      console.error('Auth provider error:', error);
      setUser(null);
      setUserData(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await serverSignOut();

      if (error) {
        toast.error('Đã xảy ra lỗi khi đăng xuất');
        console.error('Signout error:', error);
        return;
      }

      setUser(null);
      setUserData(null);
      setRole(null);
      toast.success('Đăng xuất thành công');
      // router.push('/login');
      window.location.href = '/login';
    } catch (error) {
      console.error('Unexpected error during signout:', error);
      toast.error('Đã xảy ra lỗi khi đăng xuất');
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    userData,
    role,
    loading,
    signOut,
    isAdmin: role === 'admin',
    isSuperAdmin: role === 'super_admin',
    isUser: role === 'user',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
