// src/app/actions/station.js
'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Fetch stations based on user role and permissions
export async function fetchStations(regionId = null) {
  try {
    const supabase = await createClient();

    // Get current user and role
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: [], error: 'Unauthorized' };
    }

    // Get user role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, roles:roles(name)')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user role:', userError);
      return { data: [], error: 'Unable to verify user role' };
    }

    const role = userData.roles?.name;
    let query;

    if (role === 'super_admin') {
      // Super admin sees all stations
      query = supabase
        .from('stations')
        .select('*, region:regions(name)')
        .order('name', { ascending: true });
    } else if (role === 'admin') {
      // Admin sees only globally active stations
      query = supabase
        .from('stations')
        .select('*, region:regions(name)')
        .eq('is_active', true)
        .order('name', { ascending: true });
    } else {
      // Regular user sees only stations enabled for them
      // Use the custom function we created
      query = supabase
        .rpc('get_active_stations_for_user', { p_user_id: user.id })
        .select('*, region:regions(name)')
        .order('name', { ascending: true });
    }

    // Add region filter if provided
    if (regionId) {
      query = query.eq('region_id', regionId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching stations:', error);
      return { data: [], error: error.message };
    }

    return { data: data || [] };
  } catch (error) {
    console.error('Unexpected error in fetchStations:', error);
    return { data: [], error: 'Internal server error' };
  }
}

// Create a new station (Super Admin only)
export async function createStation(stationData) {
  try {
    const supabase = await createClient();

    // Check if user is super_admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, roles:roles(name)')
      .eq('id', user.id)
      .single();

    if (userError || userData.roles?.name !== 'super_admin') {
      return { data: null, error: 'Only Super Admin can create stations' };
    }

    const { name, region_id, aliases, is_active } = stationData;

    if (!name || !region_id) {
      return { data: null, error: 'Name and region are required' };
    }

    const { data, error } = await supabase
      .from('stations')
      .insert([
        {
          name,
          region_id,
          aliases: Array.isArray(aliases) ? aliases : [],
          is_active: is_active ?? true,
        },
      ])
      .select();

    if (error) {
      console.error('Error creating station:', error);
      return { data: null, error: error.message };
    }

    revalidatePath('/admin/stations');
    return { data: data[0] || null };
  } catch (error) {
    console.error('Unexpected error in createStation:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Update an existing station (Super Admin only)
export async function updateStation(id, stationData) {
  try {
    const supabase = await createClient();

    // Check if user is super_admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, roles:roles(name)')
      .eq('id', user.id)
      .single();

    if (userError || userData.roles?.name !== 'super_admin') {
      return { data: null, error: 'Only Super Admin can update stations' };
    }

    const { name, region_id, aliases, is_active } = stationData;

    if (!name || !region_id) {
      return { data: null, error: 'Name and region are required' };
    }

    const { data, error } = await supabase
      .from('stations')
      .update({
        name,
        region_id,
        aliases: Array.isArray(aliases) ? aliases : [],
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating station:', error);
      return { data: null, error: error.message };
    }

    revalidatePath('/admin/stations');
    return { data: data[0] || null };
  } catch (error) {
    console.error('Unexpected error in updateStation:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Delete a station (Super Admin only)
export async function deleteStation(id) {
  try {
    const supabase = await createClient();

    // Check if user is super_admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, roles:roles(name)')
      .eq('id', user.id)
      .single();

    if (userError || userData.roles?.name !== 'super_admin') {
      return { success: false, error: 'Only Super Admin can delete stations' };
    }

    const { error } = await supabase.from('stations').delete().eq('id', id);

    if (error) {
      console.error('Error deleting station:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/stations');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error in deleteStation:', error);
    return { success: false, error: 'Internal server error' };
  }
}

// Toggle station status (Global activation by Super Admin / User-specific by Admin)
export async function toggleStationStatus(id, currentStatus) {
  try {
    const supabase = await createClient();

    // Get current user and role
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, roles:roles(name)')
      .eq('id', user.id)
      .single();

    if (userError) {
      return { data: null, error: 'Unable to verify user role' };
    }

    const role = userData.roles?.name;

    if (role === 'super_admin') {
      // Super admin toggles global station status
      const { data, error } = await supabase
        .from('stations')
        .update({
          is_active: !currentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error toggling station status:', error);
        return { data: null, error: error.message };
      }

      revalidatePath('/admin/stations');
      return { data: data[0] || null };
    } else if (role === 'admin') {
      // Admin toggles station status only for their users
      // First check if station is globally active
      const { data: station, error: stationError } = await supabase
        .from('stations')
        .select('is_active')
        .eq('id', id)
        .single();

      if (stationError) {
        return { data: null, error: 'Station not found' };
      }

      if (!station.is_active) {
        return {
          data: null,
          error: 'Cannot enable a globally disabled station',
        };
      }

      // Check if admin-specific setting exists
      const { data: existingSetting, error: settingError } = await supabase
        .from('admin_station_settings')
        .select('id')
        .eq('admin_id', user.id)
        .eq('station_id', id)
        .is('user_id', null)
        .single();

      if (settingError && settingError.code !== 'PGRST116') {
        return { data: null, error: 'Error checking station settings' };
      }

      let result;

      if (!existingSetting) {
        // Create new setting
        const { data, error } = await supabase
          .from('admin_station_settings')
          .insert([
            {
              admin_id: user.id,
              station_id: id,
              is_enabled_for_users: !currentStatus, // Toggle from current status
              user_id: null, // This applies to all users of this admin
            },
          ])
          .select();

        if (error) {
          console.error('Error creating station setting:', error);
          return { data: null, error: error.message };
        }

        result = { id, is_enabled_for_users: !currentStatus };
      } else {
        // Update existing setting
        const { data, error } = await supabase
          .from('admin_station_settings')
          .update({
            is_enabled_for_users: !currentStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSetting.id)
          .select();

        if (error) {
          console.error('Error updating station setting:', error);
          return { data: null, error: error.message };
        }

        result = data[0] || null;
      }

      revalidatePath('/admin/stations');
      return { data: result };
    } else {
      return { data: null, error: 'Insufficient permissions' };
    }
  } catch (error) {
    console.error('Unexpected error in toggleStationStatus:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Toggle station status for a specific user (Admin only)
export async function toggleUserStationStatus(
  stationId,
  userId,
  currentStatus
) {
  try {
    const supabase = await createClient();

    // Get current admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    // Verify admin role and that they created this user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, roles:roles(name)')
      .eq('id', user.id)
      .single();

    if (userError || userData.roles?.name !== 'admin') {
      return {
        data: null,
        error: 'Only Admin can update user station settings',
      };
    }

    // Verify admin created this user
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('created_by')
      .eq('id', userId)
      .single();

    if (targetError || targetUser.created_by !== user.id) {
      return {
        data: null,
        error: 'You can only update settings for your own users',
      };
    }

    // First check if station is globally active
    const { data: station, error: stationError } = await supabase
      .from('stations')
      .select('is_active')
      .eq('id', stationId)
      .single();

    if (stationError || !station.is_active) {
      return { data: null, error: 'Cannot enable a globally disabled station' };
    }

    // Check if user-specific setting exists
    const { data: existingSetting, error: settingError } = await supabase
      .from('admin_station_settings')
      .select('id')
      .eq('admin_id', user.id)
      .eq('station_id', stationId)
      .eq('user_id', userId)
      .single();

    let result;

    if (settingError && settingError.code === 'PGRST116') {
      // Create new setting
      const { data, error } = await supabase
        .from('admin_station_settings')
        .insert([
          {
            admin_id: user.id,
            station_id: stationId,
            user_id: userId,
            is_enabled_for_users: !currentStatus,
          },
        ])
        .select();

      if (error) {
        console.error('Error creating user station setting:', error);
        return { data: null, error: error.message };
      }

      result = data[0] || null;
    } else {
      // Update existing setting
      const { data, error } = await supabase
        .from('admin_station_settings')
        .update({
          is_enabled_for_users: !currentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSetting.id)
        .select();

      if (error) {
        console.error('Error updating user station setting:', error);
        return { data: null, error: error.message };
      }

      result = data[0] || null;
    }

    revalidatePath('/admin/users');
    return { data: result };
  } catch (error) {
    console.error('Unexpected error in toggleUserStationStatus:', error);
    return { data: null, error: 'Internal server error' };
  }
}
