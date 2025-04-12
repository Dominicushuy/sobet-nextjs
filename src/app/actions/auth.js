// src/app/actions/auth.js
'use server';

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

export async function signIn(formData) {
  const username = formData.get('username');
  const password = formData.get('password');

  // Kiểm tra dữ liệu đầu vào
  if (!username || !password) {
    return { data: null, error: 'Tên đăng nhập và mật khẩu là bắt buộc' };
  }

  try {
    // Sử dụng supabaseAdmin để bypass RLS policies khi tìm email từ username
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('username', username)
      .single();

    if (userError || !userData) {
      console.error(
        'User lookup error:',
        userError?.message || 'User not found'
      );
      return { data: null, error: 'Tài khoản không tồn tại' };
    }

    const email = userData.email;

    if (!email) {
      return { data: null, error: 'Không tìm thấy email cho tài khoản này' };
    }

    // Sử dụng client supabase thông thường cho việc đăng nhập
    const supabase = await createClient();

    // Đăng nhập bằng Supabase Auth với email đã tìm được
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Auth error:', error.message);
      return { data: null, error: 'Tên đăng nhập hoặc mật khẩu không đúng' };
    }

    if (!data.user) {
      return { data: null, error: 'Không tìm thấy thông tin người dùng' };
    }

    // Lấy thông tin role của user - có thể sử dụng supabase thông thường vì lúc này đã đăng nhập
    const { data: completeUserData, error: completeUserError } = await supabase
      .from('users')
      .select('*, roles:roles(name)')
      .eq('id', data.user.id)
      .single();

    if (completeUserError) {
      console.error('User data error:', completeUserError.message);
      return { data: null, error: 'Không thể lấy thông tin người dùng' };
    }

    // Đảm bảo có dữ liệu role
    if (
      !completeUserData ||
      !completeUserData.roles ||
      !completeUserData.roles.name
    ) {
      return {
        data: null,
        error: 'Không tìm thấy thông tin vai trò người dùng',
      };
    }

    // Trả về thông tin đăng nhập thành công
    return {
      data: {
        success: true,
        role: completeUserData.roles.name,
        user: data.user,
        userData: completeUserData,
      },
    };
  } catch (error) {
    console.error('Unexpected error in signIn:', error);
    return { data: null, error: 'Lỗi hệ thống, vui lòng thử lại sau' };
  }
}

export async function signOut() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error signing out:', error);
      return { data: null, error: error.message };
    }

    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Unexpected error in signOut:', error);
    return { data: null, error: 'Lỗi hệ thống khi đăng xuất' };
  }
}

export async function getSession() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error('Session error:', error);
      return { user: null, userData: null, error: error.message };
    }

    if (!user) {
      return { user: null, userData: null, error: null };
    }

    // Get user role information
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, roles:roles(name)')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('User data error:', userError);
      return {
        user,
        userData: null,
        error: 'Unable to get user information',
      };
    }

    return {
      user,
      userData,
      error: null,
    };
  } catch (error) {
    console.error('Unexpected auth error:', error);
    return { user: null, userData: null, error: 'Internal server error' };
  }
}
