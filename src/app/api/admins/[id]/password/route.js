import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { password } = body;

    // Validate input
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if admin exists
    const { data: adminExists, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !adminExists) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    // Update password in Supabase Auth
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(id, { password });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
