/* eslint-disable no-useless-escape */
/**
 * Utility functions for parsing and validating bet codes on the client side
 */

// Parse and validate bet code
export function parseBetCode(
  betCodeText,
  allStations,
  accessibleStations,
  betTypes,
  priceRate,
  numberCombinations = []
) {
  try {
    // Split the bet code into lines
    const lines = betCodeText.trim().split('\n');

    if (lines.length === 0) {
      return { data: null, error: 'Mã cược không được để trống' };
    }

    // First line should be the station code
    let stationInfo = lines[0].trim();
    let betLines = lines.slice(1);

    // If only one line, try to extract station code from the beginning
    if (betLines.length === 0) {
      const spaceIndex = stationInfo.indexOf(' ');
      if (spaceIndex > 0) {
        betLines = [stationInfo.substring(spaceIndex + 1)];
        stationInfo = stationInfo.substring(0, spaceIndex);
      } else {
        return {
          data: null,
          error: 'Mã cược không hợp lệ. Vui lòng nhập đài và số cược',
        };
      }
    }

    // Validate station information
    const stationData = parseStationInfo(
      stationInfo,
      allStations,
      accessibleStations
    );
    if (stationData.error) {
      return { data: null, error: stationData.error };
    }

    // Parse each bet line
    const parsedLines = [];
    let totalStake = 0;
    let totalPotentialWinning = 0;

    for (const line of betLines) {
      if (!line.trim()) continue;

      const parsedLine = parseBetLine(
        line,
        betTypes,
        stationData.data.count,
        priceRate,
        numberCombinations
      );
      if (parsedLine.error) {
        parsedLines.push({
          originalLine: line,
          error: parsedLine.error,
          numbers: [],
          betTypeAlias: 'unknown',
          amount: 0,
          stake: 0,
          potentialPrize: 0,
        });
        continue;
      }

      parsedLines.push(parsedLine.data);
      totalStake += parsedLine.data.stake;
      totalPotentialWinning += parsedLine.data.potentialPrize;
    }

    // Format the bet code for display
    const formattedText = formatBetCode(stationData.data, parsedLines);

    return {
      data: {
        originalText: betCodeText,
        formattedText,
        stationData: stationData.data,
        betData: {
          lines: parsedLines,
        },
        stakeAmount: totalStake,
        potentialWinning: totalPotentialWinning,
        status: 'confirmed',
      },
      error: null,
    };
  } catch (error) {
    console.error('Error parsing bet code:', error);
    return { data: null, error: 'Lỗi phân tích mã cược: ' + error.message };
  }
}

// Parse station information
export function parseStationInfo(stationInfo, allStations, accessibleStations) {
  try {
    stationInfo = stationInfo.toLowerCase().trim();

    // Handle region-based betting (e.g., 2dmn = 2 stations in South region)
    const regionMatch = stationInfo.match(/^(\d+)(d)(mn|mt|mb|n|t|b)$/);
    if (regionMatch) {
      const count = parseInt(regionMatch[1]);
      const regionCodeShort = regionMatch[3];

      // Map short region code to full code
      const regionCodeMap = {
        mn: 'south',
        mt: 'central',
        mb: 'north',
        n: 'south',
        t: 'central',
        b: 'north',
      };

      const regionCode = regionCodeMap[regionCodeShort];
      if (!regionCode) {
        return {
          data: null,
          error: `Không nhận diện được miền: ${regionCodeShort}`,
        };
      }

      // Find the region
      const region = allStations.find(
        (s) => s.region?.code === regionCode
      )?.region;
      if (!region) {
        return { data: null, error: 'Không thể xác định thông tin miền' };
      }

      // Count available stations in this region
      const availableStations = accessibleStations.filter(
        (station) => station.region?.code === regionCode
      );

      if (availableStations.length < count) {
        return {
          data: null,
          error: `Bạn chỉ có quyền truy cập ${availableStations.length} đài ở miền ${region.name}, không thể đặt cược ${count} đài`,
        };
      }

      // Get the region name
      const regionName = region.name || 'Không xác định';

      return {
        data: {
          type: 'region',
          regionCode,
          regionName,
          count,
          specificStations: null,
        },
        error: null,
      };
    }

    // Handle specific stations (e.g., tp.vl = TP.HCM and Vinh Long)
    const stationCodes = stationInfo.split('.');
    const specificStations = [];

    for (const code of stationCodes) {
      // Find station by code or alias
      const station = findStationByCodeOrAlias(code, allStations);

      if (!station) {
        return { data: null, error: `Không tìm thấy đài với mã: ${code}` };
      }

      // Check if user has access to this station
      const hasAccess = accessibleStations.some((s) => s.id === station.id);
      if (!hasAccess) {
        return {
          data: null,
          error: `Bạn không có quyền truy cập đài: ${station.name}`,
        };
      }

      specificStations.push(station);
    }

    return {
      data: {
        type: 'specific',
        specificStations,
        count: specificStations.length,
        regionCode: null,
        regionName: null,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error parsing station info:', error);
    return {
      data: null,
      error: 'Lỗi khi phân tích thông tin đài: ' + error.message,
    };
  }
}

// Find a station by code or alias
export function findStationByCodeOrAlias(code, allStations) {
  code = code.toLowerCase().trim();

  // First try exact match on name or code
  let station = allStations.find(
    (s) =>
      s.name.toLowerCase() === code ||
      (s.aliases && s.aliases.some((alias) => alias.toLowerCase() === code))
  );

  // If not found, try partial match
  if (!station) {
    station = allStations.find(
      (s) =>
        s.name.toLowerCase().includes(code) ||
        (s.aliases &&
          s.aliases.some((alias) => alias.toLowerCase().includes(code)))
    );
  }

  return station;
}

// Parse a bet line
export function parseBetLine(
  line,
  betTypes,
  stationCount,
  priceRate,
  numberCombinations = []
) {
  try {
    line = line.trim();
    if (!line) {
      return { data: null, error: 'Dòng cược không được để trống' };
    }

    // Basic structure: numbers + bet type + amount
    // Example: 23.45.67dd10

    // Try to find the bet type in the line
    let betTypeMatch = null;
    let betType = null;

    for (const type of betTypes) {
      // Look for the bet type aliases in the line
      if (!type.aliases) continue;

      for (const alias of type.aliases) {
        const regex = new RegExp(`${alias}(\\d+(\\.\\d+)?)`, 'i');
        const match = line.match(regex);

        if (match) {
          betTypeMatch = match;
          betType = type;
          break;
        }
      }

      if (betTypeMatch) break;
    }

    if (!betTypeMatch || !betType) {
      return {
        data: null,
        error: 'Không tìm thấy loại cược hợp lệ trong dòng',
      };
    }

    // Extract numbers part (before bet type)
    const betTypeIndex = line.indexOf(betTypeMatch[0]);
    const numbersPart = line.substring(0, betTypeIndex);

    // Check for special number combinations
    let numbers = [];
    const combinationResult = parseNumberCombinations(
      numbersPart,
      numberCombinations
    );

    if (combinationResult.numbers.length > 0) {
      // Use special combination numbers
      numbers = combinationResult.numbers;
    } else {
      // Parse standard numbers (can be separated by dots, commas, or spaces)
      numbers = numbersPart
        .split(/[.,\s\-]+/)
        .map((n) => n.trim())
        .filter((n) => n);

      // Parse "kéo" (sequence) pattern: start/stepkéoend
      const keoPattern = /(\d+)\/(\d+)keo(\d+)/i;
      const keoMatch = numbersPart.match(keoPattern);

      if (keoMatch) {
        const start = parseInt(keoMatch[1]);
        const next = parseInt(keoMatch[2]);
        const end = parseInt(keoMatch[3]);
        const step = next - start;

        if (!isNaN(start) && !isNaN(next) && !isNaN(end) && step > 0) {
          numbers = [];
          for (let i = start; i <= end; i += step) {
            numbers.push(i.toString().padStart(keoMatch[1].length, '0'));
          }
        }
      }
    }

    if (numbers.length === 0) {
      return { data: null, error: 'Không tìm thấy số cược hợp lệ' };
    }

    // Extract amount
    const amount = parseFloat(betTypeMatch[1].replace(',', '.')) * 1000;

    // Calculate stake based on the bet type, numbers, and station count
    const betTypeAlias = betTypeMatch[0].replace(betTypeMatch[1], '');
    const stake = calculateStake(
      amount,
      numbers.length,
      stationCount,
      priceRate
    );

    // Calculate potential winning based on the bet type and numbers
    let payoutRate = 70; // Default

    if (betType.custom_payout_rate) {
      payoutRate = betType.custom_payout_rate;
    } else if (betType.payout_rate) {
      // Check if payout_rate is a JSON string, object, or number
      if (typeof betType.payout_rate === 'string') {
        try {
          const jsonRate = JSON.parse(betType.payout_rate);
          payoutRate =
            typeof jsonRate === 'object'
              ? jsonRate.south || jsonRate.central || jsonRate.north || 70
              : jsonRate;
        } catch {
          payoutRate = parseFloat(betType.payout_rate) || 70;
        }
      } else if (typeof betType.payout_rate === 'object') {
        payoutRate =
          betType.payout_rate.south ||
          betType.payout_rate.central ||
          betType.payout_rate.north ||
          70;
      } else {
        payoutRate = betType.payout_rate;
      }
    }

    const potentialPrize = calculatePotentialPrize(
      amount,
      numbers.length,
      payoutRate
    );

    return {
      data: {
        originalLine: line,
        parsedData: {
          betTypeId: betType.id,
          betTypeAlias,
          numbers,
          amount,
          payoutRate,
        },
        numbers,
        betTypeId: betType.id,
        betTypeAlias,
        amount,
        stake,
        potentialPrize,
        isPermutation: betType.is_permutation || false,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error parsing bet line:', error);
    return {
      data: null,
      error: 'Lỗi khi phân tích dòng cược: ' + error.message,
    };
  }
}

// Parse special number combinations (tài, xỉu, chẵn, lẻ, etc.)
export function parseNumberCombinations(numbersPart, numberCombinations) {
  const result = {
    numbers: [],
    combinationUsed: false,
  };

  if (!numberCombinations || numberCombinations.length === 0) {
    return result;
  }

  // Clean the numbers part
  const cleanedPart = numbersPart.toLowerCase().trim();

  // Check for special combinations
  for (const combo of numberCombinations) {
    // Check if the combo name or any alias is in the numbers part
    const nameMatches = cleanedPart === combo.name.toLowerCase();
    const aliasMatches =
      combo.aliases &&
      combo.aliases.some((alias) => cleanedPart === alias.toLowerCase());

    if (nameMatches || aliasMatches) {
      // Generate numbers based on the combination definition
      result.numbers = generateNumbersFromCombination(combo);
      result.combinationUsed = true;
      return result;
    }
  }

  // Check for kéo (sequence) pattern
  const keoPattern = /(\d+)\/(\d+)keo(\d+)/i;
  const keoMatch = cleanedPart.match(keoPattern);

  if (keoMatch) {
    const start = parseInt(keoMatch[1]);
    const next = parseInt(keoMatch[2]);
    const end = parseInt(keoMatch[3]);
    const step = next - start;

    if (!isNaN(start) && !isNaN(next) && !isNaN(end) && step > 0) {
      const digits = keoMatch[1].length;

      for (let i = start; i <= end; i += step) {
        result.numbers.push(i.toString().padStart(digits, '0'));
      }

      result.combinationUsed = true;
    }
  }

  return result;
}

// Generate numbers from a combination definition
export function generateNumbersFromCombination(combo) {
  const numbers = [];

  switch (combo.name.toLowerCase()) {
    case 'tài':
      // 50 numbers from 50-99
      for (let i = 50; i <= 99; i++) {
        numbers.push(i.toString().padStart(2, '0'));
      }
      break;

    case 'xỉu':
      // 50 numbers from 00-49
      for (let i = 0; i <= 49; i++) {
        numbers.push(i.toString().padStart(2, '0'));
      }
      break;

    case 'chẵn':
      // 50 even numbers from 00-98
      for (let i = 0; i <= 98; i += 2) {
        numbers.push(i.toString().padStart(2, '0'));
      }
      break;

    case 'lẻ':
      // 50 odd numbers from 01-99
      for (let i = 1; i <= 99; i += 2) {
        numbers.push(i.toString().padStart(2, '0'));
      }
      break;

    case 'chẵn chẵn':
      // 25 numbers where both digits are even
      for (let i = 0; i <= 8; i += 2) {
        for (let j = 0; j <= 8; j += 2) {
          numbers.push(`${i}${j}`);
        }
      }
      break;

    case 'lẻ lẻ':
      // 25 numbers where both digits are odd
      for (let i = 1; i <= 9; i += 2) {
        for (let j = 1; j <= 9; j += 2) {
          numbers.push(`${i}${j}`);
        }
      }
      break;

    case 'chẵn lẻ':
      // 25 numbers where first digit is even, second is odd
      for (let i = 0; i <= 8; i += 2) {
        for (let j = 1; j <= 9; j += 2) {
          numbers.push(`${i}${j}`);
        }
      }
      break;

    case 'lẻ chẵn':
      // 25 numbers where first digit is odd, second is even
      for (let i = 1; i <= 9; i += 2) {
        for (let j = 0; j <= 8; j += 2) {
          numbers.push(`${i}${j}`);
        }
      }
      break;

    default:
      // For other combinations, try to use the calculation method
      if (combo.calculation_method) {
        try {
          // This is a basic implementation - in a real system,
          // you might need to interpret the calculation method string
          // and execute it safely
          // For now, we'll just return an empty array for custom methods
          console.log(
            `Custom calculation method for ${combo.name} not implemented`
          );
        } catch (error) {
          console.error('Error calculating numbers from combination:', error);
        }
      }
  }

  return numbers;
}

// Calculate stake
export function calculateStake(amount, numberCount, stationCount, priceRate) {
  return amount * numberCount * stationCount * priceRate;
}

// Calculate potential prize
export function calculatePotentialPrize(amount, numberCount, payoutRate) {
  return amount * numberCount * payoutRate;
}

// Format bet code for display
export function formatBetCode(stationData, parsedLines) {
  let stationDisplay = '';

  if (stationData.type === 'specific') {
    stationDisplay = stationData.specificStations.map((s) => s.name).join(', ');
  } else {
    stationDisplay = `${stationData.count} đài ${stationData.regionName}`;
  }

  let linesDisplay = parsedLines
    .map((line) => {
      if (line.error) {
        return `${line.originalLine} - Lỗi: ${line.error}`;
      }

      const numbersDisplay =
        line.numbers.join('.') + line.betTypeAlias + line.amount / 1000;
      return numbersDisplay;
    })
    .join('\n');

  return `${stationDisplay}\n${linesDisplay}`;
}
