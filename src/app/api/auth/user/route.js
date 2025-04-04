// src/app/api/auth/user/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Lấy thông tin user hiện tại từ session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Lấy thông tin chi tiết của user từ bảng users
    const { data: userData, error } = await supabase
      .from('users')
      .select('*, roles:roles(name)')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('API error fetching user:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(userData);
  } catch (error) {
    console.error('Unexpected API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
