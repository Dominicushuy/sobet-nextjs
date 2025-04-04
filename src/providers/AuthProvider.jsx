// src/providers/AuthProvider.jsx
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();

  const fetchSession = useCallback(async () => {
    try {
      console.log('Fetching session...');
      const { user, userData, error } = await getSession();

      if (error) {
        console.error('Error getting session:', error);
        setUser(null);
        setUserData(null);
        setRole(null);
        setLoading(false);
        return;
      }

      if (user) {
        setUser(user);
        setUserData(userData);
        setRole(userData?.roles?.name);
      } else {
        setUser(null);
        setUserData(null);
        setRole(null);
      }
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

    // Setup interval to refresh session periodically
    const interval = setInterval(
      () => {
        if (user) fetchSession();
      },
      10 * 60 * 1000
    ); // Every 10 minutes

    return () => clearInterval(interval);
  }, [fetchSession, user]);

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await serverSignOut();

      if (error) {
        toast.error('Đã xảy ra lỗi khi đăng xuất');
        console.error('Error signing out:', error);
        return;
      }

      toast.success('Đăng xuất thành công');
      setUser(null);
      setUserData(null);
      setRole(null);
      router.push('/login');
    } catch (error) {
      toast.error('Đã xảy ra lỗi khi đăng xuất');
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAccess = (allowedRoles) => {
    if (!role) return false;
    return allowedRoles.includes(role);
  };

  const refreshSession = async () => {
    console.log('Refreshing session...');
    await fetchSession();
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
    checkAccess,
    refreshSession,
  };

  console.log('Auth context state:', { userId: user?.id, role, loading });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
