// src/providers/AuthProvider.jsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import axios from 'axios';
import { toast } from 'sonner';

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
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const fetchUserData = async () => {
    try {
      console.log('Fetching user data from API...');
      const { data } = await axios.get('/api/auth/user');
      console.log('User data received:', data);

      if (data && data.roles) {
        setRole(data.roles.name);
        return data.roles.name;
      }
      return null;
    } catch (error) {
      console.error(
        'Error fetching user data from API:',
        error.response?.data || error.message
      );
      return null;
    }
  };

  useEffect(() => {
    const getSession = async () => {
      try {
        console.log('Getting session...');
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        console.log('Session result:', {
          session: session?.user?.id ? 'exists' : 'none',
          error,
        });

        if (error) {
          console.error('Error getting session:', error);
          setUser(null);
          setRole(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          await fetchUserData();
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.error('Auth provider error:', error);
        setUser(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            console.log('User session detected:', session.user.id);
            setUser(session.user);
            await fetchUserData();
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setUser(null);
          setRole(null);
        }

        setLoading(false);
      }
    );

    // Get initial session
    getSession();

    return () => {
      console.log('Cleaning up auth listener');
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error('Đã xảy ra lỗi khi đăng xuất');
        console.error('Error signing out:', error);
        return;
      }

      toast.success('Đăng xuất thành công');
      setUser(null);
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
    if (user?.id) {
      await fetchUserData();
    }
  };

  const value = {
    user,
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
