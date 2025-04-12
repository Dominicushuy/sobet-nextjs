// src/app/actions/bet-entries.js
'use server';

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

// Fetch users created by this admin
// Fetch users created by this admin
export async function fetchAdminUsers(adminId) {
  try {
    if (!adminId) {
      return { data: null, error: 'Admin ID is required' };
    }

    // Get users created by this admin directly from users table
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, username, email, full_name')
      .eq('created_by', adminId)
      .order('username');

    if (error) {
      console.error('Error fetching admin users:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in fetchAdminUsers:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Fetch bet entries for specified users
export async function fetchAdminBetEntries({ userIds = [], date = null }) {
  try {
    if (!userIds || userIds.length === 0) {
      return { data: [], error: null };
    }

    // Start building the query - specify foreign key relationships explicitly
    let query = supabaseAdmin
      .from('bet_entries')
      .select(
        `
        *,
        user:users!bet_entries_user_id_fkey(id, username, email, full_name),
        station:stations(id, name, region_id)
      `
      )
      .in('user_id', userIds);

    // Apply date filter if provided
    if (date) {
      // Convert the date to a string format if it's not already
      const dateStr =
        typeof date === 'string' ? date : date.toISOString().split('T')[0];
      query = query.eq('draw_date', dateStr);
    }

    // Order by created_at in descending order (newest first)
    query = query.order('created_at', { ascending: false });

    // Execute the query
    const { data, error } = await query;

    if (error) {
      console.error('Error fetching bet entries:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in fetchAdminBetEntries:', error);
    return { data: null, error: 'Internal server error' };
  }
}
