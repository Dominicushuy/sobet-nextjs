'use server';

import { supabaseAdmin } from '@/utils/supabase/admin';
// import { revalidatePath } from 'next/cache';

// Fetch data needed for bet code validation
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
      supabaseAdmin.from('regions').select('*'), // Lấy tất cả regions
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

    // Set default commission settings if not found
    const priceRate = commissionSettings?.price_rate || 0.8;
    const exportPriceRate = commissionSettings?.export_price_rate || 0.74;
    const returnPriceRate = commissionSettings?.return_price_rate || 0.95;

    // Create a list of accessible stations
    const accessibleStations = stationAccess
      .filter((access) => access.is_enabled && access.stations)
      .map((access) => access.stations);

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
      commissionSettings: {
        priceRate,
        exportPriceRate,
        returnPriceRate,
      },
    };

    // console.log('Bet type:', betTypeSettings);

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching bet data:', error);
    return { data: null, error: 'Lỗi lấy dữ liệu cược: ' + error.message };
  }
}
