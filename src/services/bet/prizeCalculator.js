// src/services/bet/prizeCalculator.js
import { calculatePermutationCount } from '@/utils/bet';
import { BET_CONFIG } from '@/config/data';

/**
 * Lấy thông tin về đài
 * @param {object} station - Thông tin đài từ parsedResult
 * @returns {object} Thông tin về đài
 */
function getStationInfo(station) {
  if (station.multiStation) {
    // Đài nhiều miền
    return {
      count: station.count || 1,
      region: station.region,
    };
  } else if (station.stations) {
    // Nhiều đài (vl.ct)
    return {
      count: station.stations.length || 1,
      region: station.region,
    };
  } else {
    // Đài đơn lẻ
    return {
      count: 1,
      region: station.region,
    };
  }
}

/**
 * Lấy số lượng chữ số của số đầu tiên trong dòng
 */
function getDigitCount(line) {
  if (line.numbers && line.numbers.length > 0) {
    const firstNumber = line.numbers[0];
    return firstNumber ? firstNumber.length : 2;
  }
  return 2; // Mặc định là 2 chữ số
}

/**
 * Lấy thông tin về số và tổ hợp
 * @param {object} line - Dòng mã cược
 * @param {object} betTypeInfo - Thông tin về kiểu cược
 * @param {object} station - Thông tin đài từ parsedResult
 * @returns {object} Thông tin về số và tổ hợp
 */
function getNumberInfo(line, betTypeInfo, station) {
  const numbers = line.numbers || [];
  const betTypeAlias = betTypeInfo.alias?.toLowerCase();
  const digitCount = getDigitCount(line);
  const region = station.region || 'south';

  // Check for errors in bet type info
  if (betTypeInfo.error) {
    return {
      count: numbers.length,
      combinationCount: 0,
      isBridge: false,
      isPermutation: false,
      digitCount,
      error: betTypeInfo.error,
    };
  }

  // Kiểm tra loại cược từ BET_CONFIG
  const daAliases = BET_CONFIG.betTypes.find(
    (bt) => bt.special_calc === 'bridge'
  )?.aliases || ['da', 'dv'];
  const isBridge =
    betTypeInfo.specialCalc === 'bridge' || daAliases.includes(betTypeAlias);

  // Find the exact bet type from BET_CONFIG
  const betType = BET_CONFIG.betTypes.find(
    (bt) =>
      bt.name === betTypeInfo.id ||
      bt.aliases.some((a) => a.toLowerCase() === betTypeAlias)
  );

  // Check for permutation
  const isPermutation = betType ? betType.is_permutation : false;

  // Khởi tạo combinationCount
  let combinationCount = 1;

  // Get combinations from BET_CONFIG data if available
  if (betType && betType.combinations) {
    if (typeof betType.combinations === 'object') {
      // Case 1: Direct mapping for region
      if (typeof betType.combinations[region] === 'number') {
        combinationCount = betType.combinations[region];
      }
      // Case 2: Nested structure for digit count
      else if (
        typeof betType.combinations[`${digitCount} digits`] === 'object'
      ) {
        combinationCount =
          betType.combinations[`${digitCount} digits`][region] || 1;
      }
      // Case 3: Direct mapping for digit count
      else if (
        typeof betType.combinations[`${digitCount} digits`] === 'number'
      ) {
        combinationCount = betType.combinations[`${digitCount} digits`];
      }
    } else if (typeof betType.combinations === 'number') {
      combinationCount = betType.combinations;
    }
  }

  return {
    count: numbers.length,
    combinationCount,
    isBridge,
    isPermutation,
    digitCount,
  };
}

/**
 * Lấy thông tin về kiểu cược
 * @param {object} line - Dòng mã cược
 * @param {object} stationInfo - Thông tin về đài
 * @returns {object} Thông tin về kiểu cược
 */
function getBetTypeInfo(line, stationInfo) {
  const betTypeId = line.betType?.id;
  const betTypeAlias = line.betType?.alias?.toLowerCase();

  // Tìm bet type dựa trên ID hoặc alias từ BET_CONFIG
  const betType = BET_CONFIG.betTypes.find(
    (bt) =>
      bt.name === betTypeId ||
      bt.aliases.some((a) => a.toLowerCase() === betTypeAlias)
  );

  if (!betType) {
    return {
      id: betTypeId,
      name: line.betType?.name || 'Unknown',
      alias: betTypeAlias || '',
      payoutRate: 0,
      combined: false,
      isPermutation: false,
    };
  }

  // Xác định số chữ số để lấy tỉ lệ chính xác
  const digitCount = getDigitCount(line);

  // Validate against bet type rules
  if (betType.bet_rule) {
    const allowedDigitRules = betType.bet_rule;
    const isAllowed = allowedDigitRules.some(
      (rule) => rule === `${digitCount} digits`
    );

    if (!isAllowed) {
      return {
        id: betTypeId,
        name: betType.name || 'Unknown',
        alias: betTypeAlias || '',
        payoutRate: 0,
        combined: false,
        error: `Kiểu cược ${betTypeAlias} chỉ chấp nhận ${allowedDigitRules.join(
          ', '
        )}, không hỗ trợ số ${digitCount} chữ số`,
      };
    }
  }

  // Get payout rate, preferring custom rate if available
  let payoutRate = betType.custom_payout_rate || betType.payout_rate || 0;

  // Apply commission rate from BET_CONFIG
  const priceRate = BET_CONFIG.commissionSettings.priceRate || 0.8;

  // Handle complex payout rate structures
  if (typeof payoutRate === 'object') {
    if (
      betTypeAlias === 'da' ||
      betTypeAlias === 'dv' ||
      betType.special_calc === 'bridge'
    ) {
      // Bridge bet type logic
      const region = stationInfo.region;
      const stationCount = stationInfo.count || 1;

      if (region === 'north') {
        payoutRate = payoutRate.bridgeNorth || 650;
      } else if (stationCount === 2) {
        payoutRate = payoutRate.bridgeTwoStations || 550;
      } else {
        payoutRate = payoutRate.bridgeOneStation || 750;
      }
    } else {
      // Handle digit-specific rates
      if (digitCount === 2) {
        payoutRate = payoutRate['2 digits'] || 75;
      } else if (digitCount === 3) {
        payoutRate = payoutRate['3 digits'] || 650;
      } else if (digitCount === 4) {
        payoutRate = payoutRate['4 digits'] || 5500;
      }
    }
  }

  // Apply commission price rate if available
  payoutRate = payoutRate * priceRate;

  return {
    id: betType.name,
    name: betType.name,
    alias: betTypeAlias,
    payoutRate,
    combined: betType.combined || false,
    specialCalc: betType.special_calc || null,
    isPermutation: betType.is_permutation || false,
  };
}

/**
 * Tính tiềm năng thắng cược cho một dòng
 * @param {object} line - Dòng mã cược
 * @param {object} stationInfo - Thông tin về đài
 * @param {object} betTypeInfo - Thông tin về kiểu cược
 * @param {object} numberInfo - Thông tin về số và tổ hợp
 * @returns {object} Kết quả tính tiềm năng thắng cược
 */
function calculateLinePotential(line, stationInfo, betTypeInfo, numberInfo) {
  // Check for errors in bet type info or number info
  if (betTypeInfo.error) {
    return {
      potentialPrize: 0,
      valid: false,
      error: betTypeInfo.error,
    };
  }

  if (numberInfo.error) {
    return {
      potentialPrize: 0,
      valid: false,
      error: numberInfo.error,
    };
  }

  const betAmount = line.amount || 0;
  const payoutRate = betTypeInfo.payoutRate || 0;

  // Kiểm tra nếu là kiểu đá (bridge) từ BET_CONFIG
  if (numberInfo.isBridge || betTypeInfo.specialCalc === 'bridge') {
    // For bridge bet types, make sure we have at least 2 numbers
    if (numberInfo.count < 2) {
      return {
        potentialPrize: 0,
        valid: false,
        error: 'Kiểu đá (da) cần ít nhất 2 số',
      };
    }

    // Tính số cặp tối đa
    const n = numberInfo.count;
    const maxPairs = (n * (n - 1)) / 2; // C(n,2) = số cặp tối đa

    // Tính tiềm năng thắng (không nhân với combinationCount)
    const potentialPrize =
      stationInfo.count * maxPairs * betAmount * payoutRate;

    return {
      potentialPrize,
      valid: true,
      stationCount: stationInfo.count,
      betPairs: maxPairs,
      betAmount,
      payoutRate,
      formula: `${stationInfo.count} × ${maxPairs} × ${betAmount} × ${payoutRate}`,
    };
  }
  // Kiểm tra nếu là kiểu đảo (permutation) từ BET_CONFIG
  else if (numberInfo.isPermutation) {
    // Số lượng hoán vị của các số
    const numbers = line.numbers || [];
    let totalPermutations = 0;

    for (const number of numbers) {
      totalPermutations += calculatePermutationCount(number);
    }

    // Tính tiềm năng thắng (nhân với combinationCount)
    const potentialPrize =
      stationInfo.count * totalPermutations * betAmount * payoutRate;

    return {
      potentialPrize,
      valid: true,
      stationCount: stationInfo.count,
      permutationCount: totalPermutations,
      numberCount: numbers.length,
      betAmount,
      payoutRate,
      formula: `${stationInfo.count} × ${totalPermutations} × ${betAmount} × ${payoutRate}`,
    };
  } else {
    // Tính tiềm năng thắng
    const potentialPrize =
      stationInfo.count * numberInfo.count * betAmount * payoutRate;

    return {
      potentialPrize,
      valid: true,
      stationCount: stationInfo.count,
      numberCount: numberInfo.count,
      betAmount,
      payoutRate,
      formula: `${stationInfo.count} × ${numberInfo.count} × ${betAmount} × ${payoutRate}`,
    };
  }
}

/**
 * Tính toán tiềm năng thắng cược dựa trên mã cược đã phân tích
 * @param {object} parsedResult - Kết quả phân tích mã cược
 * @returns {object} Kết quả tính toán tiềm năng thắng cược
 */
export function calculatePotentialPrize(parsedResult) {
  if (!parsedResult || !parsedResult.success || !parsedResult.lines) {
    return {
      success: false,
      totalPotential: 0,
      details: [],
      error: 'Dữ liệu mã cược không hợp lệ',
    };
  }

  try {
    const lines = parsedResult.lines;
    const station = parsedResult.station;
    let totalPotential = 0;
    const details = [];
    let hasValidLine = false;

    // Process each line in the bet code
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!line.valid || !line.amount || line.amount <= 0) {
        details.push({
          lineIndex: i,
          originalLine: line.originalLine,
          potentialPrize: 0,
          valid: false,
          error: 'Dòng không hợp lệ hoặc không có số tiền',
        });
        continue;
      }

      // Get station info, bet type info, and number info
      const stationInfo = getStationInfo(station);
      const betTypeInfo = getBetTypeInfo(line, stationInfo);
      const numberInfo = getNumberInfo(line, betTypeInfo, station);

      // Calculate potential prize for this line
      const linePotential = calculateLinePotential(
        line,
        stationInfo,
        betTypeInfo,
        numberInfo
      );

      if (!linePotential.valid && linePotential.error) {
        details.push({
          lineIndex: i,
          originalLine: line.originalLine,
          potentialPrize: 0,
          valid: false,
          error: linePotential.error,
        });
        continue;
      }

      hasValidLine = true;
      totalPotential += linePotential.potentialPrize;
      details.push({
        lineIndex: i,
        originalLine: line.originalLine,
        ...linePotential,
        betTypeAlias: betTypeInfo.alias,
      });
    }

    return {
      success: hasValidLine,
      totalPotential,
      details,
      error: hasValidLine
        ? null
        : 'Có lỗi trong quá trình tính tiền thắng dự kiến',
      hasErrors: details.some((d) => !d.valid),
    };
  } catch (error) {
    console.error('Lỗi khi tính tiềm năng thắng cược:', error);
    return {
      success: false,
      totalPotential: 0,
      details: [],
      error:
        error.message || 'Lỗi không xác định khi tính tiềm năng thắng cược',
    };
  }
}

export default {
  calculatePotentialPrize,
};
