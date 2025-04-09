// src/app/actions/profile.js
'use server';

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

// Lấy thông tin profile của user
export async function getUserProfile(userId) {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*, roles:roles(name)')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return { data: null, error: error.message };
    }

    return { data: user, error: null };
  } catch (error) {
    console.error('Unexpected error in getUserProfile:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Đổi mật khẩu
export async function changeUserPassword(userId, currentPassword, newPassword) {
  try {
    const supabase = await createClient();

    // Xác thực mật khẩu hiện tại trước
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: undefined, // Sẽ lấy từ session
      password: currentPassword,
    });

    if (authError) {
      return { data: null, error: 'Mật khẩu hiện tại không chính xác' };
    }

    // Nếu xác thực thành công, đổi mật khẩu
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error('Error changing password:', error);
      return { data: null, error: error.message };
    }

    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Unexpected error in changeUserPassword:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Cập nhật thông tin cá nhân
export async function updateUserProfile(userId, userData) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        full_name: userData.fullName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      return { data: null, error: error.message };
    }

    revalidatePath('/profile');
    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in updateUserProfile:', error);
    return { data: null, error: 'Internal server error' };
  }
}
