// src/app/actions/dashboard.js
'use server';

import { createClient } from '@/utils/supabase/server';

export async function fetchUserCount(userId, isSuperAdmin = false) {
  const supabase = createClient();

  if (isSuperAdmin) {
    // Get all users
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return { error: error.message };
    }

    return { data: count || 0 };
  } else {
    // Get users created by this admin
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', userId);

    if (error) {
      return { error: error.message };
    }

    return { data: count || 0 };
  }
}

export async function fetchBetCodesCount(
  userId,
  isSuperAdmin = false,
  isUser = false
) {
  const supabase = createClient();

  if (isUser) {
    // Regular user, just count their own bet codes
    const { count, error } = await supabase
      .from('bet_codes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      return { error: error.message };
    }

    return { data: count || 0 };
  } else if (isSuperAdmin) {
    // Super admin, count all bet codes
    const { count, error } = await supabase
      .from('bet_codes')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return { error: error.message };
    }

    return { data: count || 0 };
  } else {
    // Admin, count bet codes from users they created
    const { data: userIds, error: userIdsError } = await supabase
      .from('users')
      .select('id')
      .eq('created_by', userId);

    if (userIdsError) {
      return { error: userIdsError.message };
    }

    if (userIds.length === 0) {
      return { data: 0 };
    }

    const { count, error } = await supabase
      .from('bet_codes')
      .select('*', { count: 'exact', head: true })
      .in(
        'user_id',
        userIds.map((u) => u.id)
      );

    if (error) {
      return { error: error.message };
    }

    return { data: count || 0 };
  }
}
