// src/app/actions/stations.js
'use server';

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

// Hàm lấy tất cả dữ liệu đài cược, không lọc
export async function fetchAllStationsData() {
  try {
    // Lấy tất cả đài cược với thông tin region và lịch
    const { data: stations, error: stationsError } = await supabaseAdmin
      .from('stations')
      .select(
        '*, region:regions(id, name, code, aliases), schedules:station_schedules(id, day_of_week, order_number)'
      )
      .order('name');

    if (stationsError) {
      console.error('Error fetching stations:', stationsError);
      return { data: null, error: stationsError.message };
    }

    // Lấy tất cả regions
    const { data: regions, error: regionsError } = await supabaseAdmin
      .from('regions')
      .select('id, name, code, aliases')
      .order('id');

    if (regionsError) {
      console.error('Error fetching regions:', regionsError);
      return { data: null, error: regionsError.message };
    }

    // Lấy tất cả lịch xổ số
    const { data: schedules, error: schedulesError } = await supabaseAdmin
      .from('station_schedules')
      .select('id, station_id, day_of_week, order_number');

    if (schedulesError) {
      console.error('Error fetching schedules:', schedulesError);
      return { data: null, error: schedulesError.message };
    }

    return {
      data: {
        stations,
        regions,
        schedules,
      },
      error: null,
    };
  } catch (error) {
    console.error('Unexpected error in fetchAllStationsData:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Hàm tạo mới đài cược (chỉ Super Admin)
export async function createStation(stationData) {
  try {
    const { data, error } = await supabaseAdmin
      .from('stations')
      .insert(stationData)
      .select()
      .single();

    if (error) {
      console.error('Error creating station:', error);
      return { data: null, error: error.message };
    }

    revalidatePath('/admin/stations');
    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in createStation:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Hàm cập nhật thông tin đài cược (chỉ Super Admin)
export async function updateStation(id, stationData) {
  try {
    const { data, error } = await supabaseAdmin
      .from('stations')
      .update(stationData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating station:', error);
      return { data: null, error: error.message };
    }

    revalidatePath('/admin/stations');
    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in updateStation:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Hàm chuyển đổi trạng thái hoạt động (chỉ Super Admin)
export async function toggleStationStatus(id, isActive) {
  try {
    const { data, error } = await supabaseAdmin
      .from('stations')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error toggling station status:', error);
      return { data: null, error: error.message };
    }

    revalidatePath('/admin/stations');
    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in toggleStationStatus:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Hàm xóa đài cược (chỉ Super Admin)
export async function deleteStation(id) {
  try {
    const { data, error } = await supabaseAdmin
      .from('stations')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting station:', error);
      return { data: null, error: error.message };
    }

    revalidatePath('/admin/stations');
    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in deleteStation:', error);
    return { data: null, error: 'Internal server error' };
  }
}
