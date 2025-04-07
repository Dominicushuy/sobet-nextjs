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
    // Tách dữ liệu lịch xổ số ra khỏi dữ liệu đài
    const { scheduleDays, ...stationDataOnly } = stationData;

    // Bắt đầu transaction với supabaseAdmin
    // 1. Tạo đài mới
    const { data: newStation, error: stationError } = await supabaseAdmin
      .from('stations')
      .insert(stationDataOnly)
      .select()
      .single();

    if (stationError) {
      console.error('Error creating station:', stationError);
      return { data: null, error: stationError.message };
    }

    // 2. Thêm lịch cho đài mới nếu có
    if (scheduleDays && scheduleDays.length > 0) {
      for (const day of scheduleDays) {
        // Tìm order_number lớn nhất cho ngày này
        const { data: maxOrderData } = await supabaseAdmin
          .from('station_schedules')
          .select('order_number')
          .eq('day_of_week', day)
          .order('order_number', { ascending: false })
          .limit(1);

        // Tính order_number mới
        const nextOrder =
          maxOrderData && maxOrderData.length > 0
            ? maxOrderData[0].order_number + 1
            : 1;

        // Thêm lịch mới
        const { error: scheduleError } = await supabaseAdmin
          .from('station_schedules')
          .insert({
            station_id: newStation.id,
            day_of_week: day,
            order_number: nextOrder,
          });

        if (scheduleError) {
          console.error(
            `Error creating schedule for day ${day}:`,
            scheduleError
          );
          // Không return error ở đây để tiếp tục thêm các ngày khác
        }
      }
    }

    revalidatePath('/admin/stations');
    return { data: newStation, error: null };
  } catch (error) {
    console.error('Unexpected error in createStation:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Hàm cập nhật thông tin đài cược (chỉ Super Admin)
export async function updateStation(id, stationData) {
  try {
    // Tách dữ liệu lịch xổ số ra khỏi dữ liệu đài
    const { scheduleDays, ...stationDataOnly } = stationData;

    // 1. Cập nhật thông tin đài
    const { data: updatedStation, error: stationError } = await supabaseAdmin
      .from('stations')
      .update(stationDataOnly)
      .eq('id', id)
      .select()
      .single();

    if (stationError) {
      console.error('Error updating station:', stationError);
      return { data: null, error: stationError.message };
    }

    // 2. Xóa tất cả lịch cũ của đài
    const { error: deleteError } = await supabaseAdmin
      .from('station_schedules')
      .delete()
      .eq('station_id', id);

    if (deleteError) {
      console.error('Error deleting old schedules:', deleteError);
      return { data: null, error: deleteError.message };
    }

    // 3. Thêm lịch mới cho đài nếu có
    if (scheduleDays && scheduleDays.length > 0) {
      for (const day of scheduleDays) {
        // Tìm order_number lớn nhất cho ngày này
        const { data: maxOrderData } = await supabaseAdmin
          .from('station_schedules')
          .select('order_number')
          .eq('day_of_week', day)
          .order('order_number', { ascending: false })
          .limit(1);

        // Tính order_number mới
        const nextOrder =
          maxOrderData && maxOrderData.length > 0
            ? maxOrderData[0].order_number + 1
            : 1;

        // Thêm lịch mới
        const { error: scheduleError } = await supabaseAdmin
          .from('station_schedules')
          .insert({
            station_id: id,
            day_of_week: day,
            order_number: nextOrder,
          });

        if (scheduleError) {
          console.error(
            `Error creating schedule for day ${day}:`,
            scheduleError
          );
          // Không return error ở đây để tiếp tục thêm các ngày khác
        }
      }
    }

    revalidatePath('/admin/stations');
    return { data: updatedStation, error: null };
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
    // 1. Lưu thông tin đài trước khi xóa để trả về
    const { data: stationToDelete, error: fetchError } = await supabaseAdmin
      .from('stations')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching station to delete:', fetchError);
      return { data: null, error: fetchError.message };
    }

    // 2. Xóa tất cả lịch của đài
    const { error: schedulesError } = await supabaseAdmin
      .from('station_schedules')
      .delete()
      .eq('station_id', id);

    if (schedulesError) {
      console.error('Error deleting station schedules:', schedulesError);
      return { data: null, error: schedulesError.message };
    }

    // 3. Xóa đài
    const { error: stationError } = await supabaseAdmin
      .from('stations')
      .delete()
      .eq('id', id);

    if (stationError) {
      console.error('Error deleting station:', stationError);
      return { data: null, error: stationError.message };
    }

    revalidatePath('/admin/stations');
    return { data: stationToDelete, error: null };
  } catch (error) {
    console.error('Unexpected error in deleteStation:', error);
    return { data: null, error: 'Internal server error' };
  }
}
