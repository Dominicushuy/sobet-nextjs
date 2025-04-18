// src/app/actions/verifications.js
'use server';

import { supabaseAdmin } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

/**
 * Lấy danh sách user do admin tạo ra (để dùng trong bộ lọc)
 */
export async function fetchAdminsForFilter(adminId) {
  try {
    if (!adminId) {
      return { data: null, error: 'Admin ID is required' };
    }

    // Lấy những user do admin này tạo ra
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, username, email, full_name, roles:roles(name)')
      .eq('created_by', adminId)
      .order('full_name');

    if (error) {
      console.error('Error fetching users for admin:', error);
      return { data: null, error: error.message };
    }

    // Also include the admin themselves in the list
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('users')
      .select('id, username, email, full_name, roles:roles(name)')
      .eq('id', adminId)
      .single();

    if (!adminError && adminData) {
      // If the admin isn't already in the list, add them
      if (!data.some((user) => user.id === adminData.id)) {
        data.push(adminData);
      }
    }

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in fetchAdminsForFilter:', error);
    return { data: null, error: 'Internal server error' };
  }
}

/**
 * Fetch verifications data for a specific date and filtered by admin IDs
 */
export async function fetchVerifications(date, adminIds = []) {
  try {
    // For debug purposes
    // console.log('Fetching verifications with:', { date, adminIds });

    if (!date) {
      const today = new Date();
      date = today.toISOString().split('T')[0];
    }

    // Format date if it's a Date object
    const dateStr =
      typeof date === 'string' ? date : date.toISOString().split('T')[0];

    // console.log('Formatted date:', dateStr);

    // Tạo query cơ bản
    let query = supabaseAdmin
      .from('verifications')
      .select(
        `
        *,
        admin:users!verifications_admin_id_fkey(id, username, email, full_name)
      `
      )
      .eq('date', dateStr);

    // Thêm filter theo adminIds nếu có
    if (adminIds && adminIds.length > 0) {
      query = query.in('admin_id', adminIds);
      // console.log('Filtering by admin IDs:', adminIds);
    }

    // Thực hiện query
    const { data: verifications, error: verificationError } = await query.order(
      'created_at',
      { ascending: false }
    );

    if (verificationError) {
      console.error('Error fetching verifications:', verificationError);
      return { data: null, error: verificationError.message };
    }

    // console.log('Raw verification results:', verifications);

    // Nếu không có dữ liệu, trả về mảng rỗng
    if (!verifications || verifications.length === 0) {
      // console.log('No verification data found for date:', dateStr);
      return { data: [], error: null };
    }

    // Tối ưu: Lấy settings của tất cả users trong một truy vấn
    const userIds = verifications.map((v) => v.admin_id);

    const { data: commissionSettingsData, error: commissionError } =
      await supabaseAdmin
        .from('user_commission_settings')
        .select('*')
        .in('user_id', userIds);

    if (commissionError) {
      console.error('Error fetching commission settings:', commissionError);
    }

    // Map settings by user_id for quicker access
    const commissionSettingsMap = {};
    (commissionSettingsData || []).forEach((setting) => {
      commissionSettingsMap[setting.user_id] = setting;
    });

    // Process verification data to extract winners and losers from verification_data JSON
    const enhancedVerifications = verifications.map((verification) => {
      const settings = commissionSettingsMap[verification.admin_id] || {};

      // Extract winners and losers from verification_data if available
      let winning_entries = 0;
      let losing_entries = 0;

      if (verification.verification_data) {
        // Convert from stringified JSON if needed
        const verificationData =
          typeof verification.verification_data === 'string'
            ? JSON.parse(verification.verification_data)
            : verification.verification_data;

        winning_entries = verificationData.winners || 0;
        losing_entries = verificationData.losers || 0;
      }

      return {
        ...verification,
        // Add these as properties to match the component expectations
        winning_entries,
        losing_entries,
        commissionSettings: {
          priceRate: settings.price_rate || 0.8,
          exportPriceRate: settings.export_price_rate || 0.74,
          returnPriceRate: settings.return_price_rate || 0.95,
        },
      };
    });

    // console.log(
    //   'Enhanced verifications (first item):',
    //   enhancedVerifications.length > 0 ? enhancedVerifications[0] : 'No items'
    // );

    return { data: enhancedVerifications, error: null };
  } catch (error) {
    console.error('Unexpected error in fetchVerifications:', error);
    return { data: null, error: 'Internal server error' };
  }
}

/**
 * Get detailed statistics for a user's verification
 */
export async function getVerificationDetailStats(userId, date) {
  try {
    // console.log('Getting verification stats for user:', userId, 'date:', date);

    // Get processed bet entries for this user on this date
    const { data: entries, error: entriesError } = await supabaseAdmin
      .from('bet_entries')
      .select(
        `
        *,
        station:stations(id, name, region:regions(id, name, code))
      `
      )
      .eq('user_id', userId)
      .eq('draw_date', date)
      .eq('status', 'processed');

    if (entriesError) {
      console.error('Error fetching bet entries:', entriesError);
      return { data: null, error: entriesError.message };
    }

    console.log(
      `Found ${entries.length} processed entries for statistics calculation`
    );

    // Initialize statistics
    const stats = {
      // Calculate winners and losers for verification_data
      winners: entries.filter((entry) => entry.winning_status === true).length,
      losers: entries.filter((entry) => entry.winning_status === false).length,

      // Overall statistics (actual columns in the verifications table)
      total_bet_codes: entries.length,
      total_stake_amount: 0,
      total_winning_amount: 0,
      total_profit_amount: 0,
      total_cost_amount: 0,

      // North region statistics
      total_stake_amount_north: 0,
      total_winning_amount_north: 0,
      total_profit_amount_north: 0,
      total_cost_amount_north: 0,

      // Central region statistics
      total_stake_amount_central: 0,
      total_winning_amount_central: 0,
      total_profit_amount_central: 0,
      total_cost_amount_central: 0,

      // South region statistics
      total_stake_amount_south: 0,
      total_winning_amount_south: 0,
      total_profit_amount_south: 0,
      total_cost_amount_south: 0,
    };

    // Process each entry
    entries.forEach((entry) => {
      const stakeAmount = Number(entry.original_stake) || 0;
      const winningAmount = Number(entry.actual_winning) || 0;

      // Update overall statistics
      stats.total_stake_amount += stakeAmount;
      stats.total_winning_amount += winningAmount;

      // Determine region and update region-specific statistics
      const regionCode = entry.station?.region?.code;

      if (regionCode === 'north') {
        stats.total_stake_amount_north += stakeAmount;
        stats.total_winning_amount_north += winningAmount;
      } else if (regionCode === 'central') {
        stats.total_stake_amount_central += stakeAmount;
        stats.total_winning_amount_central += winningAmount;
      } else if (regionCode === 'south') {
        stats.total_stake_amount_south += stakeAmount;
        stats.total_winning_amount_south += winningAmount;
      }
    });

    // Calculate profit amounts
    stats.total_profit_amount =
      stats.total_winning_amount - stats.total_stake_amount;
    stats.total_profit_amount_north =
      stats.total_winning_amount_north - stats.total_stake_amount_north;
    stats.total_profit_amount_central =
      stats.total_winning_amount_central - stats.total_stake_amount_central;
    stats.total_profit_amount_south =
      stats.total_winning_amount_south - stats.total_stake_amount_south;

    // Get user's commission settings
    const { data: commissionSettings, error: commissionError } =
      await supabaseAdmin
        .from('user_commission_settings')
        .select('price_rate, export_price_rate, return_price_rate')
        .eq('user_id', userId)
        .maybeSingle();

    if (commissionError) {
      console.error('Error fetching commission settings:', commissionError);
    }

    // Set default commission rates if not found
    const exportPriceRate = commissionSettings?.export_price_rate || 0.74;
    const returnPriceRate = commissionSettings?.return_price_rate || 0.95;

    // Calculate cost amounts based on profit
    // Overall
    if (stats.total_profit_amount > 0) {
      // Winning case - apply export rate
      stats.total_cost_amount = stats.total_profit_amount * exportPriceRate;
    } else {
      // Losing case - apply return rate
      stats.total_cost_amount =
        Math.abs(stats.total_profit_amount) * returnPriceRate;
    }

    // North region
    if (stats.total_profit_amount_north > 0) {
      stats.total_cost_amount_north =
        stats.total_profit_amount_north * exportPriceRate;
    } else {
      stats.total_cost_amount_north =
        Math.abs(stats.total_profit_amount_north) * returnPriceRate;
    }

    // Central region
    if (stats.total_profit_amount_central > 0) {
      stats.total_cost_amount_central =
        stats.total_profit_amount_central * exportPriceRate;
    } else {
      stats.total_cost_amount_central =
        Math.abs(stats.total_profit_amount_central) * returnPriceRate;
    }

    // South region
    if (stats.total_profit_amount_south > 0) {
      stats.total_cost_amount_south =
        stats.total_profit_amount_south * exportPriceRate;
    } else {
      stats.total_cost_amount_south =
        Math.abs(stats.total_profit_amount_south) * returnPriceRate;
    }

    console.log('Calculated verification stats:', stats);
    return { data: stats, error: null };
  } catch (error) {
    console.error('Unexpected error in getVerificationDetailStats:', error);
    return { data: null, error: 'Internal server error' };
  }
}

/**
 * Update verification data with regional statistics
 */
export async function updateVerification(id, userId, date, stats) {
  try {
    if (!id || !userId || !date || !stats) {
      console.error('Missing required information for updateVerification', {
        id,
        userId,
        date,
        stats: !!stats,
      });
      return { data: null, error: 'Missing required information' };
    }

    // Prepare verification data with region-specific information
    const verificationData = {
      // Overall statistics
      total_bet_codes: stats.total_bet_codes || 0,
      total_stake_amount: stats.total_stake_amount || 0,
      total_winning_amount: stats.total_winning_amount || 0,
      total_profit_amount: stats.total_profit_amount || 0,
      total_cost_amount: stats.total_cost_amount || 0,

      // North region
      total_stake_amount_north: stats.total_stake_amount_north || 0,
      total_winning_amount_north: stats.total_winning_amount_north || 0,
      total_profit_amount_north: stats.total_profit_amount_north || 0,
      total_cost_amount_north: stats.total_cost_amount_north || 0,

      // Central region
      total_stake_amount_central: stats.total_stake_amount_central || 0,
      total_winning_amount_central: stats.total_winning_amount_central || 0,
      total_profit_amount_central: stats.total_profit_amount_central || 0,
      total_cost_amount_central: stats.total_cost_amount_central || 0,

      // South region
      total_stake_amount_south: stats.total_stake_amount_south || 0,
      total_winning_amount_south: stats.total_winning_amount_south || 0,
      total_profit_amount_south: stats.total_profit_amount_south || 0,
      total_cost_amount_south: stats.total_cost_amount_south || 0,

      // Store winners and losers in verification_data JSON
      verification_data: {
        winners: stats.winners || 0,
        losers: stats.losers || 0,
        additional_info: 'Updated verification data',
      },

      updated_at: new Date().toISOString(),
    };

    console.log('Updating verification with data:', verificationData);

    // Update verification record
    const { data, error } = await supabaseAdmin
      .from('verifications')
      .update(verificationData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating verification:', error);
      return { data: null, error: error.message };
    }

    console.log('Verification updated successfully:', data);
    revalidatePath('/admin/verifications');

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in updateVerification:', error);
    return { data: null, error: 'Internal server error' };
  }
}

/**
 * Create a new verification record with full statistics
 */
export async function createVerification(userId, date, stats) {
  try {
    if (!userId || !date || !stats) {
      console.error('Missing required information for createVerification', {
        userId,
        date,
        stats: !!stats,
      });
      return { data: null, error: 'Missing required information' };
    }

    // Prepare verification data with region-specific information
    const verificationData = {
      date: date,
      admin_id: userId,

      // Overall statistics
      total_bet_codes: stats.total_bet_codes || 0,
      total_stake_amount: stats.total_stake_amount || 0,
      total_winning_amount: stats.total_winning_amount || 0,
      total_profit_amount: stats.total_profit_amount || 0,
      total_cost_amount: stats.total_cost_amount || 0,

      // North region
      total_stake_amount_north: stats.total_stake_amount_north || 0,
      total_winning_amount_north: stats.total_winning_amount_north || 0,
      total_profit_amount_north: stats.total_profit_amount_north || 0,
      total_cost_amount_north: stats.total_cost_amount_north || 0,

      // Central region
      total_stake_amount_central: stats.total_stake_amount_central || 0,
      total_winning_amount_central: stats.total_winning_amount_central || 0,
      total_profit_amount_central: stats.total_profit_amount_central || 0,
      total_cost_amount_central: stats.total_cost_amount_central || 0,

      // South region
      total_stake_amount_south: stats.total_stake_amount_south || 0,
      total_winning_amount_south: stats.total_winning_amount_south || 0,
      total_profit_amount_south: stats.total_profit_amount_south || 0,
      total_cost_amount_south: stats.total_cost_amount_south || 0,

      // Store winners and losers in verification_data JSON
      verification_data: {
        winners: stats.winners || 0,
        losers: stats.losers || 0,
        additional_info: 'Initial verification data',
      },

      status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('Creating new verification with data:', verificationData);

    // Create new verification record
    const { data, error } = await supabaseAdmin
      .from('verifications')
      .insert(verificationData)
      .select()
      .single();

    if (error) {
      console.error('Error creating verification:', error);
      return { data: null, error: error.message };
    }

    console.log('Verification created successfully:', data);
    revalidatePath('/admin/verifications');
    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in createVerification:', error);
    return { data: null, error: 'Internal server error' };
  }
}
