// src/app/actions/bet-code.js
'use server';

import { supabaseAdmin } from '@/utils/supabase/admin';

export async function fetchBetData(userId) {
  try {
    if (!userId) {
      return { data: null, error: 'Người dùng chưa đăng nhập' };
    }

    // Get user's settings and permissions
    const [
      { data: userData, error: userError },
      { data: stationAccess, error: stationError },
      { data: betTypeSettings, error: betTypeError },
      { data: commissionSettings, error: commissionError },
      { data: numberCombinations, error: numberCombinationsError },
      { data: regions, error: regionsError },
      { data: stationSchedulesData, error: stationSchedulesError }, // Added station schedules
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*').eq('id', userId).single(),
      supabaseAdmin
        .from('user_station_access')
        .select(
          'station_id, is_enabled, stations(id, name, region_id, aliases, is_active, region:regions(id, name, code, aliases))'
        )
        .eq('user_id', userId)
        .eq('is_enabled', true),
      supabaseAdmin
        .from('user_bet_type_settings')
        .select(
          'bet_type_id, payout_rate, multiplier, bet_types(id, name, aliases, applicable_regions, bet_rule, matching_method, payout_rate, combinations, is_permutation, special_calc)'
        )
        .eq('user_id', userId)
        .eq('is_active', true),
      supabaseAdmin
        .from('user_commission_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
      supabaseAdmin
        .from('number_combinations')
        .select('*')
        .eq('is_active', true),
      supabaseAdmin.from('regions').select('*'),
      supabaseAdmin.from('station_schedules').select(`
          id, 
          station_id,
          day_of_week, 
          order_number,
          station:stations(
            id, 
            name, 
            region_id, 
            aliases, 
            is_active
          )
        `),
    ]);

    if (userError || !userData) {
      return { data: null, error: 'Không tìm thấy thông tin người dùng' };
    }

    if (stationError) {
      return { data: null, error: 'Lỗi khi lấy thông tin quyền truy cập đài' };
    }

    if (betTypeError) {
      return { data: null, error: 'Lỗi khi lấy thông tin cài đặt loại cược' };
    }

    if (numberCombinationsError) {
      return { data: null, error: 'Lỗi khi lấy thông tin kiểu kết hợp số' };
    }

    if (regionsError) {
      return { data: null, error: 'Lỗi khi lấy thông tin miền' };
    }

    if (stationSchedulesError) {
      return { data: null, error: 'Lỗi khi lấy lịch xổ số' };
    }

    // Process station schedules
    const stationSchedules = stationSchedulesData.map((schedule) => ({
      id: schedule.id,
      stationId: schedule.station_id,
      dayOfWeek: schedule.day_of_week,
      orderNumber: schedule.order_number,
      station: schedule.station,
    }));

    // Set default commission settings if not found
    const priceRate = commissionSettings?.price_rate || 0.8;
    const exportPriceRate = commissionSettings?.export_price_rate || 0.74;
    const returnPriceRate = commissionSettings?.return_price_rate || 0.95;

    // Create a list of accessible stations
    const accessibleStations = stationAccess.map((access) => access.stations);

    // Sau đó, ghi đè với cài đặt của người dùng nếu có
    const betTypes = betTypeSettings.map((betType) => {
      const { bet_types: betTypeDetails, payout_rate, multiplier } = betType;

      return {
        ...betTypeDetails,
        is_active_for_user: true,
        custom_payout_rate: payout_rate || null,
        multiplier: multiplier || 1,
      };
    });

    const data = {
      user: userData,
      accessibleStations,
      regions,
      betTypes,
      numberCombinations,
      stationSchedules, // Add station schedules to returned data
      commissionSettings: {
        priceRate,
        exportPriceRate,
        returnPriceRate,
      },
    };

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching bet data:', error);
    return { data: null, error: 'Lỗi lấy dữ liệu cược: ' + error.message };
  }
}
