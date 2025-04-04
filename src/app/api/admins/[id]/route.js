import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

export async function GET(request, { params }) {
  try {
    const { id } = params;

    // Fetch admin data
    const { data: admin, error } = await supabaseAdmin
      .from('users')
      .select('*, roles:roles(name)')
      .eq('id', id)
      .eq('roles.name', 'admin')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    // Fetch admin settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('admin_settings')
      .select('*')
      .eq('admin_id', id)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      // PGRST116 is "No rows found", which might be fine if settings don't exist yet
      console.error('Error fetching admin settings:', settingsError);
    }

    return NextResponse.json({
      ...admin,
      settings: settings || {},
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { username, email, full_name, is_active } = body;

    // Validate input
    if (!username || !email) {
      return NextResponse.json(
        { error: 'Username and email are required' },
        { status: 400 }
      );
    }

    // Update Supabase Auth user if email changed
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    // Update email in Auth if it changed
    if (existingUser.email !== email) {
      const { error: authError } =
        await supabaseAdmin.auth.admin.updateUserById(id, { email });

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
    }

    // Update user in database
    const { data: updatedAdmin, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        username,
        email,
        full_name,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json(updatedAdmin);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
