// src/app/actions/auth.js
'use server';

import { createClient } from '@/utils/supabase/server';

export async function signIn(formData) {
  const email = formData.get('email');
  const password = formData.get('password');

  const supabase = createClient();

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
    .select('role_id, roles:roles(name)')
    .eq('id', data.user.id)
    .single();

  if (userError) {
    return { error: 'Unable to get user information' };
  }

  return {
    success: true,
    role: userData.roles.name,
    user: data.user,
  };
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function getSession() {
  const supabase = createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return { error: error.message };
  }

  if (!user) {
    return { user: null };
  }

  // Get user role information
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*, roles:roles(name)')
    .eq('id', user.id)
    .single();

  if (userError) {
    return { error: 'Unable to get user information' };
  }

  return {
    user,
    userData,
  };
}
