// src/app/actions/auth.js
'use server';

import { createClient } from '@/utils/supabase/server';

export async function signIn(formData) {
  const email = formData.get('email');
  const password = formData.get('password');

  // Kiểm tra dữ liệu đầu vào
  if (!email || !password) {
    return { error: 'Email và mật khẩu là bắt buộc' };
  }

  try {
    const supabase = await createClient();

    // Đăng nhập bằng Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Auth error:', error.message);
      return { error: error.message };
    }

    if (!data.user) {
      return { error: 'Không tìm thấy thông tin người dùng' };
    }

    // Lấy thông tin role của user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, roles:roles(name)')
      .eq('id', data.user.id)
      .single();

    if (userError) {
      console.error('User data error:', userError.message);
      return { error: 'Không thể lấy thông tin người dùng' };
    }

    // Đảm bảo có dữ liệu role
    if (!userData || !userData.roles || !userData.roles.name) {
      return { error: 'Không tìm thấy thông tin vai trò người dùng' };
    }

    // Trả về thông tin đăng nhập thành công
    return {
      success: true,
      role: userData.roles.name,
      user: data.user,
      userData,
    };
  } catch (error) {
    console.error('Unexpected error in signIn:', error);
    return { error: 'Lỗi hệ thống, vui lòng thử lại sau' };
  }
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Error signing out:', error);
    return { error: error.message };
  }

  return { success: true };
}

export async function getSession() {
  try {
    const supabase = await createClient();

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error('Session error:', error);
      return { error: error.message };
    }

    if (!session?.user) {
      return { user: null };
    }

    // Get user role information
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, roles:roles(name)')
      .eq('id', session.user.id)
      .single();

    if (userError) {
      console.error('User data error:', userError);
      return { error: 'Unable to get user information' };
    }

    return {
      user: session.user,
      userData,
    };
  } catch (error) {
    console.error('Unexpected auth error:', error);
    return { error: 'Internal server error' };
  }
}
