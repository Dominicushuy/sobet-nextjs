// src/app/actions/user-settings.js
'use server';

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

// Get user details with role info
export async function getUserDetails(userId) {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*, roles:roles(name)')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user details:', error);
      return { data: null, error: error.message };
    }

    return { data: user, error: null };
  } catch (error) {
    console.error('Unexpected error in getUserDetails:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Update user profile
export async function updateUserProfile(userId, userData) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        full_name: userData.fullName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      return { data: null, error: error.message };
    }

    revalidatePath(`/admin/users/${userId}/settings`);
    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in updateUserProfile:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Reset user password
export async function resetUserPassword(userId, newPassword) {
  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      console.error('Error resetting user password:', error);
      return { data: null, error: error.message };
    }

    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Unexpected error in resetUserPassword:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Get user's station access settings
export async function getUserStationAccess(userId) {
  try {
    // Get all stations with region information
    const { data: stations, error: stationsError } = await supabaseAdmin
      .from('stations')
      .select('*, region:regions(id, name, code, aliases)')
      .eq('is_active', true)
      .order('name');

    if (stationsError) {
      console.error('Error fetching stations:', stationsError);
      return { data: null, error: stationsError.message };
    }

    // Get user's station access settings
    const { data: accessSettings, error: accessError } = await supabaseAdmin
      .from('user_station_access')
      .select('*')
      .eq('user_id', userId);

    if (accessError) {
      console.error('Error fetching user station access:', accessError);
      return { data: null, error: accessError.message };
    }

    // Create a map of station_id to is_enabled for easier lookup
    const accessMap = {};
    accessSettings.forEach((setting) => {
      accessMap[setting.station_id] = {
        is_enabled: setting.is_enabled,
        access_id: setting.id,
      };
    });

    // Combine the data
    const stationsWithAccess = stations.map((station) => ({
      ...station,
      is_enabled: accessMap[station.id]
        ? accessMap[station.id].is_enabled
        : true,
      access_id: accessMap[station.id] ? accessMap[station.id].access_id : null,
    }));

    return {
      data: {
        stations: stationsWithAccess,
        accessSettings,
      },
      error: null,
    };
  } catch (error) {
    console.error('Unexpected error in getUserStationAccess:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Batch update user's station access
export async function batchUpdateUserStationAccess(userId, adminId, updates) {
  try {
    // Process in batches to avoid too many concurrent operations
    const batchSize = 10;
    const results = [];

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      const promises = batch.map((update) => {
        if (update.accessId) {
          // Update existing record
          return supabaseAdmin
            .from('user_station_access')
            .update({
              is_enabled: update.isEnabled,
              updated_at: new Date().toISOString(),
            })
            .eq('id', update.accessId);
        } else {
          // Create new record
          return supabaseAdmin.from('user_station_access').insert({
            user_id: userId,
            station_id: update.stationId,
            is_enabled: update.isEnabled,
            created_by: adminId,
          });
        }
      });

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    }

    // Check for any errors
    const errors = results.filter((result) => result.error);
    if (errors.length > 0) {
      console.error('Errors during batch update:', errors);
      return {
        data: { success: false, errors },
        error: 'Some updates failed',
      };
    }

    revalidatePath(`/admin/users/${userId}/settings`);
    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Unexpected error in batchUpdateUserStationAccess:', error);
    return { data: null, error: 'Internal server error' };
  }
}
