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

    // 4. Process each bet to determine winning status
    const updates = [];
    const results = {
      processed: 0,
      winners: 0,
      losers: 0,
      totalWinAmount: 0,
    };

    for (const bet of bets) {
      // Find matching lottery result for this bet
      const matchingResult = lotteryResults.find(
        (result) => result.station_id === bet.station_id
      );

      if (!matchingResult) {
        console.log(
          `No matching lottery result for bet ${bet.id}, station ${bet.station_id}`
        );
        continue;
      }

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

      // Determine if bet is winning based on the bet type and numbers
      const { isWinning, matchedNumbers, prizeLevels, winAmount } =
        checkIfBetWon(bet, matchingResult, betType);

      // Prepare update object
      const updateData = {
        status: 'processed',
        winning_status: isWinning,
        actual_winning: isWinning ? winAmount : 0,
        matched_numbers: isWinning ? matchedNumbers : [],
        matched_prize_levels: isWinning ? prizeLevels : [],
        lottery_result_id: matchingResult.id,
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

    // Create verification record
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
    };

    const { error: verificationError } = await supabaseAdmin
      .from('verifications')
      .insert(verificationData);

    if (verificationError) {
      console.error('Error creating verification record:', verificationError);
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
    // First, get the standard payout rate from bet type
    let payoutRate;
    if (typeof betType.payout_rate === 'object') {
      // Handle complex payout rates based on region or digit count
      const digitCount = betNumbers[0]?.length || 2;
      const region = bet.station?.region?.code || 'south';

      if (betTypeAlias === 'da' || betTypeAlias === 'dv') {
        // Bridge bet type logic
        if (region === 'north') {
          payoutRate = betType.payout_rate.bridgeNorth || 650;
        } else if (matchedNumbers.length === 2) {
          payoutRate = betType.payout_rate.bridgeTwoStations || 550;
        } else {
          payoutRate = betType.payout_rate.bridgeOneStation || 750;
        }
      } else {
        // Regular bet type
        if (digitCount === 2) {
          payoutRate = betType.payout_rate['2 digits'] || 75;
        } else if (digitCount === 3) {
          payoutRate = betType.payout_rate['3 digits'] || 650;
        } else if (digitCount === 4) {
          payoutRate = betType.payout_rate['4 digits'] || 5500;
        }
      }
    } else {
      payoutRate = betType.payout_rate || 75;
    }

    // Calculate win amount based on bet amount and payout rate
    winAmount = (bet.amount || 0) * (payoutRate / 10); // Adjust based on your payment logic
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
