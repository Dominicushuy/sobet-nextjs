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
    if (!date) {
      const today = new Date();
      date = today.toISOString().split('T')[0];
    }

    // Format date if it's a Date object
    const dateStr =
      typeof date === 'string' ? date : date.toISOString().split('T')[0];

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

    // Nếu không có dữ liệu, trả về mảng rỗng
    if (!verifications || verifications.length === 0) {
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

    // Enhance verification data with commission settings
    const enhancedVerifications = verifications.map((verification) => {
      const settings = commissionSettingsMap[verification.admin_id] || {};

      return {
        ...verification,
        commissionSettings: {
          priceRate: settings.price_rate || 0.8,
          exportPriceRate: settings.export_price_rate || 0.74,
          returnPriceRate: settings.return_price_rate || 0.95,
        },
      };
    });

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

    // Initialize statistics
    const stats = {
      total_entries: entries.length,
      winning_entries: 0,
      losing_entries: 0,

      // Overall statistics
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
      const isWinning = entry.winning_status === true;

      // Update overall statistics
      stats.total_stake_amount += stakeAmount;
      stats.total_winning_amount += winningAmount;

      // Count winning/losing entries
      if (isWinning) {
        stats.winning_entries++;
      } else {
        stats.losing_entries++;
      }

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
      return { data: null, error: 'Missing required information' };
    }

    // Prepare verification data with region-specific information
    const verificationData = {
      // Overall statistics
      total_bet_codes: stats.total_entries || 0,
      total_stake_amount: stats.total_stake_amount || 0,
      total_winning_amount: stats.total_winning_amount || 0,
      winning_entries: stats.winning_entries || 0,
      losing_entries: stats.losing_entries || 0,
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

      // Thông tin bổ sung vẫn lưu trong verification_data
      verification_data: {
        additional_info: 'Thông tin bổ sung nếu có',
      },

      updated_at: new Date().toISOString(),
    };

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
      return { data: null, error: 'Missing required information' };
    }

    // Prepare verification data with region-specific information
    const verificationData = {
      date: date,
      admin_id: userId,

      // Overall statistics
      total_bet_codes: stats.total_entries || 0,
      total_stake_amount: stats.total_stake_amount || 0,
      total_winning_amount: stats.total_winning_amount || 0,
      winning_entries: stats.winning_entries || 0,
      losing_entries: stats.losing_entries || 0,
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

      // Thông tin bổ sung vẫn lưu trong verification_data
      verification_data: {
        additional_info: 'Thông tin bổ sung nếu có',
      },

      status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

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

    revalidatePath('/admin/verifications');
    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in createVerification:', error);
    return { data: null, error: 'Internal server error' };
  }
}
