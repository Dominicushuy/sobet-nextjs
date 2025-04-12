'use server';

import { supabaseAdmin } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

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
          line_number: index + 1,
          original_line: line.originalLine,
          bet_type_id: betTypeId,
          bet_type_alias: line.betType?.alias || '',
          numbers: line.numbers || [],

          // Financial data
          amount: line.amount || 0,
          stake: stakeDetail.stake || 0,
          multiplier: line.multiplier || 1,
          price_rate: priceRate,
          payout_rate: line.betType?.payoutRate || stakeDetail.payoutRate || 0,
          potential_prize: prizeDetail.potentialPrize || 0,
          potential_winning: prizeDetail.potentialPrize || 0,

          // Special handling
          is_auto_expanded: draftCode.autoExpanded || false,
          special_case_type: draftCode.specialCase || null,
          is_permutation: line.isPermutation || false,
          permutations: line.permutations || {},
          calculation_formula: stakeDetail.formula || '',

          // Metadata
          parsed_data: line,
          bet_lines: draftCode.lines,
          bet_types: line.betType ? [line.betType] : [],
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

export async function updateBetEntryStatus(betEntryId, status) {
  try {
    if (!betEntryId || !status) {
      return { data: null, error: 'Missing required information' };
    }

    const statusUpdate = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Add timestamp based on status
    if (status === 'confirmed') {
      statusUpdate.confirmed_at = new Date().toISOString();
    } else if (status === 'processed') {
      statusUpdate.processed_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('bet_entries')
      .update(statusUpdate)
      .eq('id', betEntryId)
      .select()
      .single();

    if (error) {
      console.error('Error updating bet entry status:', error);
      return { data: null, error: error.message };
    }

    // Revalidate path to refresh the data
    revalidatePath('/bet');

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in updateBetEntryStatus:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// New function to get bet entries for a user
export async function fetchUserBetEntries(userId, filters = {}) {
  try {
    if (!userId) {
      return { data: null, error: 'Missing user ID' };
    }

    // Start building the query
    let query = supabaseAdmin
      .from('bet_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Apply filters if provided
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    if (filters.stationId) {
      query = query.eq('station_id', filters.stationId);
    }

    if (filters.betTypeId) {
      query = query.eq('bet_type_id', filters.betTypeId);
    }

    // Handle pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(
        filters.offset,
        filters.offset + (filters.limit || 10) - 1
      );
    }

    // Execute the query
    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching bet entries:', error);
      return { data: null, error: error.message };
    }

    return {
      data,
      count,
      error: null,
    };
  } catch (error) {
    console.error('Unexpected error in fetchUserBetEntries:', error);
    return { data: null, error: 'Internal server error' };
  }
}
