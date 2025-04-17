// src/app/actions/bet-reconciliation.js
'use server';

import { supabaseAdmin } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

// Fetch confirmed bet entries for reconciliation
export async function fetchBetsForReconciliation(date) {
  try {
    if (!date) {
      return { data: null, error: 'Date is required' };
    }

    // Format the date if needed
    const dateStr =
      typeof date === 'string' ? date : date.toISOString().split('T')[0];

    // Get confirmed bets for the selected date
    const { data: confirmedBets, error: confirmedError } = await supabaseAdmin
      .from('bet_entries')
      .select(
        `
        *,
        user:users!bet_entries_user_id_fkey(id, username, email, full_name),
        station:stations(id, name, region_id, region:regions(id, name, code))
      `
      )
      .eq('draw_date', dateStr)
      .in('status', ['draft', 'confirmed']);

    if (confirmedError) {
      console.error('Error fetching confirmed bets:', confirmedError);
      return { data: null, error: confirmedError.message };
    }

    // Get lottery results for the same date
    const { data: lotteryResults, error: lotteryError } = await supabaseAdmin
      .from('lottery_results')
      .select('*, station:stations(*)')
      .eq('draw_date', dateStr);

    if (lotteryError) {
      console.error('Error fetching lottery results:', lotteryError);
      return { data: null, error: lotteryError.message };
    }

    // Get bet types for reference
    const { data: betTypes, error: betTypesError } = await supabaseAdmin
      .from('bet_types')
      .select('*');

    if (betTypesError) {
      console.error('Error fetching bet types:', betTypesError);
      return { data: null, error: betTypesError.message };
    }

    // Calculate statistics
    const statistics = {
      total: confirmedBets.length,
      draft: confirmedBets.filter((bet) => bet.status === 'draft').length,
      confirmed: confirmedBets.filter((bet) => bet.status === 'confirmed')
        .length,
      totalStake: confirmedBets.reduce(
        (sum, bet) => sum + Number(bet.original_stake || 0),
        0
      ),
      totalAmount: confirmedBets.reduce(
        (sum, bet) => sum + Number(bet.amount || 0),
        0
      ),
    };

    return {
      data: {
        bets: confirmedBets,
        lotteryResults,
        betTypes,
        statistics,
        date: dateStr,
      },
      error: null,
    };
  } catch (error) {
    console.error('Unexpected error in fetchBetsForReconciliation:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Process reconciliation of bets
export async function reconcileBets(betIds, adminId, date) {
  try {
    if (!betIds || betIds.length === 0 || !adminId) {
      return { data: null, error: 'Missing required information' };
    }

    const dateStr =
      typeof date === 'string' ? date : date.toISOString().split('T')[0];

    // 1. Get bets to reconcile
    const { data: bets, error: betError } = await supabaseAdmin
      .from('bet_entries')
      .select(
        `
        *,
        station:stations(id, name, region_id, region:regions(id, name, code))
      `
      )
      .in('id', betIds);

    if (betError) {
      console.error('Error fetching bets to reconcile:', betError);
      return { data: null, error: betError.message };
    }

    // 2. Get lottery results for the date
    const { data: lotteryResults, error: lotteryError } = await supabaseAdmin
      .from('lottery_results')
      .select('*, station:stations(*)')
      .eq('draw_date', dateStr);

    if (lotteryError) {
      console.error('Error fetching lottery results:', lotteryError);
      return { data: null, error: lotteryError.message };
    }

    // 3. Get bet types for reference
    const { data: betTypes, error: betTypesError } = await supabaseAdmin
      .from('bet_types')
      .select('*');

    if (betTypesError) {
      console.error('Error fetching bet types:', betTypesError);
      return { data: null, error: betTypesError.message };
    }

    // If no lottery results for the date
    if (!lotteryResults || lotteryResults.length === 0) {
      return { data: null, error: 'No lottery results found for this date' };
    }

    // 3.5. Get station schedules for handling multi-station bets
    const { data: stationSchedules, error: scheduleError } = await supabaseAdmin
      .from('station_schedules')
      .select('*, station:stations(*, region:regions(id, name, code))');

    if (scheduleError) {
      console.error('Error fetching station schedules:', scheduleError);
      return { data: null, error: scheduleError.message };
    }

    // 4. Process each bet to determine winning status
    const updates = [];
    const results = {
      processed: 0,
      winners: 0,
      losers: 0,
      totalWinAmount: 0,
    };

    // Determine day of week for the draw date
    const drawDate = new Date(dateStr);
    const dayOfWeekIndex = drawDate.getDay(); // 0 = Sunday, 1 = Monday, ...
    const daysOfWeek = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    const dayOfWeek = daysOfWeek[dayOfWeekIndex];

    for (const bet of bets) {
      // Find bet type details
      const betType = betTypes.find(
        (type) => type.id === bet.bet_type_id || type.name === bet.bet_type_name
      );

      if (!betType) {
        console.log(
          `No matching bet type for bet ${bet.id}, type ${bet.bet_type_alias}`
        );
        continue;
      }

      let isWinning = false;
      let matchedNumbers = [];
      let prizeLevels = [];
      let winAmount = 0;
      let firstMatchingResultId = null;

      // NEW LOGIC: Check bet station format and reconcile accordingly
      if (bet.station_id) {
        // Case 1: Simple station - direct match with station_id
        const matchingResult = lotteryResults.find(
          (result) => result.station_id === bet.station_id
        );

        if (matchingResult) {
          const result = checkIfBetWon(bet, matchingResult, betType);
          isWinning = result.isWinning;
          matchedNumbers = result.matchedNumbers;
          prizeLevels = result.prizeLevels;
          winAmount = result.winAmount;

          if (isWinning) {
            firstMatchingResultId = matchingResult.id;
          }
        }
      } else if (bet.station_data) {
        if (
          bet.station_data.stations &&
          Array.isArray(bet.station_data.stations)
        ) {
          // Case 2: List of specific stations
          for (const stationInfo of bet.station_data.stations) {
            // Find matching lottery result for this station
            const matchingResult = lotteryResults.find(
              (result) =>
                result.station?.name?.toLowerCase() ===
                stationInfo.name.toLowerCase()
            );

            if (matchingResult) {
              const result = checkIfBetWon(bet, matchingResult, betType);

              if (result.isWinning) {
                isWinning = true;
                // Use Set to avoid duplicate numbers
                matchedNumbers = Array.from(
                  new Set([...matchedNumbers, ...result.matchedNumbers])
                );
                prizeLevels = [
                  ...prizeLevels,
                  ...result.prizeLevels.map(
                    (level) =>
                      `${matchingResult.station?.name || 'Unknown'}: ${level}`
                  ),
                ];
                winAmount += result.winAmount;

                if (!firstMatchingResultId) {
                  firstMatchingResultId = matchingResult.id;
                }
              }
            }
          }
        } else if (bet.station_data.multiStation === true) {
          // Case 3: Multi-station bet (region-based)
          const region = bet.station_data.region;
          const count = bet.station_data.count || 1;

          // Find schedules for stations in this region on the given day, ordered by order_number
          const relevantSchedules = stationSchedules
            .filter(
              (schedule) =>
                schedule.station &&
                schedule.station.region &&
                schedule.station.region.code === region &&
                (schedule.day_of_week === dayOfWeek ||
                  schedule.day_of_week === 'daily')
            )
            .sort((a, b) => a.order_number - b.order_number)
            .slice(0, count);

          // For each relevant station, check if the bet won
          for (const schedule of relevantSchedules) {
            // Find matching lottery result for this station
            const matchingResult = lotteryResults.find(
              (result) => result.station_id === schedule.station_id
            );

            if (matchingResult) {
              const result = checkIfBetWon(bet, matchingResult, betType);

              if (result.isWinning) {
                isWinning = true;
                // Use Set to avoid duplicate numbers
                matchedNumbers = Array.from(
                  new Set([...matchedNumbers, ...result.matchedNumbers])
                );
                prizeLevels = [
                  ...prizeLevels,
                  ...result.prizeLevels.map(
                    (level) =>
                      `${schedule.station?.name || 'Unknown'}: ${level}`
                  ),
                ];
                winAmount += result.winAmount;

                if (!firstMatchingResultId) {
                  firstMatchingResultId = matchingResult.id;
                }
              }
            }
          }
        } else if (bet.station_data.name) {
          // Case 4: Simple station name in station_data
          const matchingResult = lotteryResults.find(
            (result) =>
              result.station?.name?.toLowerCase() ===
              bet.station_data.name.toLowerCase()
          );

          if (matchingResult) {
            const result = checkIfBetWon(bet, matchingResult, betType);
            isWinning = result.isWinning;
            matchedNumbers = result.matchedNumbers;
            prizeLevels = result.prizeLevels;
            winAmount = result.winAmount;

            if (isWinning) {
              firstMatchingResultId = matchingResult.id;
            }
          }
        }
      }

      // Prepare update object
      const updateData = {
        status: 'processed',
        winning_status: isWinning,
        actual_winning: isWinning ? winAmount : 0,
        matched_numbers: isWinning ? matchedNumbers : [],
        matched_prize_levels: isWinning ? prizeLevels : [],
        lottery_result_id: firstMatchingResultId,
        result_verified_at: new Date().toISOString(),
        reconciliation_status: 'matched',
        verified_by: adminId,
        verified_at: new Date().toISOString(),
      };

      updates.push({ id: bet.id, data: updateData });

      // Update statistics
      results.processed++;
      if (isWinning) {
        results.winners++;
        results.totalWinAmount += winAmount;
      } else {
        results.losers++;
      }
    }

    // 5. Batch update the bets
    const batchSize = 10;
    const updateResults = [];

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      const promises = batch.map((update) =>
        supabaseAdmin
          .from('bet_entries')
          .update(update.data)
          .eq('id', update.id)
      );

      const batchResults = await Promise.all(promises);
      updateResults.push(...batchResults);
    }

    // Check for errors
    const errors = updateResults.filter((result) => result.error);
    if (errors.length > 0) {
      console.error('Errors during batch update:', errors);
      return {
        data: { success: false, errors },
        error: 'Some updates failed',
      };
    }

    // Prepare verification data
    const verificationData = {
      date: dateStr,
      admin_id: adminId,
      verification_data: {
        total_processed: results.processed,
        winners: results.winners,
        losers: results.losers,
        total_win_amount: results.totalWinAmount,
      },
      total_bet_codes: results.processed,
      total_stake_amount: bets.reduce(
        (sum, bet) => sum + Number(bet.stake || 0),
        0
      ),
      total_winning_amount: results.totalWinAmount,
      status: 'completed',
      updated_at: new Date().toISOString(),
    };

    // Check if verification record already exists for this date and admin
    const { data: existingVerification, error: checkError } =
      await supabaseAdmin
        .from('verifications')
        .select('id')
        .eq('date', dateStr)
        .eq('admin_id', adminId)
        .maybeSingle();

    if (checkError) {
      console.error('Error checking for existing verification:', checkError);
    }

    let verificationError;

    if (existingVerification) {
      // Update existing verification record
      console.log(`Updating existing verification record for date ${dateStr}`);
      const { error } = await supabaseAdmin
        .from('verifications')
        .update(verificationData)
        .eq('id', existingVerification.id);

      verificationError = error;
    } else {
      // Create new verification record
      console.log(`Creating new verification record for date ${dateStr}`);
      const { error } = await supabaseAdmin
        .from('verifications')
        .insert(verificationData);

      verificationError = error;
    }

    if (verificationError) {
      console.error('Error with verification record:', verificationError);
      // We continue as the main task is already complete
    }

    revalidatePath('/admin/bet-codes');
    return {
      data: {
        success: true,
        results,
        processed: results.processed,
        winners: results.winners,
        losers: results.losers,
        totalWinAmount: results.totalWinAmount,
      },
      error: null,
    };
  } catch (error) {
    console.error('Unexpected error in reconcileBets:', error);
    return { data: null, error: 'Internal server error' };
  }
}

// Helper function to check if a bet won
function checkIfBetWon(bet, lotteryResult, betType) {
  // Extract all prize numbers from lottery result
  const allPrizeNumbers = [
    ...(lotteryResult.special_prize || []),
    ...(lotteryResult.first_prize || []),
    ...(lotteryResult.second_prize || []),
    ...(lotteryResult.third_prize || []),
    ...(lotteryResult.fourth_prize || []),
    ...(lotteryResult.fifth_prize || []),
    ...(lotteryResult.sixth_prize || []),
    ...(lotteryResult.seventh_prize || []),
    ...(lotteryResult.eighth_prize || []),
  ];

  const betNumbers = bet.numbers || [];
  const betTypeAlias = bet.bet_type_alias.toLowerCase();
  const isPermutation = betType.is_permutation;

  let isWinning = false;
  let matchedNumbers = [];
  let prizeLevels = [];
  let winAmount = 0;

  // Different logic based on bet type
  switch (betTypeAlias) {
    case 'dd': // Đầu Đuôi (Head and Tail)
    case 'dau duoi':
    case 'đầu đuôi':
    case 'dau':
    case 'đầu':
    case 'duoi':
    case 'đuôi':
    case 'dui':
      // Check if any bet number appears in any prize numbers
      for (const num of betNumbers) {
        for (const prizeNum of allPrizeNumbers) {
          // For 2-digit numbers, match the last 2 digits
          if (num.length === 2 && prizeNum.endsWith(num)) {
            isWinning = true;
            matchedNumbers.push(num);
            prizeLevels.push(
              getPrizeLevel(prizeNum, allPrizeNumbers, lotteryResult)
            );
            break;
          }
          // For 3-digit numbers, match the last 3 digits
          else if (num.length === 3 && prizeNum.endsWith(num)) {
            isWinning = true;
            matchedNumbers.push(num);
            prizeLevels.push(
              getPrizeLevel(prizeNum, allPrizeNumbers, lotteryResult)
            );
            break;
          }
        }
      }
      break;

    case 'xc': // Xỉu chủ (3 digits)
    case 'x':
    case 'xiu chu':
    case 'xiuchu':
      // Check for 3-digit matches
      for (const num of betNumbers) {
        if (num.length === 3) {
          for (const prizeNum of allPrizeNumbers) {
            if (prizeNum.endsWith(num)) {
              isWinning = true;
              matchedNumbers.push(num);
              prizeLevels.push(
                getPrizeLevel(prizeNum, allPrizeNumbers, lotteryResult)
              );
              break;
            }
          }
        }
      }
      break;

    case 'b': // Bao Lô (Cover all)
    case 'bao':
    case 'bao lo':
    case 'bao lô':
      // Check all digits
      for (const num of betNumbers) {
        for (const prizeNum of allPrizeNumbers) {
          if (prizeNum.endsWith(num)) {
            isWinning = true;
            matchedNumbers.push(num);
            prizeLevels.push(
              getPrizeLevel(prizeNum, allPrizeNumbers, lotteryResult)
            );
            break;
          }
        }
      }
      break;

    case 'da': // Đá (Bridge)
    case 'dv': {
      // Check if at least 2 of the bet numbers match
      let matches = 0;
      for (const num of betNumbers) {
        for (const prizeNum of allPrizeNumbers) {
          if (prizeNum.endsWith(num)) {
            matchedNumbers.push(num);
            prizeLevels.push(
              getPrizeLevel(prizeNum, allPrizeNumbers, lotteryResult)
            );
            matches++;
            break;
          }
        }
      }
      isWinning = matches >= 2;
      break;
    }

    default:
      // For other bet types or permutation types
      if (isPermutation) {
        // Check permutations
        for (const num of betNumbers) {
          // Generate permutations (or use ones from the bet if available)
          const perms = bet.permutations?.[num] || generatePermutations(num);

          for (const perm of perms) {
            for (const prizeNum of allPrizeNumbers) {
              if (prizeNum.endsWith(perm)) {
                isWinning = true;
                matchedNumbers.push(perm);
                prizeLevels.push(
                  getPrizeLevel(prizeNum, allPrizeNumbers, lotteryResult)
                );
                break;
              }
            }
            if (isWinning) break;
          }
        }
      } else {
        // Default check for exact matches
        for (const num of betNumbers) {
          for (const prizeNum of allPrizeNumbers) {
            if (prizeNum.endsWith(num)) {
              isWinning = true;
              matchedNumbers.push(num);
              prizeLevels.push(
                getPrizeLevel(prizeNum, allPrizeNumbers, lotteryResult)
              );
              break;
            }
          }
        }
      }
  }

  // Calculate winning amount if this is a winner
  if (isWinning) {
    // Tính toán theo công thức mới:
    // Tổng số tiền thắng = số lượng số trúng * tiền thắng tiềm năng
    winAmount = matchedNumbers.length * (bet.potential_winning || 0);
  }

  return { isWinning, matchedNumbers, prizeLevels, winAmount };
}

// Helper function to determine which prize level a number belongs to
function getPrizeLevel(matchedNumber, allPrizeNumbers, lotteryResult) {
  if (lotteryResult.special_prize.includes(matchedNumber)) {
    return 'special_prize';
  } else if (lotteryResult.first_prize.includes(matchedNumber)) {
    return 'first_prize';
  } else if (lotteryResult.second_prize.includes(matchedNumber)) {
    return 'second_prize';
  } else if (lotteryResult.third_prize.includes(matchedNumber)) {
    return 'third_prize';
  } else if (lotteryResult.fourth_prize.includes(matchedNumber)) {
    return 'fourth_prize';
  } else if (lotteryResult.fifth_prize.includes(matchedNumber)) {
    return 'fifth_prize';
  } else if (lotteryResult.sixth_prize.includes(matchedNumber)) {
    return 'sixth_prize';
  } else if (lotteryResult.seventh_prize.includes(matchedNumber)) {
    return 'seventh_prize';
  } else if (
    lotteryResult.eighth_prize &&
    lotteryResult.eighth_prize.includes(matchedNumber)
  ) {
    return 'eighth_prize';
  }
  return 'unknown';
}

// Helper function to generate permutations of a number
function generatePermutations(number) {
  if (!number || number.length <= 1) return [number];

  const uniquePerms = new Set();

  function heapPermutation(a, size) {
    if (size === 1) {
      uniquePerms.add(a.join(''));
      return;
    }

    for (let i = 0; i < size; i++) {
      heapPermutation(a, size - 1);
      const j = size % 2 === 0 ? i : 0;
      const temp = a[j];
      a[j] = a[size - 1];
      a[size - 1] = temp;
    }
  }

  const digits = number.split('');
  heapPermutation([...digits], digits.length);

  return Array.from(uniquePerms);
}
