import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { max_users, bet_multiplier, commission_rate } = body;

    // Validate input
    if (max_users !== undefined && (isNaN(max_users) || max_users < 0)) {
      return NextResponse.json(
        { error: 'Max users must be a positive number' },
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

    // Check if settings exist
    const { data: existingSettings, error: settingsError } = await supabaseAdmin
      .from('admin_settings')
      .select('id')
      .eq('admin_id', id)
      .single();

    let result;

    if (settingsError && settingsError.code === 'PGRST116') {
      // Settings don't exist, create new settings
      const { data, error } = await supabaseAdmin
        .from('admin_settings')
        .insert([
          {
            admin_id: id,
            max_users: max_users !== undefined ? max_users : 10,
            bet_multiplier: bet_multiplier !== undefined ? bet_multiplier : 0.8,
            commission_rate:
              commission_rate !== undefined ? commission_rate : 4.0,
          },
        ])
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      result = data;
    } else {
      // Settings exist, update them
      const updates = {};
      if (max_users !== undefined) updates.max_users = max_users;
      if (bet_multiplier !== undefined) updates.bet_multiplier = bet_multiplier;
      if (commission_rate !== undefined)
        updates.commission_rate = commission_rate;

      const { data, error } = await supabaseAdmin
        .from('admin_settings')
        .update(updates)
        .eq('admin_id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      result = data;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { id } = params;

    // Check if admin exists
    const { data: adminExists, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !adminExists) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    // Get admin settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('admin_settings')
      .select('*')
      .eq('admin_id', id)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: settingsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      settings || {
        admin_id: id,
        max_users: 10,
        bet_multiplier: 0.8,
        commission_rate: 4.0,
      }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
