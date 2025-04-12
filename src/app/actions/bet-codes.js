'use server';

import { supabaseAdmin } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function fetchBetConfig(userId) {
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

export async function saveDraftCode(draftCode, userId) {
  try {
    if (!draftCode || !userId) {
      return { data: null, error: 'Missing required information' };
    }

    // Get the user's commission settings
    const { data: commissionSettings, error: commissionError } =
      await supabaseAdmin
        .from('user_commission_settings')
        .select('price_rate, export_price_rate, return_price_rate')
        .eq('user_id', userId)
        .maybeSingle();

    if (commissionError && commissionError.code !== 'PGRST116') {
      console.error('Error fetching commission settings:', commissionError);
      return { data: null, error: commissionError.message };
    }

    // Default commission rates
    const priceRate = commissionSettings?.price_rate || 0.8;

    // Try to find the station ID if available
    let stationId = null;
    if (draftCode.station && draftCode.station.id) {
      stationId = draftCode.station.id;
    } else if (draftCode.station && draftCode.station.name) {
      // Try to find the station by name
      const { data: station, error: stationError } = await supabaseAdmin
        .from('stations')
        .select('id')
        .eq('name', draftCode.station.name)
        .maybeSingle();

      if (!stationError && station) {
        stationId = station.id;
      }
    }

    // Check if we have lines to process
    if (!draftCode.lines || draftCode.lines.length === 0) {
      return { data: null, error: 'No bet lines to save' };
    }

    // Create entries for each line
    const betEntries = [];
    let successCount = 0;
    let errors = [];

    for (const [index, line] of draftCode.lines.entries()) {
      try {
        // Try to find the bet type ID if available
        let betTypeId = null;

        if (line.betType && line.betType.id) {
          // Try to find the bet type by ID or alias
          const { data: betType, error: betTypeError } = await supabaseAdmin
            .from('bet_types')
            .select('id')
            .or(`name.eq.${line.betType.id},aliases.cs.{${line.betType.alias}}`)
            .maybeSingle();

          if (!betTypeError && betType) {
            betTypeId = betType.id;
          }
        }

        // Get the stake and potential prize info for this line
        const stakeDetail = draftCode.stakeDetails?.[index] || {};
        const prizeDetail = draftCode.prizeDetails?.[index] || {};

        // Prepare the bet entry data
        const betEntryData = {
          user_id: userId,
          created_by: userId,
          status: 'confirmed',
          original_text: draftCode.originalText,
          formatted_text: draftCode.formattedText,
          station_id: stationId,
          station_data: draftCode.station,
          draw_date: draftCode.drawDate,

          // Line specific data
          original_line: line.originalLine,
          bet_type_id: betTypeId,
          bet_type_alias: line.betType?.alias || '',
          numbers: line.numbers || [],

          // Financial data
          amount: line.amount || 0,
          stake: stakeDetail.stake || 0,
          price_rate: priceRate,
          potential_winning: prizeDetail.potentialPrize || 0,

          // Special handling
          is_permutation: line.isPermutation || false,
          permutations: line.permutations || {},
          calculation_formula: stakeDetail.formula || '',

          // Metadata
          parsed_data: line,
          bet_lines: draftCode.lines[0],
          bet_types: line.betType,
          confirmed_at: new Date().toISOString(),
        };

        betEntries.push(betEntryData);
      } catch (lineError) {
        console.error(`Error preparing line ${index + 1}:`, lineError);
        errors.push(`Error in line ${index + 1}: ${lineError.message}`);
      }
    }

    // Insert all bet entries
    if (betEntries.length > 0) {
      const { data: insertedEntries, error: insertError } = await supabaseAdmin
        .from('bet_entries')
        .insert(betEntries)
        .select('id');

      if (insertError) {
        console.error('Error inserting bet entries:', insertError);
        return { data: null, error: insertError.message };
      }

      successCount = insertedEntries.length;
    }

    // Revalidate path to refresh the data
    revalidatePath('/bet');

    return {
      data: {
        successCount,
        totalLines: draftCode.lines.length,
        errors: errors.length > 0 ? errors : null,
      },
      error:
        errors.length > 0
          ? `Failed to save some bet lines: ${errors.length} errors`
          : null,
    };
  } catch (error) {
    console.error('Unexpected error in saveDraftCode:', error);
    return { data: null, error: 'Internal server error' };
  }
}

export async function saveDraftCodes(draftCodes, userId) {
  try {
    if (!Array.isArray(draftCodes) || !userId) {
      return { data: null, error: 'Missing required information' };
    }

    let totalSaved = 0;
    let totalErrors = 0;
    const results = [];

    for (const draftCode of draftCodes) {
      const result = await saveDraftCode(draftCode, userId);
      results.push(result);

      if (!result.error) {
        totalSaved += result.data.successCount;
      } else {
        totalErrors += 1;
      }
    }

    // Revalidate path to refresh the data
    revalidatePath('/bet');

    return {
      data: {
        totalSaved,
        totalErrors,
        results,
      },
      error:
        totalErrors > 0
          ? `Failed to save some bet lines: ${totalErrors} errors out of ${draftCodes.length} codes`
          : null,
    };
  } catch (error) {
    console.error('Unexpected error in saveDraftCodes:', error);
    return { data: null, error: 'Internal server error' };
  }
}
