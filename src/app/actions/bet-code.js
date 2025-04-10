'use server';

import { supabaseAdmin } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

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
      { data: allStations, error: allStationsError },
      { data: betTypes, error: betTypesError },
      { data: numberCombinations, error: numberCombinationsError },
      { data: regions, error: regionsError }, // Lấy thêm regions
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
          'bet_type_id, is_active, payout_rate, multiplier, bet_types(id, name, aliases, applicable_regions, bet_rule, matching_method, payout_rate, combinations, is_permutation, special_calc)'
        )
        .eq('user_id', userId),
      supabaseAdmin
        .from('user_commission_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
      supabaseAdmin
        .from('stations')
        .select('*, region:regions(id, name, code, aliases)')
        .eq('is_active', true),
      supabaseAdmin.from('bet_types').select('*').eq('is_active', true),
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

    if (allStationsError) {
      return { data: null, error: 'Lỗi khi lấy thông tin đài' };
    }

    if (betTypesError) {
      return { data: null, error: 'Lỗi khi lấy thông tin loại cược' };
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

    // Create a map of bet type settings - cải tiến logic này
    const betTypeMap = new Map();

    // Đầu tiên, thêm tất cả các loại cược mặc định
    betTypes.forEach((betType) => {
      betTypeMap.set(betType.id, {
        ...betType,
        is_active_for_user: true,
        custom_payout_rate: null,
        multiplier: betType.multiplier || 1,
      });
    });

    // Sau đó, ghi đè với cài đặt của người dùng nếu có
    betTypeSettings.forEach((setting) => {
      if (setting.bet_types && betTypeMap.has(setting.bet_type_id)) {
        const betType = betTypeMap.get(setting.bet_type_id);
        betTypeMap.set(setting.bet_type_id, {
          ...betType,
          is_active_for_user: setting.is_active,
          custom_payout_rate: setting.payout_rate,
          multiplier: setting.multiplier || 1,
        });
      }
    });

    return {
      data: {
        user: userData,
        accessibleStations,
        allStations,
        regions, // Thêm regions vào response
        betTypes: Array.from(betTypeMap.values()),
        numberCombinations,
        commissionSettings: {
          priceRate,
          exportPriceRate,
          returnPriceRate,
        },
      },
      error: null,
    };
  } catch (error) {
    console.error('Error fetching bet data:', error);
    return { data: null, error: 'Lỗi lấy dữ liệu cược: ' + error.message };
  }
}

// Function to submit a validated bet code (updated for merged table structure)
export async function submitBetCode(userId, betCode) {
  try {
    if (!userId || !betCode) {
      return { data: null, error: 'Dữ liệu không hợp lệ' };
    }

    // Format bet lines for the JSONB field
    const betLines = betCode.betData.lines.map((line, index) => ({
      line_number: index + 1,
      original_line: line.originalLine,
      parsed_data: line.parsedData || {},
      numbers: line.numbers,
      bet_type_id: line.betTypeId,
      bet_type_alias: line.betTypeAlias,
      amount: line.amount,
      stake: line.stake,
      potential_prize: line.potentialPrize,
      is_permutation: line.isPermutation || false,
      permutations: line.permutations || null,
      is_valid: !line.error,
      error: line.error || null,
    }));

    // Create new bet code in database with bet_lines field
    const { data: newBetCode, error: betCodeError } = await supabaseAdmin
      .from('bet_codes')
      .insert({
        user_id: userId,
        created_by: userId,
        status: 'confirmed',
        original_text: betCode.originalText,
        formatted_text: betCode.formattedText,
        station_data: betCode.stationData,
        bet_data: betCode.betData,
        stake_amount: betCode.stakeAmount,
        potential_winning: betCode.potentialWinning,
        bet_lines: betLines, // Add the bet lines as JSONB array
      })
      .select('id')
      .single();

    if (betCodeError) {
      return {
        data: null,
        error: 'Lỗi khi lưu mã cược: ' + betCodeError.message,
      };
    }

    // Revalidate paths
    revalidatePath('/bet');
    revalidatePath('/dashboard');

    return { data: newBetCode, error: null };
  } catch (error) {
    console.error('Error submitting bet code:', error);
    return { data: null, error: 'Lỗi lưu mã cược: ' + error.message };
  }
}
