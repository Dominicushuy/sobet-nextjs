// src/app/actions/bet-reconciliation.js
'use server';

import { supabaseAdmin } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import {
  createVerification,
  updateVerification,
  getVerificationDetailStats,
} from './verifications';

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

    // Lấy thống kê chi tiết cho tất cả các vùng
    const { data: verificationStats, error: statsError } =
      await getVerificationDetailStats(adminId, dateStr);

    if (statsError) {
      console.error('Error getting verification stats:', statsError);
      // Vẫn tiếp tục xử lý với dữ liệu tóm tắt cơ bản
    }

    // Kiểm tra xem đã có bản ghi verification cho ngày và admin này chưa
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

    // Dữ liệu cơ bản nếu không lấy được stats chi tiết
    const basicVerificationData = {
      total_entries: results.processed,
      winning_entries: results.winners,
      losing_entries: results.losers,
      total_stake_amount: bets.reduce(
        (sum, bet) => sum + Number(bet.stake || 0),
        0
      ),
      total_winning_amount: results.totalWinAmount,
      total_profit_amount:
        results.totalWinAmount -
        bets.reduce((sum, bet) => sum + Number(bet.stake || 0), 0),
    };

    // Cập nhật hoặc tạo mới bản ghi verification
    let verificationError;
    if (existingVerification) {
      // Cập nhật bản ghi đã tồn tại
      const { error } = await updateVerification(
        existingVerification.id,
        adminId,
        dateStr,
        verificationStats || basicVerificationData
      );
      verificationError = error;
    } else {
      // Tạo bản ghi mới
      const { error } = await createVerification(
        adminId,
        dateStr,
        verificationStats || basicVerificationData
      );
      verificationError = error;
    }

    if (verificationError) {
      console.error('Error with verification record:', verificationError);
      // Vẫn tiếp tục vì nhiệm vụ chính đã hoàn thành
    }

    // Cập nhật path để làm mới dữ liệu
    revalidatePath('/admin/verifications');
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
  // Xác định vùng (region) của đài
  const region = lotteryResult.station?.region_id
    ? lotteryResult.station.region?.code ||
      getRegionCodeFromId(lotteryResult.station.region_id)
    : 'unknown';

  // Tách các loại giải thưởng theo cấu trúc giải thưởng
  const prizes = {
    special: lotteryResult.special_prize || [],
    first: lotteryResult.first_prize || [],
    second: lotteryResult.second_prize || [],
    third: lotteryResult.third_prize || [],
    fourth: lotteryResult.fourth_prize || [],
    fifth: lotteryResult.fifth_prize || [],
    sixth: lotteryResult.sixth_prize || [],
    seventh: lotteryResult.seventh_prize || [],
    eighth: lotteryResult.eighth_prize || [],
  };

  // Xác định giải đầu và giải đuôi dựa trên vùng
  const headPrizes = {
    south: prizes.eighth, // Giải 8 ở miền Nam
    central: prizes.eighth, // Giải 8 ở miền Trung
    north: prizes.seventh, // Giải 7 ở miền Bắc
  };

  const headPrizes3Digits = {
    south: prizes.seventh, // Giải 7 ở miền Nam
    central: prizes.seventh, // Giải 7 ở miền Trung
    north: prizes.sixth, // Giải 6 ở miền Bắc
  };

  const tailPrizes = {
    south: prizes.special, // Giải đặc biệt ở miền Nam
    central: prizes.special, // Giải đặc biệt ở miền Trung
    north: prizes.special, // Giải đặc biệt ở miền Bắc
  };

  // Tất cả các giải thưởng gộp lại
  const allPrizes = [
    ...prizes.special,
    ...prizes.first,
    ...prizes.second,
    ...prizes.third,
    ...prizes.fourth,
    ...prizes.fifth,
    ...prizes.sixth,
    ...prizes.seventh,
    ...prizes.eighth,
  ].filter((prize) => prize); // Lọc ra các giá trị undefined/null

  const betNumbers = bet.numbers || [];
  const betTypeAlias = bet.bet_type_alias?.toLowerCase();
  const isPermutation = betType.is_permutation;

  let isWinning = false;
  let matchedNumbers = [];
  let prizeLevels = [];
  let winAmount = 0;

  // Xác định số chữ số của số cược (2, 3, hoặc 4 chữ số)
  const digitLength = betNumbers.length > 0 ? betNumbers[0].length : 0;

  // Kiểm tra trúng thưởng dựa trên loại cược
  switch (betTypeAlias) {
    case 'dd': // Đầu Đuôi (Head and Tail)
    case 'dau duoi':
    case 'đầu đuôi': {
      // Kiểm tra giải đầu
      const headPrizeArray =
        digitLength === 3
          ? headPrizes3Digits[region] || []
          : headPrizes[region] || [];
      for (const num of betNumbers) {
        // Kiểm tra giải đầu
        for (const prizeNum of headPrizeArray) {
          if (prizeNum && prizeNum.endsWith(num)) {
            isWinning = true;
            matchedNumbers.push(num);
            prizeLevels.push(getHeadPrizeLevel(region));
            break;
          }
        }

        // Kiểm tra giải đuôi (giải đặc biệt)
        for (const prizeNum of tailPrizes[region] || []) {
          if (prizeNum && prizeNum.endsWith(num)) {
            isWinning = true;
            matchedNumbers.push(num);
            prizeLevels.push('special_prize');
            break;
          }
        }
      }
      break;
    }

    case 'dau': // Đầu (Head only)
    case 'đầu':
    case 'head': {
      // Chỉ kiểm tra giải đầu
      const headArray =
        digitLength === 3
          ? headPrizes3Digits[region] || []
          : headPrizes[region] || [];
      for (const num of betNumbers) {
        for (const prizeNum of headArray) {
          if (prizeNum && prizeNum.endsWith(num)) {
            isWinning = true;
            matchedNumbers.push(num);
            prizeLevels.push(getHeadPrizeLevel(region));
            break;
          }
        }
      }
      break;
    }

    case 'duoi': // Đuôi (Tail only)
    case 'đuôi':
    case 'dui':
    case 'tail':
      // Chỉ kiểm tra giải đuôi (giải đặc biệt)
      for (const num of betNumbers) {
        for (const prizeNum of tailPrizes[region] || []) {
          if (prizeNum && prizeNum.endsWith(num)) {
            isWinning = true;
            matchedNumbers.push(num);
            prizeLevels.push('special_prize');
            break;
          }
        }
      }
      break;

    case 'xc': // Xỉu chủ (3 digits)
    case 'x':
    case 'xiu chu':
    case 'xiuchu':
      // Kiểm tra giải đầu 3 chữ số
      for (const num of betNumbers) {
        if (num.length === 3) {
          // Kiểm tra giải đầu
          for (const prizeNum of headPrizes3Digits[region] || []) {
            if (prizeNum && prizeNum.endsWith(num)) {
              isWinning = true;
              matchedNumbers.push(num);
              prizeLevels.push(getHeadPrizeLevel(region, 3));
              break;
            }
          }

          // Kiểm tra giải đuôi (giải đặc biệt)
          for (const prizeNum of tailPrizes[region] || []) {
            if (prizeNum && prizeNum.endsWith(num)) {
              isWinning = true;
              matchedNumbers.push(num);
              prizeLevels.push('special_prize');
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
      // Kiểm tra tất cả các giải
      for (const num of betNumbers) {
        for (const prizeNum of allPrizes) {
          if (prizeNum && prizeNum.endsWith(num)) {
            isWinning = true;
            matchedNumbers.push(num);
            prizeLevels.push(getPrizeLevel(prizeNum, allPrizes, lotteryResult));
            break;
          }
        }
      }
      break;

    case 'baobay': // Bao Lô 7
    case 'b7l':
    case 'b7lo':
      if (['south', 'central'].includes(region)) {
        // Bao Lô 7 chỉ áp dụng cho Miền Nam và Miền Trung
        // 7 giải cụ thể: giải 8, giải 7, giải 6, giải 5 và giải đặc biệt
        const specificPrizes = [
          ...prizes.eighth,
          ...prizes.seventh,
          ...prizes.sixth,
          ...prizes.fifth,
          ...prizes.special,
        ];

        for (const num of betNumbers) {
          for (const prizeNum of specificPrizes) {
            if (prizeNum && prizeNum.endsWith(num)) {
              isWinning = true;
              matchedNumbers.push(num);
              prizeLevels.push(
                getPrizeLevel(prizeNum, allPrizes, lotteryResult)
              );
              break;
            }
          }
        }
      }
      break;

    case 'baotam': // Bao Lô 8
    case 'b8l':
    case 'b8lo':
      if (region === 'north') {
        // Bao Lô 8 chỉ áp dụng cho Miền Bắc
        // 8 giải cụ thể: giải 7 (4 số), giải 6 (3 số) và giải đặc biệt (1 số)
        const specificPrizes = [
          ...prizes.seventh,
          ...prizes.sixth,
          ...prizes.special,
        ];

        for (const num of betNumbers) {
          for (const prizeNum of specificPrizes) {
            if (prizeNum && prizeNum.endsWith(num)) {
              isWinning = true;
              matchedNumbers.push(num);
              prizeLevels.push(
                getPrizeLevel(prizeNum, allPrizes, lotteryResult)
              );
              break;
            }
          }
        }
      }
      break;

    case 'da': // Đá (Bridge)
    case 'dv': {
      // Cần có ít nhất 2 số trong danh sách cược trùng với kết quả
      const matchingResults = [];

      // Kiểm tra từng số cược
      for (const num of betNumbers) {
        for (const prizeNum of allPrizes) {
          if (prizeNum && prizeNum.endsWith(num)) {
            matchingResults.push({
              betNumber: num,
              prizeNumber: prizeNum,
              prizeLevel: getPrizeLevel(prizeNum, allPrizes, lotteryResult),
            });
            break;
          }
        }
      }

      // Cần ít nhất 2 số trúng
      if (matchingResults.length >= 2) {
        isWinning = true;
        matchedNumbers = matchingResults.map((match) => match.betNumber);
        prizeLevels = matchingResults.map((match) => match.prizeLevel);

        // Tính số tiền thắng với công thức đặc biệt
        const winMultiplier = matchingResults.length - 1; // Hệ số W

        // Tỉ lệ thưởng R dựa vào loại đá
        let rateType = 'bridgeOneStation';
        if (bet.station_data && bet.station_data.multiStation) {
          rateType = region === 'north' ? 'bridgeNorth' : 'bridgeTwoStations';
        }

        // Giá trị tỉ lệ thưởng từ betType
        const payoutRate = betType.payout_rate[rateType] || 750;

        // Số tiền thắng cơ bản (V)
        const baseWinAmount = bet.amount * payoutRate;

        // Kiểm tra các số trùng lặp trong kết quả (N)
        const prizeNumberFrequency = {};
        for (const match of matchingResults) {
          prizeNumberFrequency[match.betNumber] =
            (prizeNumberFrequency[match.betNumber] || 0) + 1;
        }

        // Tìm số xuất hiện nhiều nhất
        let maxFrequency = 1;
        for (const frequency of Object.values(prizeNumberFrequency)) {
          maxFrequency = Math.max(maxFrequency, frequency);
        }

        // Tính tiền thưởng nháy (B)
        const bonusAmount =
          maxFrequency > 1 ? (maxFrequency - 1) * 0.5 * baseWinAmount : 0;

        // Tổng tiền thưởng = V * W + B
        winAmount = baseWinAmount * winMultiplier + bonusAmount;
      }
      break;
    }

    default:
      // Xử lý cho các loại cược còn lại
      if (isPermutation) {
        // Các loại đảo (cần kiểm tra hoán vị)
        for (const num of betNumbers) {
          // Tạo các hoán vị của số cược
          const permutations = generatePermutations(num);
          let found = false;

          switch (betTypeAlias) {
            case 'daob': // Đảo Bao Lô
            case 'bdao':
            case 'dao bao':
            case 'dao bao lo':
              // Kiểm tra tất cả các giải với mọi hoán vị
              for (const perm of permutations) {
                for (const prizeNum of allPrizes) {
                  if (prizeNum && prizeNum.endsWith(perm)) {
                    isWinning = true;
                    matchedNumbers.push(perm);
                    prizeLevels.push(
                      getPrizeLevel(prizeNum, allPrizes, lotteryResult)
                    );
                    found = true;
                    break;
                  }
                }
                if (found) break;
              }
              break;

            case 'b7ld': // Bao Lô 7 Đảo
            case 'b7ldao':
              if (['south', 'central'].includes(region)) {
                const specificPrizes = [
                  ...prizes.eighth,
                  ...prizes.seventh,
                  ...prizes.sixth,
                  ...prizes.fifth,
                  ...prizes.special,
                ];

                for (const perm of permutations) {
                  for (const prizeNum of specificPrizes) {
                    if (prizeNum && prizeNum.endsWith(perm)) {
                      isWinning = true;
                      matchedNumbers.push(perm);
                      prizeLevels.push(
                        getPrizeLevel(prizeNum, allPrizes, lotteryResult)
                      );
                      found = true;
                      break;
                    }
                  }
                  if (found) break;
                }
              }
              break;

            case 'b8ld': // Bao Lô 8 Đảo
            case 'b8ldao':
              if (region === 'north') {
                const specificPrizes = [
                  ...prizes.seventh,
                  ...prizes.sixth,
                  ...prizes.special,
                ];

                for (const perm of permutations) {
                  for (const prizeNum of specificPrizes) {
                    if (prizeNum && prizeNum.endsWith(perm)) {
                      isWinning = true;
                      matchedNumbers.push(perm);
                      prizeLevels.push(
                        getPrizeLevel(prizeNum, allPrizes, lotteryResult)
                      );
                      found = true;
                      break;
                    }
                  }
                  if (found) break;
                }
              }
              break;

            case 'daoxc': // Đảo Xỉu Chủ
            case 'dxc':
            case 'xcd':
            case 'xcdao':
              // Kiểm tra giải đầu 3 chữ số và giải đặc biệt với mọi hoán vị
              for (const perm of permutations) {
                // Kiểm tra giải đầu 3 chữ số
                for (const prizeNum of headPrizes3Digits[region] || []) {
                  if (prizeNum && prizeNum.endsWith(perm)) {
                    isWinning = true;
                    matchedNumbers.push(perm);
                    prizeLevels.push(getHeadPrizeLevel(region, 3));
                    found = true;
                    break;
                  }
                }

                // Kiểm tra giải đặc biệt
                if (!found) {
                  for (const prizeNum of tailPrizes[region] || []) {
                    if (prizeNum && prizeNum.endsWith(perm)) {
                      isWinning = true;
                      matchedNumbers.push(perm);
                      prizeLevels.push('special_prize');
                      found = true;
                      break;
                    }
                  }
                }

                if (found) break;
              }
              break;

            case 'dxcdau': // Đảo Xỉu Chủ Đầu
            case 'daodau':
            case 'ddau':
              // Chỉ kiểm tra giải đầu 3 chữ số với mọi hoán vị
              for (const perm of permutations) {
                for (const prizeNum of headPrizes3Digits[region] || []) {
                  if (prizeNum && prizeNum.endsWith(perm)) {
                    isWinning = true;
                    matchedNumbers.push(perm);
                    prizeLevels.push(getHeadPrizeLevel(region, 3));
                    found = true;
                    break;
                  }
                }
                if (found) break;
              }
              break;

            case 'dxcduoi': // Đảo Xỉu Chủ Đuôi
            case 'daoduoi':
            case 'daodui':
            case 'dduoi':
            case 'ddui':
              // Chỉ kiểm tra giải đặc biệt với mọi hoán vị
              for (const perm of permutations) {
                for (const prizeNum of tailPrizes[region] || []) {
                  if (prizeNum && prizeNum.endsWith(perm)) {
                    isWinning = true;
                    matchedNumbers.push(perm);
                    prizeLevels.push('special_prize');
                    found = true;
                    break;
                  }
                }
                if (found) break;
              }
              break;
          }
        }
      } else {
        // Xử lý các trường hợp đặc biệt khác
        switch (betTypeAlias) {
          case 'nt': // Nhất To (First prize in North)
          case 'nto':
          case 'nhatto':
            if (region === 'north') {
              // Chỉ kiểm tra giải nhất của Miền Bắc
              for (const num of betNumbers) {
                for (const prizeNum of prizes.first) {
                  if (prizeNum && prizeNum.endsWith(num)) {
                    isWinning = true;
                    matchedNumbers.push(num);
                    prizeLevels.push('first_prize');
                    break;
                  }
                }
              }
            }
            break;

          default:
            // Mặc định kiểm tra khớp chính xác với tất cả các giải
            for (const num of betNumbers) {
              for (const prizeNum of allPrizes) {
                if (prizeNum && prizeNum.endsWith(num)) {
                  isWinning = true;
                  matchedNumbers.push(num);
                  prizeLevels.push(
                    getPrizeLevel(prizeNum, allPrizes, lotteryResult)
                  );
                  break;
                }
              }
            }
        }
      }
  }

  // Tính số tiền thưởng nếu trúng
  // Trường hợp đặc biệt cho Đá đã được xử lý riêng
  if (isWinning && betTypeAlias !== 'da' && betTypeAlias !== 'dv') {
    winAmount = matchedNumbers.length * (bet.potential_winning || 0);
  }

  return { isWinning, matchedNumbers, prizeLevels, winAmount };
}

// Helper function to determine which prize level a number belongs to
function getPrizeLevel(matchedNumber, allPrizeNumbers, lotteryResult) {
  if (
    lotteryResult.special_prize &&
    lotteryResult.special_prize.includes(matchedNumber)
  ) {
    return 'special_prize';
  } else if (
    lotteryResult.first_prize &&
    lotteryResult.first_prize.includes(matchedNumber)
  ) {
    return 'first_prize';
  } else if (
    lotteryResult.second_prize &&
    lotteryResult.second_prize.includes(matchedNumber)
  ) {
    return 'second_prize';
  } else if (
    lotteryResult.third_prize &&
    lotteryResult.third_prize.includes(matchedNumber)
  ) {
    return 'third_prize';
  } else if (
    lotteryResult.fourth_prize &&
    lotteryResult.fourth_prize.includes(matchedNumber)
  ) {
    return 'fourth_prize';
  } else if (
    lotteryResult.fifth_prize &&
    lotteryResult.fifth_prize.includes(matchedNumber)
  ) {
    return 'fifth_prize';
  } else if (
    lotteryResult.sixth_prize &&
    lotteryResult.sixth_prize.includes(matchedNumber)
  ) {
    return 'sixth_prize';
  } else if (
    lotteryResult.seventh_prize &&
    lotteryResult.seventh_prize.includes(matchedNumber)
  ) {
    return 'seventh_prize';
  } else if (
    lotteryResult.eighth_prize &&
    lotteryResult.eighth_prize.includes(matchedNumber)
  ) {
    return 'eighth_prize';
  }
  return 'unknown';
}

// Helper function to get head prize level based on region
function getHeadPrizeLevel(region, digits = 2) {
  if (digits === 2) {
    return region === 'north' ? 'seventh_prize' : 'eighth_prize';
  } else {
    return region === 'north' ? 'sixth_prize' : 'seventh_prize';
  }
}

// Helper function to get region code from region id
function getRegionCodeFromId(regionId) {
  // Giả định ID của các vùng:
  // 1: 'north', 2: 'central', 3: 'south'
  const regionMap = {
    1: 'north',
    2: 'central',
    3: 'south',
  };
  return regionMap[regionId] || 'unknown';
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
