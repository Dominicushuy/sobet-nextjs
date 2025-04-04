// src/app/actions/auth.js
'use server';

import { createClient } from '@/utils/supabase/server';

export async function signIn(formData) {
  const email = formData.get('email');
  const password = formData.get('password');

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Get user role information
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*, roles:roles(name)')
    .eq('id', data.user.id)
    .single();

  if (userError) {
    return { error: 'Unable to get user information' };
  }

  return {
    success: true,
    role: userData.roles.name,
    user: data.user,
    userData,
  };
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
