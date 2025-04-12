'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function saveDraftCode(draftCode, userId) {
  try {
    const supabase = await createClient();

    if (!draftCode || !userId) {
      return { data: null, error: 'Missing required information' };
    }

    // Get the user's commission settings
    const { data: commissionSettings, error: commissionError } = await supabase
      .from('user_commission_settings')
      .select('price_rate, export_rate, return_rate')
      .eq('user_id', userId)
      .maybeSingle();

    if (commissionError && commissionError.code !== 'PGRST116') {
      console.error('Error fetching commission settings:', commissionError);
      return { data: null, error: commissionError.message };
    }

    // Default commission rates
    const priceRate = commissionSettings?.price_rate || 0.8;
    const exportRate = commissionSettings?.export_rate || 0.74;
    const returnRate = commissionSettings?.return_rate || 0.95;

    // Try to find the station ID if available
    let stationId = null;
    if (draftCode.station && draftCode.station.id) {
      stationId = draftCode.station.id;
    } else if (draftCode.station && draftCode.station.name) {
      // Try to find the station by name
      const { data: station, error: stationError } = await supabase
        .from('stations')
        .select('id')
        .eq('name', draftCode.station.name)
        .maybeSingle();

      if (!stationError && station) {
        stationId = station.id;
      }
    }

    // Prepare the bet code data
    const betCodeData = {
      user_id: userId,
      created_by: userId,
      status: 'confirmed',
      original_text: draftCode.originalText,
      formatted_text: draftCode.formattedText,
      station_id: stationId,
      station_data: draftCode.station,
      draw_date: draftCode.drawDate,
      is_auto_expanded: draftCode.autoExpanded || false,
      special_case_type: draftCode.specialCase || null,
      stake_amount: draftCode.stakeAmount,
      price_rate: priceRate,
      commission_rate: priceRate,
      export_rate: exportRate,
      return_rate: returnRate,
      potential_winning: draftCode.potentialWinning,
      confirmed_at: new Date().toISOString(),
      bet_lines: draftCode.lines,
      source: 'chat',
    };

    // Insert the bet code
    const { data: betCode, error: betCodeError } = await supabase
      .from('bet_codes')
      .insert(betCodeData)
      .select('id')
      .single();

    if (betCodeError) {
      console.error('Error saving bet code:', betCodeError);
      return { data: null, error: betCodeError.message };
    }

    // Insert each bet code line
    if (draftCode.lines && draftCode.lines.length > 0) {
      const betCodeLines = [];

      for (const [index, line] of draftCode.lines.entries()) {
        // Try to find the bet type ID if available
        let betTypeId = null;

        if (line.betType && line.betType.id) {
          // Try to find the bet type by ID or alias
          const { data: betType, error: betTypeError } = await supabase
            .from('bet_types')
            .select('id')
            .or(`name.eq.${line.betType.id},aliases.cs.{${line.betType.alias}}`)
            .maybeSingle();

          if (!betTypeError && betType) {
            betTypeId = betType.id;
          }
        }

        betCodeLines.push({
          bet_code_id: betCode.id,
          line_number: index + 1,
          original_line: line.originalLine,
          parsed_data: line,
          bet_type_id: betTypeId,
          bet_type_alias: line.betType?.alias || '',
          numbers: line.numbers || [],
          amount: line.amount || 0,
          stake: draftCode.stakeDetails?.[index]?.stake || 0,
          payout_rate: draftCode.stakeDetails?.[index]?.payoutRate || 0,
          potential_prize: draftCode.prizeDetails?.[index]?.potentialPrize || 0,
          is_permutation: line.isPermutation || false,
          permutations: line.permutations || {},
          calculation_formula: draftCode.stakeDetails?.[index]?.formula || '',
          is_valid: line.valid !== false,
          error_message: line.error || null,
        });
      }

      // Insert all line records
      const { error: linesError } = await supabase
        .from('bet_code_lines')
        .insert(betCodeLines);

      if (linesError) {
        console.error('Error saving bet code lines:', linesError);
        return { data: betCode, error: linesError.message };
      }
    }

    // Revalidate path to refresh the data
    revalidatePath('/bet');

    return { data: betCode, error: null };
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

    const results = [];

    for (const draftCode of draftCodes) {
      const result = await saveDraftCode(draftCode, userId);
      results.push(result);
    }

    const errors = results.filter((r) => r.error).map((r) => r.error);

    // Revalidate path to refresh the data
    revalidatePath('/bet');

    return {
      data: {
        totalSaved: results.length - errors.length,
        totalErrors: errors.length,
        results,
      },
      error:
        errors.length > 0
          ? `Failed to save ${errors.length} out of ${results.length} bet codes`
          : null,
    };
  } catch (error) {
    console.error('Unexpected error in saveDraftCodes:', error);
    return { data: null, error: 'Internal server error' };
  }
}

export async function updateBetCodeStatus(betCodeId, status) {
  try {
    const supabase = await createClient();

    if (!betCodeId || !status) {
      return { data: null, error: 'Missing required information' };
    }

    const { data, error } = await supabase
      .from('bet_codes')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', betCodeId)
      .select()
      .single();

    if (error) {
      console.error('Error updating bet code status:', error);
      return { data: null, error: error.message };
    }

    // Revalidate path to refresh the data
    revalidatePath('/bet');

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in updateBetCodeStatus:', error);
    return { data: null, error: 'Internal server error' };
  }
}
