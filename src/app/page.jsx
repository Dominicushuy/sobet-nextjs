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

  // Lấy thông tin role từ DB
  const { data: userData } = await supabase
    .from('users')
    .select('*, roles:roles(name)')
    .eq('id', user.id)
    .single();

  const role = userData?.roles?.name;

  // Chuyển hướng dựa vào role
  if (role === 'admin' || role === 'super_admin') {
    redirect('/admin/dashboard');
  } else {
    redirect('/dashboard');
  }
}
