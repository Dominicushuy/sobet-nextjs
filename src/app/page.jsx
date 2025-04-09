// src/app/page.jsx

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Lấy thông tin user từ DB
  const { data: userData, error } = await supabase
    .from('users')
    .select('*, roles:roles(name)')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching user data:', error);
    redirect('/login');
  }

  // Kiểm tra tài khoản có bị khóa không
  if (!userData.is_active) {
    redirect('/account-suspended');
  }

  const role = userData?.roles?.name;

  // Chuyển hướng dựa vào role
  if (role === 'admin' || role === 'super_admin') {
    redirect('/admin/dashboard');
  } else {
    redirect('/dashboard');
  }
}
