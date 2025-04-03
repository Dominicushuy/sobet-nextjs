'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

// Tạo context
const AuthContext = createContext();

// Hook để sử dụng AuthContext
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

  useEffect(() => {
    // Lấy phiên hiện tại
    const getSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          setUser(null);
          setRole(null);
          setLoading(false);
          return;
        }

        if (session) {
          setUser(session.user);

          // Lấy thông tin role
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('roles:roles(name)')
            .eq('id', session.user.id)
            .single();

          if (userError) {
            console.error('Error getting user role:', userError);
            setRole(null);
          } else {
            setRole(userData.roles.name);
          }
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

    getSession();

    // Lắng nghe sự thay đổi xác thực
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setUser(session.user);

          // Lấy thông tin role
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('roles:roles(name)')
            .eq('id', session.user.id)
            .single();

          if (userError) {
            console.error('Error getting user role:', userError);
            setRole(null);
          } else {
            setRole(userData.roles.name);
          }
        } else {
          setUser(null);
          setRole(null);
        }

        setLoading(false);
      }
    );

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [supabase, router]);

  // Đăng xuất
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

  // Kiểm tra quyền truy cập
  const checkAccess = (allowedRoles) => {
    if (!role) return false;
    return allowedRoles.includes(role);
  };

  // Giá trị cung cấp cho context
  const value = {
    user,
    role,
    loading,
    signOut,
    isAdmin: role === 'admin',
    isSuperAdmin: role === 'super_admin',
    isUser: role === 'user',
    checkAccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
