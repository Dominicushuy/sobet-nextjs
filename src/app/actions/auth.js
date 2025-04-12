'use server';

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function getSession() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { user: null, userData: null, error: userError?.message };
    }

    // Fetch user data from database
    const { data: userData, error: dataError } = await supabase
      .from('users')
      .select('*, roles:roles(name)')
      .eq('id', user.id)
      .single();

    if (dataError) {
      return { user, userData: null, error: dataError.message };
    }

    return { user, userData, error: null };
  } catch (error) {
    console.error('Error in getSession:', error);
    return { user: null, userData: null, error: error.message };
  }
}

export async function signIn(formData) {
  const supabase = await createClient();

  // Get form data
  const email = formData.get('email');
  const password = formData.get('password');

  if (!email || !password) {
    return { error: 'Email và mật khẩu là bắt buộc' };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Error during sign out:', error);
  }

  // Clear all cookies
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll();
  allCookies.forEach((cookie) => {
    cookieStore.delete(cookie.name);
  });

  redirect('/login');
}
