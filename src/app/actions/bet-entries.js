// src/app/actions/bet-entries.js
'use server';

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

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
      const dateStr =
        typeof date === 'string' ? date : date.toISOString().split('T')[0];
      query = query.eq('draw_date', dateStr);
      // console.log('Filtering by draw_date:', dateStr);
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

// Fetch bet entries for current user
export async function fetchUserBetEntries({ date = null, searchTerm = null }) {
  try {
    const supabase = await createClient();

    // Lấy user ID hiện tại từ session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: 'User not authenticated' };
    }

    // Start building the query - specify foreign key relationships explicitly
    let query = supabase
      .from('bet_entries')
      .select(
        `
        *,
        station:stations(id, name, region_id),
        bet_type:bet_types(id, name)
      `
      )
      .eq('user_id', user.id);

    // Apply date filter if provided
    if (date) {
      // Date is already formatted as YYYY-MM-DD from client

      const dateStr =
        typeof date === 'string' ? date : date.toISOString().split('T')[0];
      query = query.eq('draw_date', dateStr);
    }

    // Apply search filter if provided
    if (searchTerm) {
      query = query.or(`
        original_text.ilike.%${searchTerm}%,
        formatted_text.ilike.%${searchTerm}%,
        bet_type_alias.ilike.%${searchTerm}%
      `);
    }

    // Order by created_at in descending order (newest first)
    query = query.order('created_at', { ascending: false });

    // Execute the query
    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user bet entries:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in fetchUserBetEntries:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Duyệt nhiều mã cược
export async function confirmBetEntries(entryIds, adminId) {
  try {
    if (!entryIds || entryIds.length === 0 || !adminId) {
      return { data: null, error: 'Thiếu thông tin cần thiết' };
    }

    const { data, error } = await supabaseAdmin
      .from('bet_entries')
      .update({
        status: 'confirmed',
        admin_id: adminId,
        processed_at: new Date().toISOString(),
      })
      .in('id', entryIds)
      .eq('status', 'draft')
      .select('id');

    if (error) {
      console.error('Error confirming bet entries:', error);
      return { data: null, error: error.message };
    }

    revalidatePath('/admin/bet-codes');
    return { data: { updatedCount: data.length }, error: null };
  } catch (error) {
    console.error('Unexpected error in confirmBetEntries:', error);
    return { data: null, error: 'Lỗi hệ thống' };
  }
}

// Xóa nhiều mã cược
export async function deleteBetEntries(entryIds, adminId) {
  try {
    if (!entryIds || entryIds.length === 0 || !adminId) {
      return { data: null, error: 'Thiếu thông tin cần thiết' };
    }

    const { data, error } = await supabaseAdmin
      .from('bet_entries')
      .update({
        status: 'deleted',
        admin_id: adminId,
        processed_at: new Date().toISOString(),
      })
      .in('id', entryIds)
      .in('status', ['draft', 'confirmed'])
      .select('id');

    if (error) {
      console.error('Error deleting bet entries:', error);
      return { data: null, error: error.message };
    }

    revalidatePath('/admin/bet-codes');
    return { data: { updatedCount: data.length }, error: null };
  } catch (error) {
    console.error('Unexpected error in deleteBetEntries:', error);
    return { data: null, error: 'Lỗi hệ thống' };
  }
}
