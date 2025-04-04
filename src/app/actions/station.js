// src/app/actions/station.js
'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Fetch all stations with optional filtering by region
export async function fetchStations(regionId = null) {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('stations')
      .select('*, region:regions(name)')
      .order('name', { ascending: true });

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

// Create a new station
export async function createStation(stationData) {
  try {
    const supabase = await createClient();

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

// Update an existing station
export async function updateStation(id, stationData) {
  try {
    const supabase = await createClient();

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

// Delete a station
export async function deleteStation(id) {
  try {
    const supabase = await createClient();

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

// Toggle station status (active/inactive)
export async function toggleStationStatus(id, currentStatus) {
  try {
    const supabase = await createClient();

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
  } catch (error) {
    console.error('Unexpected error in toggleStationStatus:', error);
    return { data: null, error: 'Internal server error' };
  }
}
