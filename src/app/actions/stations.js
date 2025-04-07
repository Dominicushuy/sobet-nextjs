// src/app/actions/stations.js
'use server';

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

// Hàm lấy danh sách đài cược với bộ lọc
export async function fetchStations({
  isSuperAdmin = false,
  searchTerm = '',
  regionFilter,
  activeFilter,
  scheduleFilter,
} = {}) {
  try {
    // Tạo query để lấy tất cả đài cược
    let query = supabaseAdmin
      .from('stations')
      .select(
        '*, region:regions(id, name, code), schedules:station_schedules(day_of_week, order_number)'
      );

    // Nếu không phải Super Admin, chỉ hiển thị các đài hoạt động
    if (!isSuperAdmin) {
      query = query.eq('is_active', true);
    }

    // Áp dụng các bộ lọc
    if (searchTerm) {
      query = query.ilike('name', `%${searchTerm}%`);
    }

    if (regionFilter && regionFilter !== 'all') {
      query = query.eq('region_id', regionFilter);
    }

    if (activeFilter !== undefined) {
      query = query.eq('is_active', activeFilter);
    }

    // Lọc theo lịch xổ số
    if (scheduleFilter && scheduleFilter !== 'all') {
      const { data: stationIds, error: scheduleError } = await supabaseAdmin
        .from('station_schedules')
        .select('station_id')
        .eq('day_of_week', scheduleFilter);

      if (scheduleError) {
        console.error('Error filtering by schedule:', scheduleError);
        return { data: null, error: scheduleError.message };
      }

      if (stationIds && stationIds.length > 0) {
        const ids = stationIds.map((item) => item.station_id);
        query = query.in('id', ids);
      } else {
        // Nếu không tìm thấy đài nào với lịch này, trả về mảng rỗng
        return { data: { stations: [] }, error: null };
      }
    }

    // Thực hiện truy vấn và sắp xếp theo tên
    const { data: stations, error } = await query.order('name', {
      ascending: true,
    });

    if (error) {
      console.error('Error fetching stations:', error);
      return { data: null, error: error.message };
    }

    return { data: { stations }, error: null };
  } catch (error) {
    console.error('Unexpected error in fetchStations:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Hàm lấy danh sách miền để hiển thị bộ lọc
export async function fetchRegions() {
  try {
    const { data, error } = await supabaseAdmin
      .from('regions')
      .select('id, name, code, aliases')
      .order('id');

    if (error) {
      console.error('Error fetching regions:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in fetchRegions:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Hàm lấy danh sách lịch xổ số để hiển thị bộ lọc
export async function fetchSchedules() {
  try {
    // Sử dụng distinct trong tham số của select
    const { data, error } = await supabaseAdmin
      .from('station_schedules')
      .select('day_of_week', { count: 'exact' })
      .limit(20);

    if (error) {
      console.error('Error fetching schedules:', error);
      return { data: null, error: error.message };
    }

    // Lọc các giá trị unique từ result
    const uniqueDays = [...new Set(data.map((item) => item.day_of_week))];

    return { data: uniqueDays, error: null };
  } catch (error) {
    console.error('Unexpected error in fetchSchedules:', error);
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
