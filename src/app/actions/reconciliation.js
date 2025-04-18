// src/app/actions/reconciliation.js
'use server';

import { supabaseAdmin } from '@/utils/supabase/admin';
import { fetchAdminBetEntries } from '@/app/actions/bet-entries';

// Fetch reconciliation data for users managed by admin
export async function fetchUserReconciliationData({ userIds, date }) {
  try {
    if (!userIds || userIds.length === 0 || !date) {
      return { data: null, error: 'Missing required parameters' };
    }

    // Get bet entries for selected users and date
    const { data: entriesData, error: entriesError } =
      await fetchAdminBetEntries({
        userIds,
        date,
      });

    if (entriesError) {
      return { data: null, error: entriesError };
    }

    if (!entriesData || entriesData.length === 0) {
      return { data: [], error: null };
    }

    // Get commission settings for each user
    const userCommissionSettings = {};

    // Group by user_id to fetch commission settings only once per user
    const uniqueUserIds = [
      ...new Set(entriesData.map((entry) => entry.user_id)),
    ];

    // Fetch commission settings for all users in parallel
    const commissionsPromises = uniqueUserIds.map(async (userId) => {
      const { data, error } = await supabaseAdmin
        .from('user_commission_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        userCommissionSettings[userId] = data;
      } else {
        // Default commission settings if not found
        userCommissionSettings[userId] = {
          price_rate: 0.8,
          export_price_rate: 0.74,
          return_price_rate: 0.95,
        };
      }
    });

    await Promise.all(commissionsPromises);

    // Process and calculate statistics for each user
    const userReconciliationData = {};

    // Group by user_id
    entriesData.forEach((entry) => {
      if (!entry.user_id) return;

      if (!userReconciliationData[entry.user_id]) {
        userReconciliationData[entry.user_id] = {
          user: {
            id: entry.user_id,
            username: entry.user?.username || 'Unknown',
            full_name: entry.user?.full_name || 'Unknown User',
            email: entry.user?.email || '',
          },
          commissionSettings: userCommissionSettings[entry.user_id],
          north: {
            total_stake_amount: 0,
            total_winning_amount: 0,
            total_profit_amount: 0,
            total_cost_amount: 0,
            total_bet_codes: 0,
            total_bet_codes_winning: 0,
            total_bet_codes_losing: 0,
          },
          central: {
            total_stake_amount: 0,
            total_winning_amount: 0,
            total_profit_amount: 0,
            total_cost_amount: 0,
            total_bet_codes: 0,
            total_bet_codes_winning: 0,
            total_bet_codes_losing: 0,
          },
          south: {
            total_stake_amount: 0,
            total_winning_amount: 0,
            total_profit_amount: 0,
            total_cost_amount: 0,
            total_bet_codes: 0,
            total_bet_codes_winning: 0,
            total_bet_codes_losing: 0,
          },
        };
      }

      // Determine region
      let region = 'unknown';

      if (entry.station_data) {
        if (entry.station_data.region) {
          region = entry.station_data.region;
        } else if (
          entry.station_data.isVirtualStation &&
          entry.station_data.name
        ) {
          const name = entry.station_data.name.toLowerCase();
          if (name.includes('bắc') || name === 'mb') region = 'north';
          if (name.includes('trung') || name === 'mt') region = 'central';
          if (name.includes('nam') || name === 'mn') region = 'south';
        } else if (
          entry.station_data.stations &&
          entry.station_data.stations.length > 0
        ) {
          region = entry.station_data.stations[0].region || 'unknown';
        }
      } else if (entry.station && entry.station.region) {
        region = entry.station.region.code || 'unknown';
      }

      // Skip entries with unknown region
      if (
        region === 'unknown' ||
        !['north', 'central', 'south'].includes(region)
      ) {
        return;
      }

      // Only process entries with status "processed"
      if (entry.status !== 'processed') {
        return;
      }

      // Get user statistics for this region
      const regionStats = userReconciliationData[entry.user_id][region];

      // Add to total stake
      regionStats.total_stake_amount += Number(entry.original_stake || 0);

      // Add to total winning
      regionStats.total_winning_amount += Number(entry.actual_winning || 0);

      // Count total bet codes
      regionStats.total_bet_codes += 1;

      // Count winning and losing bet codes
      if (entry.winning_status === true) {
        regionStats.total_bet_codes_winning += 1;
      } else if (entry.winning_status === false) {
        regionStats.total_bet_codes_losing += 1;
      }
    });

    // Calculate profit/loss and cost amounts
    Object.values(userReconciliationData).forEach((userData) => {
      ['north', 'central', 'south'].forEach((region) => {
        const regionStats = userData[region];
        const commissionSettings = userData.commissionSettings;

        // Calculate profit/loss
        regionStats.total_profit_amount =
          regionStats.total_stake_amount - regionStats.total_winning_amount;

        // Calculate cost amount based on profit/loss
        if (regionStats.total_profit_amount > 0) {
          // If profit, multiply by export_price_rate
          regionStats.total_cost_amount =
            regionStats.total_profit_amount *
            commissionSettings.export_price_rate;
        } else if (regionStats.total_profit_amount < 0) {
          // If loss, multiply by return_price_rate
          regionStats.total_cost_amount =
            regionStats.total_profit_amount *
            commissionSettings.return_price_rate;
        } else {
          regionStats.total_cost_amount = 0;
        }
      });
    });

    return {
      data: Object.values(userReconciliationData),
      error: null,
    };
  } catch (error) {
    console.error('Unexpected error in fetchUserReconciliationData:', error);
    return { data: null, error: 'Internal server error' };
  }
}
