// src/app/actions/dashboard.js
'use server';

import { createClient } from '@/utils/supabase/server';

export async function fetchUserCount(userId, isSuperAdmin = false) {
  try {
    const supabase = await createClient();

    if (isSuperAdmin) {
      // Get all users
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error fetching user count for superadmin:', error);
        return { data: 0, error: error.message };
      }

      return { data: count || 0, error: null };
    } else {
      // Get users created by this admin
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId);

      if (error) {
        console.error('Error fetching user count for admin:', error);
        return { data: 0, error: error.message };
      }

      return { data: count || 0, error: null };
    }
  } catch (error) {
    console.error('Unexpected error in fetchUserCount:', error);
    return { data: 0, error: 'Internal server error' };
  }
}

export async function fetchBetCodesCount(
  userId,
  isSuperAdmin = false,
  isUser = false
) {
  try {
    const supabase = await createClient();

    if (isUser) {
      // Regular user, just count their own bet codes
      const { count, error } = await supabase
        .from('bet_codes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching bet codes count for user:', error);
        return { data: 0, error: error.message };
      }

      return { data: count || 0, error: null };
    } else if (isSuperAdmin) {
      // Super admin, count all bet codes
      const { count, error } = await supabase
        .from('bet_codes')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error fetching bet codes count for superadmin:', error);
        return { data: 0, error: error.message };
      }

      return { data: count || 0, error: null };
    } else {
      // Admin, count bet codes from users they created
      const { data: userIds, error: userIdsError } = await supabase
        .from('users')
        .select('id')
        .eq('created_by', userId);

      if (userIdsError) {
        console.error('Error fetching user IDs for admin:', userIdsError);
        return { data: 0, error: userIdsError.message };
      }

      if (!userIds || userIds.length === 0) {
        return { data: 0, error: null };
      }

      const { count, error } = await supabase
        .from('bet_codes')
        .select('*', { count: 'exact', head: true })
        .in(
          'user_id',
          userIds.map((u) => u.id)
        );

      if (error) {
        console.error('Error fetching bet codes count for admin users:', error);
        return { data: 0, error: error.message };
      }

      return { data: count || 0, error: null };
    }
  } catch (error) {
    console.error('Unexpected error in fetchBetCodesCount:', error);
    return { data: 0, error: 'Internal server error' };
  }
}
