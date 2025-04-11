/* eslint-disable no-useless-escape */
// src/services/bet/parser.js
import { BET_CONFIG } from '@/config/data';

/**
 * Phân tích mã cược đầu vào
 * @param {string} betCode - Mã cược đầu vào
 * @returns {object} Kết quả phân tích
 */
export function parseBetCode(betCode) {
  try {
    if (!betCode || typeof betCode !== 'string') {
      return { success: false, errors: [{ message: 'Mã cược không hợp lệ' }] };
    }

    // First, let's check for special cases with kéo pattern directly
    const initialLines = betCode
      .trim()
      .split(/\r?\n/)
      .filter((line) => line.trim() !== '');
    if (initialLines.length >= 2) {
      const stationLine = initialLines[0];

      // Direct check for kéo pattern in any subsequent line
      for (let i = 1; i < initialLines.length; i++) {
        const currentLine = initialLines[i];
        // Precise regex to match kéo pattern including bet type and amount
        const keoMatch = currentLine.match(
          /(\d+)\/(\d+)(?:keo|k)(\d+)([a-z]+)(\d+(?:[,.]\d+)?)/i
        );

        if (keoMatch) {
          // We found a kéo pattern, process it specially
          const [fullMatch, start, next, end, betTypeText, amountText] =
            keoMatch;

          // Parse the station
          const stationInfo = parseStation(stationLine);
          if (!stationInfo.success) {
            return {
              success: false,
              errors: [
                { message: `Cannot determine station: ${stationInfo.error}` },
              ],
            };
          }

          // Generate sequence
          const startNum = parseInt(start, 10);
          const nextNum = parseInt(next, 10);
          const endNum = parseInt(end, 10);
          const step = nextNum - startNum;

          if (step <= 0) {
            // Invalid step, continue with regular parsing
            continue;
          }

          // Generate sequence
          const sequence = [];
          const padLength = Math.max(start.length, end.length);
          for (let i = startNum; i <= endNum; i += step) {
            sequence.push(i.toString().padStart(padLength, '0'));
          }

          // Identify bet type from BET_CONFIG
          const betType = BET_CONFIG.betTypes.find((bt) =>
            bt.aliases.some(
              (a) => a.toLowerCase() === betTypeText.toLowerCase()
            )
          );

          if (!betType) {
            // Invalid bet type, continue with regular parsing
            continue;
          }

          // Parse amount
          const amount = parseAmount(amountText);

          // We have a valid kéo pattern, generate a special result
          const betLine = {
            valid: true,
            numbers: sequence,
            betType: {
              id: betType.name,
              name: betType.name,
              alias: betTypeText.toLowerCase(),
            },
            amount: amount,
            originalLine: currentLine,
          };

          return {
            success: true,
            station: stationInfo.data,
            lines: [betLine],
            wasReformatted: true,
            specialHandling: 'keo_pattern',
          };
        }
      }
    }

    // Trước khi bất kỳ xử lý nào, kiểm tra xem đây có phải chỉ là tên đài không
    // Nếu là chỉ mỗi tên đài (như "hn"), xử lý đặc biệt
    if (!betCode.includes('\n') && !betCode.includes(' ')) {
      const potentialStation = betCode.trim().toLowerCase();

      // Kiểm tra xem có phải là tên đài hợp lệ không
      let isValidStation = false;
      let stationData = null;

      // Kiểm tra trong tất cả các đài và aliases từ BET_CONFIG
      for (const station of BET_CONFIG.accessibleStations) {
        if (
          station.name.toLowerCase() === potentialStation ||
          (station.aliases &&
            station.aliases.some(
              (alias) => alias.toLowerCase() === potentialStation
            ))
        ) {
          isValidStation = true;
          stationData = {
            name: station.name,
            region: station.region.code,
            multiStation: false,
          };
          if (station.region.code === 'north' && station.name === 'Miền Bắc') {
            stationData.multiStation = true;
          }
          break;
        }
      }

      // Nếu là tên đài hợp lệ, trả về kết quả phù hợp
      if (isValidStation && stationData) {
        return {
          success: false, // Không thành công vì không có mã cược
          station: stationData,
          lines: [],
          message: 'Đã xác định đài, nhưng chưa có mã cược',
          errors: [
            {
              message: 'Vui lòng thêm mã cược sau tên đài',
              type: 'MISSING_BET_INFO',
            },
          ],
        };
      }
    }

    // Chuẩn hóa dấu xuống dòng và khoảng trắng
    betCode = betCode.trim();

    // Tiền xử lý: Tự động định dạng khi người dùng nhập đài và mã cược trên cùng một dòng
    if (!betCode.includes('\n')) {
      // Sử dụng split với regex mạnh hơn để xử lý tất cả loại khoảng trắng
      const parts = betCode.split(/\s+/);

      if (parts.length >= 2) {
        const potentialStation = parts[0].toLowerCase();

        // Xây dựng phần còn lại bằng cách loại bỏ phần đầu và khoảng trắng
        // Đảm bảo lấy chính xác phần còn lại, không phụ thuộc vào split
        const restOfText = betCode.substring(potentialStation.length).trim();

        // Kiểm tra xem phần đầu có phải là tên đài không
        let isValidStation = false;

        // Kiểm tra trong tất cả các đài và aliases từ BET_CONFIG
        for (const station of BET_CONFIG.accessibleStations) {
          if (
            station.name.toLowerCase() === potentialStation ||
            (station.aliases &&
              station.aliases.some(
                (alias) => alias.toLowerCase() === potentialStation
              ))
          ) {
            isValidStation = true;
            break;
          }
        }

        // Kiểm tra mẫu đài nhiều miền (như 2dmn, 3dmt) từ region aliases
        const multiRegionPattern = /^\d+d(mn|mt|n|t)/i;
        if (multiRegionPattern.test(potentialStation)) {
          isValidStation = true;
        }

        // Nếu là đài hợp lệ và còn phần còn lại
        if (isValidStation && restOfText.length > 0) {
          // Kiểm tra nếu phần còn lại có số và kiểu cược
          const hasNumbers = /\d/.test(restOfText);

          // Danh sách kiểu cược phổ biến để kiểm tra
          const betTypeAliases = BET_CONFIG.betTypes.flatMap(
            (bt) => bt.aliases
          );

          let hasBetType = false;
          for (const alias of betTypeAliases) {
            const pattern = new RegExp(`${alias}\\d*`, 'i');
            if (pattern.test(restOfText)) {
              hasBetType = true;
              break;
            }
          }

          if (hasNumbers || hasBetType) {
            // Tự động thêm xuống dòng giữa đài và mã cược
            betCode = `${potentialStation}\n${restOfText}`;
          }
        }
      }
    }

    // QUAN TRỌNG: Xử lý nhiều đài trong một đoạn mã cược
    const multipleStations = detectMultipleStations(betCode);

    if (multipleStations && multipleStations.length > 0) {
      return parseMultipleStationBetCode(multipleStations);
    }

    // Tiếp tục xử lý như bình thường
    const normalizedBetCode = betCode.trim().toLowerCase();

    // Phân tách các dòng
    const lines = normalizedBetCode
      .split(/\r?\n/)
      .filter((line) => line.trim() !== '');
    if (lines.length === 0) {
      return { success: false, errors: [{ message: 'Mã cược trống' }] };
    }

    const station = parseStation(lines[0]);
    if (!station.success) {
      return {
        success: false,
        errors: [{ message: `Không thể xác định đài: ${station.error}` }],
      };
    }

    // Phân tích từng dòng còn lại
    const parsedLines = [];
    let hasValidLine = false;

    // Kiểm tra xem dòng đầu tiên có chứa cả đài và số cược không
    const stationPart = extractStationPart(lines[0]);
    const hasBetInfo =
      stationPart.length < lines[0].length && !isStationOnly(lines[0]);

    // Xử lý phần số cược từ dòng đầu nếu có
    if (hasBetInfo) {
      const betPart = lines[0].substring(stationPart.length).trim();
      if (betPart) {
        const parsedLine = parseBetLine(betPart, station.data);
        parsedLine.originalLine = lines[0];
        parsedLine.lineIndex = 0;

        parsedLines.push(parsedLine);
        if (parsedLine.valid) {
          hasValidLine = true;
        }
      }
    }

    // Xử lý các dòng còn lại (bắt đầu từ dòng 1)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '') continue;

      // Bỏ qua các dòng chỉ chứa tên đài
      if (isStationLine(line)) {
        continue;
      }

      // Phân tích dòng
      const parsedLine = parseBetLine(line, station.data);
      parsedLine.originalLine = line;
      parsedLine.lineIndex = i;

      parsedLines.push(parsedLine);
      if (parsedLine.valid) {
        hasValidLine = true;
      }
    }

    // Nếu chỉ có 1 dòng và không có số cược, có thể người dùng chỉ đang thử chọn đài
    if (lines.length === 1 && parsedLines.length === 0) {
      return {
        success: false,
        station: station.data,
        lines: [],
        message: 'Đã xác định đài, chưa có số cược',
        errors: [{ message: 'Vui lòng thêm thông tin cược sau tên đài' }],
      };
    }

    if (parsedLines.length === 0) {
      return {
        success: false,
        errors: [{ message: 'Không tìm thấy số cược' }],
      };
    }

    return {
      success: hasValidLine,
      station: station.data,
      lines: parsedLines,
      hasValidLine,
      wasReformatted: betCode !== normalizedBetCode,
    };
  } catch (error) {
    console.error('Lỗi khi phân tích mã cược:', error);
    return {
      success: false,
      errors: [{ message: `Lỗi phân tích mã cược: ${error.message}` }],
    };
  }
}

/**
 * Phát hiện nhiều đài trong mã cược
 * @param {string} betCode - Mã cược đầu vào
 * @returns {Array|null} Danh sách các cặp đài-dòng cược
 */
function detectMultipleStations(betCode) {
  const lines = betCode
    .trim()
    .split('\n')
    .filter((line) => line.trim() !== '');
  if (lines.length < 2) return null;

  // Kiểm tra xem có ít nhất 2 dòng đài
  const stationLines = lines.filter((line) => isStationLine(line));
  if (stationLines.length < 2) return null;

  const result = [];
  let currentStation = null;
  let currentBetLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (isStationLine(line)) {
      // Nếu đã có station và betLines, lưu lại vào result
      if (currentStation && currentBetLines.length > 0) {
        result.push({
          station: currentStation,
          betLines: [...currentBetLines],
        });
      }

      // Bắt đầu station mới
      currentStation = line;
      currentBetLines = [];
    } else {
      // Thêm dòng cược vào station hiện tại
      if (currentStation) {
        currentBetLines.push(line);
      }
    }
  }

  // Thêm cặp cuối cùng nếu có
  if (currentStation && currentBetLines.length > 0) {
    result.push({
      station: currentStation,
      betLines: [...currentBetLines],
    });
  }

  return result.length > 0 ? result : null;
}

/**
 * Phân tích mã cược có nhiều đài
 * @param {Array} multipleStations - Danh sách các cặp đài-dòng cược
 * @returns {object} Kết quả phân tích
 */
function parseMultipleStationBetCode(multipleStations) {
  // Để dễ hiểu, chỉ xử lý station đầu tiên
  // Thông tin về nhiều station sẽ được xử lý ở lớp cao hơn (ChatContext)

  if (!multipleStations || multipleStations.length === 0) {
    return {
      success: false,
      errors: [{ message: 'Không có dữ liệu đài hợp lệ' }],
    };
  }

  // Phân tích station đầu tiên
  const firstStation = multipleStations[0];
  if (
    !firstStation.station ||
    !firstStation.betLines ||
    firstStation.betLines.length === 0
  ) {
    return {
      success: false,
      errors: [{ message: 'Dữ liệu đài không hợp lệ' }],
    };
  }

  // Tạo mã cược cho station đầu tiên để phân tích
  const singleStationBetCode = `${
    firstStation.station
  }\n${firstStation.betLines.join('\n')}`;
  const result = parseBetCode(singleStationBetCode);

  if (result.success) {
    // Đánh dấu là có nhiều đài
    result.hasMultipleStations = true;
    result.stationCount = multipleStations.length;
  }

  return result;
}

/**
 * Kiểm tra xem dòng có phải là dòng chỉ chứa tên đài không
 */
function isStationLine(line) {
  // Cải tiến: Kiểm tra kỹ lưỡng hơn để xác định dòng đài

  // 1. Loại bỏ dấu chấm cuối
  const cleanLine = line.replace(/\.+$/, '').trim().toLowerCase();

  // 2. Kiểm tra các mẫu đài nhiều miền từ region aliases
  for (const region of BET_CONFIG.regions) {
    const regionPattern = new RegExp(
      `^\\d+d(${region.code}|${region.aliases.join('|')})$`,
      'i'
    );
    if (regionPattern.test(cleanLine)) {
      return true;
    }
  }

  // Fallback cho các mẫu 2dmn, 3dmt
  if (/^\d+d(mn|mt|n|t|nam|trung)$/i.test(cleanLine)) {
    return true;
  }

  // 3. Kiểm tra tên đài đơn lẻ từ BET_CONFIG
  for (const station of BET_CONFIG.accessibleStations) {
    if (
      station.name.toLowerCase() === cleanLine ||
      station.aliases.some((alias) => alias === cleanLine)
    ) {
      return true;
    }
  }

  // 4. Kiểm tra mẫu region aliases từ BET_CONFIG
  for (const region of BET_CONFIG.regions) {
    if (region.aliases.includes(cleanLine)) {
      return true;
    }
  }

  // 5. Kiểm tra nếu là tổ hợp các đài (vd: vl.ct, dn.hue)
  if (cleanLine.includes('.')) {
    const parts = cleanLine.split('.');
    return parts.every((part) =>
      BET_CONFIG.accessibleStations.some(
        (station) =>
          station.name.toLowerCase() === part ||
          station.aliases.some((alias) => alias === part)
      )
    );
  }

  return false;
}

/**
 * Kiểm tra xem dòng có phải chỉ chứa thông tin đài không (không có thông tin cược)
 */
function isStationOnly(line) {
  // Kiểm tra các mẫu đài miền nhiều đài từ region aliases
  for (const region of BET_CONFIG.regions) {
    const regionPattern = new RegExp(
      `^\\d+d(${region.code}|${region.aliases.join('|')})$`,
      'i'
    );
    if (regionPattern.test(line)) {
      return true;
    }
  }

  // Fallback cho các mẫu 2dmn, 3mt
  if (/^\d+d(mn|mt|n|t|nam|trung)$/i.test(line)) {
    return true;
  }

  // Kiểm tra tên đài đơn lẻ từ BET_CONFIG
  if (isStationLine(line)) {
    return true;
  }

  // Kiểm tra region aliases từ BET_CONFIG
  for (const region of BET_CONFIG.regions) {
    if (region.aliases.includes(line.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Kiểm tra xem một alias có phải là một phần của tên đài
 */
function isPartOfStationName(alias, line) {
  // Kiểm tra nếu line chính là một tên đài/alias của đài
  const isLineExactlyStation = BET_CONFIG.accessibleStations.some(
    (station) =>
      station.name.toLowerCase() === line.trim().toLowerCase() ||
      station.aliases.some((a) => a === line.trim().toLowerCase())
  );

  // Nếu line chính xác là tên đài, trả về true cho bất kỳ alias nào
  if (isLineExactlyStation) {
    return true;
  }

  // Ngược lại kiểm tra nếu alias là một phần của tên đài
  for (const station of BET_CONFIG.accessibleStations) {
    if (
      station.aliases.some(
        (stationAlias) =>
          stationAlias.includes(alias) && line.includes(stationAlias)
      )
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Kiểm tra xem một chuỗi có phải là từ khóa đặc biệt không
 * @param {string} str - Chuỗi cần kiểm tra
 * @returns {boolean} Kết quả kiểm tra
 */
function isSpecialKeyword(str) {
  if (!str) return false;

  // Lấy aliases từ numberCombinations trong BET_CONFIG
  const specialKeywords = BET_CONFIG.numberCombinations.flatMap(
    (nc) => nc.aliases
  );
  return specialKeywords.includes(str.toLowerCase());
}

/**
 * Kiểm tra xem ký tự tiếp theo có phải là một phần của từ khóa đặc biệt không
 * @param {string} currentStr - Chuỗi hiện tại
 * @param {string} nextChar - Ký tự tiếp theo
 * @returns {boolean} Kết quả kiểm tra
 */
function isPartOfSpecialKeyword(currentStr, nextChar) {
  // Lấy aliases từ numberCombinations trong BET_CONFIG
  const specialKeywords = BET_CONFIG.numberCombinations.flatMap(
    (nc) => nc.aliases
  );
  // Thêm "keo" cho pattern kéo
  if (!specialKeywords.includes('keo')) {
    specialKeywords.push('keo');
  }

  const testStr = (currentStr + nextChar).toLowerCase();

  // Check for "keo" pattern specifically
  if (currentStr.includes('/')) {
    // If currentStr already contains a "/", check if nextChar could be part of "keo"
    const lastPart = currentStr.split('/').pop().toLowerCase();
    if (lastPart === 'k' && nextChar.toLowerCase() === 'e') return true;
    if (lastPart === 'ke' && nextChar.toLowerCase() === 'o') return true;
    if (nextChar.toLowerCase() === 'k') return true;
  }

  // Kiểm tra nếu chuỗi kết hợp khớp với bất kỳ từ khóa đặc biệt nào
  for (const keyword of specialKeywords) {
    if (keyword.startsWith(testStr)) {
      return true;
    }
  }

  return false;
}

/**
 * Trích xuất phần đài từ một dòng
 */
function extractStationPart(line) {
  // Tìm vị trí của số đầu tiên hoặc kiểu cược
  let index = line.length;

  // Xử lý đặc biệt cho trường hợp như "2dmn"
  for (const region of BET_CONFIG.regions) {
    const regionPattern = new RegExp(
      `^(\\d+)(d(${region.code}|${region.aliases.join('|')}))`,
      'i'
    );
    const match = line.match(regionPattern);
    if (match) {
      return line;
    }
  }

  // Fallback cho các mẫu 2dmn
  const multiStationMatch = line.match(
    /^(\d+)(dmn|dmt|dn|dt|dnam|dtrung|mn|mt|mnam|mtrung)/i
  );
  if (multiStationMatch) {
    return line;
  }

  // Tìm vị trí số đầu tiên
  const numberMatch = line.match(/(?<!\d[a-z])\d/);
  if (numberMatch) {
    index = Math.min(index, numberMatch.index);
  }

  // Tìm vị trí kiểu cược đầu tiên
  const betTypeAliases = BET_CONFIG.betTypes.flatMap((bt) => bt.aliases);
  for (const alias of betTypeAliases) {
    const aliasPos = line.indexOf(alias);
    if (aliasPos !== -1 && !isPartOfStationName(alias, line)) {
      index = Math.min(index, aliasPos);
    }
  }

  return line.substring(0, index).trim();
}

/**
 * Phân tích thông tin đài từ chuỗi
 * @param {string} stationString - Chuỗi chứa thông tin đài
 * @returns {object} Kết quả phân tích đài
 */
function parseStation(stationString) {
  // Loại bỏ dấu chấm cuối cùng nếu có
  const stationText = stationString.trim().toLowerCase().replace(/\.+$/, '');

  // Kiểm tra tên đài chính xác từ BET_CONFIG
  for (const station of BET_CONFIG.accessibleStations) {
    if (station.name.toLowerCase() === stationText) {
      return {
        success: true,
        data: {
          name: station.name,
          region: station.region.code,
          multiStation: false,
        },
      };
    }

    // Kiểm tra alias chính xác
    if (station.aliases.some((alias) => alias.toLowerCase() === stationText)) {
      return {
        success: true,
        data: {
          name: station.name,
          region: station.region.code,
          multiStation: false,
        },
      };
    }
  }

  // Kiểm tra đài miền Bắc từ region aliases
  const northRegion = BET_CONFIG.regions.find(
    (region) => region.code === 'north'
  );
  if (northRegion && northRegion.aliases.includes(stationText)) {
    const northStation = BET_CONFIG.accessibleStations.find(
      (station) => station.name === 'Miền Bắc'
    );

    if (northStation) {
      return {
        success: true,
        data: {
          name: northStation.name,
          region: northStation.region.code,
          multiStation: false,
        },
      };
    }
  }

  // Kiểm tra đài miền Nam/Trung nhiều đài từ region patterns
  for (const region of BET_CONFIG.regions) {
    const regionPattern = new RegExp(
      `^(\\d+)d(${region.code}|${region.aliases.join('|')})$`,
      'i'
    );
    const match = stationText.match(regionPattern);

    if (match) {
      const count = parseInt(match[1], 10);
      return {
        success: true,
        data: {
          name: region.name,
          region: region.code,
          count,
          multiStation: true,
        },
      };
    }
  }

  // Fallback cho các mẫu 2dmn, 3dmt
  const multipleStationMatch = stationText.match(
    /^(\d+)(dmn|dmt|dn|dt|dnam|dtrung|mn|mt|mnam|mtrung)/i
  );

  if (multipleStationMatch) {
    const count = parseInt(multipleStationMatch[1], 10);
    // Xác định miền dựa trên chuỗi phù hợp
    const regionPart = multipleStationMatch[2].toLowerCase();
    const isSouthern =
      regionPart === 'dmn' ||
      regionPart === 'dn' ||
      regionPart === 'dnam' ||
      regionPart === 'mn' ||
      regionPart === 'mnam';

    const region = isSouthern ? 'south' : 'central';
    const regionName = isSouthern ? 'Miền Nam' : 'Miền Trung';

    return {
      success: true,
      data: {
        name: regionName,
        region,
        count,
        multiStation: true,
      },
    };
  }

  // Kiểm tra nhiều đài cụ thể (vl.ct, etc.)
  if (stationText.includes('.')) {
    const stationParts = stationText.split('.');
    const validStations = [];

    for (const part of stationParts) {
      for (const station of BET_CONFIG.accessibleStations) {
        if (
          station.name.toLowerCase() === part ||
          station.aliases.some((alias) => alias.toLowerCase() === part)
        ) {
          validStations.push({
            name: station.name,
            region: station.region.code,
          });
          break;
        }
      }
    }

    if (validStations.length === stationParts.length) {
      return {
        success: true,
        data: {
          stations: validStations,
          region: validStations[0].region, // Dùng miền của đài đầu tiên
          multiStation: false,
        },
      };
    }
  }

  // Không tìm thấy đài phù hợp
  return {
    success: false,
    error: `Không tìm thấy đài phù hợp với "${stationText}"`,
  };
}

/**
 * Phân tích dòng cược
 * @param {string} line - Dòng cược
 * @param {object} station - Thông tin đài
 * @returns {object} Kết quả phân tích dòng cược
 */
function parseBetLine(line, station) {
  const result = {
    valid: false,
    numbers: [],
    amount: 0,
    betType: null,
    originalLine: line,
    additionalBetTypes: [],
    isPermutation: false, // Thêm flag isPermutation mặc định là false
  };

  try {
    // First, check for direct "da" with 3-digit numbers pattern
    const daWithDigitsPattern = /^([\d.]+)(da|dv)(\d+)$/i;
    const daMatch = line.match(daWithDigitsPattern);

    if (daMatch) {
      const numberPart = daMatch[1];

      // Check if we have any 3-digit numbers
      const numbers = numberPart.split('.');
      const hasThreeDigitNumbers = numbers.some((num) => num.length === 3);

      if (hasThreeDigitNumbers) {
        // Early validation for "da" bet type which only accepts 2-digit numbers
        const betTypeInfo = identifyBetType('da');
        if (betTypeInfo) {
          const validation = validateBetTypeDigitCount(betTypeInfo.id, 3);
          if (!validation.valid) {
            result.numbers = numbers;
            result.betType = betTypeInfo;
            result.valid = false;
            result.error = validation.message;
            return result;
          }
        }
      }
    }

    // Lấy danh sách alias từ các kiểu cược, sắp xếp từ dài đến ngắn
    const sortedAliases = BET_CONFIG.betTypes
      .flatMap((bt) => bt.aliases)
      .sort((a, b) => b.length - a.length);

    // Thử phân tích bằng pattern matching tổng quát cho hầu hết dòng cược
    const betLinePattern = /^([\d.]+)([a-z][a-z0-9]*)(\d+(?:[,.]\d+)?)$/i;
    const betLineMatch = line.match(betLinePattern);

    if (betLineMatch) {
      const [_, numbersPart, betTypeText, amountText] = betLineMatch;

      // Tìm kiếm kiểu cược phù hợp nhất
      let identifiedBetType = null;
      let actualBetTypeText = betTypeText;
      let actualAmountText = amountText;

      // Ưu tiên tìm kiếm các kiểu cược đặc biệt từ BET_CONFIG (như b7l, b8l)
      const specialBetTypes = BET_CONFIG.betTypes
        .filter((bt) => bt.aliases.some((a) => /^b[78]l/i.test(a)))
        .flatMap((bt) => bt.aliases);

      if (
        specialBetTypes.some(
          (alias) => alias.toLowerCase() === betTypeText.toLowerCase()
        )
      ) {
        identifiedBetType = identifyBetType(betTypeText);
      }
      // Sau đó tìm kiếm trong các alias đã sắp xếp (dài nhất trước)
      else {
        for (const alias of sortedAliases) {
          if (betTypeText.toLowerCase() === alias.toLowerCase()) {
            identifiedBetType = identifyBetType(alias);
            break;
          }
        }

        // Nếu không tìm thấy match chính xác, thử tìm bằng startsWith
        if (!identifiedBetType) {
          for (const alias of sortedAliases) {
            if (betTypeText.toLowerCase().startsWith(alias.toLowerCase())) {
              const remaining = betTypeText.substring(alias.length);

              // Kiểm tra nếu phần còn lại có phải là số không
              if (/^\d+$/.test(remaining)) {
                identifiedBetType = identifyBetType(alias);
                actualBetTypeText = alias;
                actualAmountText = remaining + amountText;
                break;
              } else {
                identifiedBetType = identifyBetType(betTypeText);
                break;
              }
            }
          }
        }
      }

      if (identifiedBetType) {
        // Xử lý phần số
        const numbers = numbersPart.split('.').filter((n) => n.trim() !== '');
        const processedNumbers = [];
        for (const num of numbers) {
          const processed = processNumber(num, station);
          processedNumbers.push(...processed);
        }

        // Kiểm tra nếu có số
        if (processedNumbers.length > 0) {
          // Tính tiền
          const amount = parseAmount(actualAmountText);

          // Kiểm tra nếu có tiền
          if (amount > 0) {
            // Kiểm tra độ dài nhất quán của các số
            const lengths = new Set(processedNumbers.map((num) => num.length));
            if (lengths.size > 1) {
              result.numbers = processedNumbers;
              result.valid = false;
              result.error =
                'Tất cả các số trong một dòng cược phải có cùng độ dài';
              return result;
            }

            // Kiểm tra tính hợp lệ của kiểu cược với độ dài số
            if (processedNumbers.length > 0) {
              const digitCount = processedNumbers[0].length;
              const validation = validateBetTypeDigitCount(
                identifiedBetType.id,
                digitCount
              );
              if (!validation.valid) {
                result.numbers = processedNumbers;
                result.betType = identifiedBetType;
                result.valid = false;
                result.error = validation.message;
                return result;
              }
            }

            // Cập nhật kết quả
            result.numbers = processedNumbers;
            result.betType = identifiedBetType;
            result.amount = amount;
            result.valid = true;
            return result;
          }
        }
      }
    }

    // Thử với pattern cụ thể cho các kiểu cược đặc biệt từ BET_CONFIG
    const specialBetAliases = BET_CONFIG.betTypes
      .filter((bt) => bt.aliases.some((a) => /^b[78]l/i.test(a)))
      .flatMap((bt) => bt.aliases)
      .join('|');

    const specialBetPattern = new RegExp(
      `^([\\d.]+)(${specialBetAliases})(\\d+(?:[,.]\d+)?)$`,
      'i'
    );
    const specialBetMatch = line.match(specialBetPattern);

    if (specialBetMatch) {
      const [_, numbersPart, betTypeText, amountText] = specialBetMatch;

      // Xử lý phần số
      const numbers = numbersPart.split('.').filter((n) => n.trim() !== '');
      const processedNumbers = [];
      for (const num of numbers) {
        const processed = processNumber(num, station);
        processedNumbers.push(...processed);
      }

      // Tìm kiểu cược tương ứng
      const betType = identifyBetType(betTypeText);

      // Tính tiền
      const amount = parseAmount(amountText);

      // Nếu tất cả đều hợp lệ, cập nhật result
      if (betType && processedNumbers.length > 0 && amount > 0) {
        // Kiểm tra độ dài nhất quán của các số
        const lengths = new Set(processedNumbers.map((num) => num.length));
        if (lengths.size > 1) {
          result.numbers = processedNumbers;
          result.valid = false;
          result.error =
            'Tất cả các số trong một dòng cược phải có cùng độ dài';
          return result;
        }

        result.numbers = processedNumbers;
        result.betType = betType;
        result.amount = amount;
        result.valid = true;
        return result;
      }
    }

    const normalizedLine = line;

    // Check for multiple bet types pattern (eg: 66.88da1.b5) or single bet type with decimal amount
    const multipleBetTypesPattern =
      /^([\d.,]+)([a-z]+\d+(?:[,.]\d+)?)(\.([a-z]+\d+(?:[,.]\d+)?)+)?$/i;
    const multipleBetMatch = normalizedLine.match(multipleBetTypesPattern);

    if (multipleBetMatch) {
      const [
        fullMatch,
        numbersPart,
        firstBetTypePart,
        dotAndRest,
        remainingBetTypes,
      ] = multipleBetMatch;

      // Process the numbers - be explicit about splitting on both commas and dots
      const numbers = numbersPart.split(/[,.]/).filter((n) => n.trim() !== '');

      // Check if this is a multiple bet types case (with dot separator)
      if (dotAndRest) {
        // Extract first bet type and amount
        const firstBetTypeMatch = firstBetTypePart.match(
          /([a-z]+)(\d+(?:[,.]\d+)?)/i
        );
        if (!firstBetTypeMatch) return result;

        const [_, firstBetTypeText, firstAmountText] = firstBetTypeMatch;
        let firstBetType = identifyBetType(firstBetTypeText);

        // Đặc biệt kiểm tra cho các kiểu cược đặc biệt từ BET_CONFIG
        const specialBetAliases = BET_CONFIG.betTypes
          .filter((bt) => bt.aliases.some((a) => /^b[78]l/i.test(a)))
          .flatMap((bt) => bt.aliases);

        if (
          !firstBetType &&
          specialBetAliases.includes(firstBetTypeText.toLowerCase())
        ) {
          firstBetType = identifyBetType(firstBetTypeText);
        }

        if (!firstBetType) return result;

        // Process remaining bet types
        const betTypes = [{ betType: firstBetType, amount: firstAmountText }];
        const remainingBetTypePattern = /([a-z]+)(\d+(?:[,.]\d+)?)/gi;
        let betTypeMatch;

        while (
          (betTypeMatch = remainingBetTypePattern.exec(remainingBetTypes)) !==
          null
        ) {
          const [__, betTypeText, amountText] = betTypeMatch;
          let betType = identifyBetType(betTypeText);

          // Đặc biệt kiểm tra cho các kiểu cược đặc biệt từ BET_CONFIG
          if (
            !betType &&
            specialBetAliases.includes(betTypeText.toLowerCase())
          ) {
            betType = identifyBetType(betTypeText);
          }

          if (betType) {
            const amount = parseAmount(amountText);
            betTypes.push({ betType, amount });
          }
        }

        // If we have valid numbers and bet types
        if (numbers.length > 0 && betTypes.length > 0) {
          // Check that all numbers have the same length
          const lengths = new Set(numbers.map((num) => num.length));
          if (lengths.size > 1) {
            result.valid = false;
            result.error =
              'Tất cả các số trong một dòng cược phải có cùng độ dài';
            result.numbers = numbers;
            return result;
          }

          // Set the primary bet type and additional bet types
          result.numbers = numbers;
          result.betType = betTypes[0].betType;
          result.amount = parseAmount(betTypes[0].amount);
          result.valid = true;

          // Add additional bet types
          for (let i = 1; i < betTypes.length; i++) {
            result.additionalBetTypes.push({
              betType: betTypes[i].betType,
              amount: parseAmount(betTypes[i].amount),
              numbers: numbers, // Share the same numbers
            });
          }

          return result;
        }
      } else {
        // This is a single bet type (possibly with decimal amount)
        const betTypeMatch = firstBetTypePart.match(
          /([a-z]+)(\d+(?:[,.]\d+)?)/i
        );
        if (betTypeMatch) {
          const [_, betTypeText, amountText] = betTypeMatch;
          let betType = identifyBetType(betTypeText);

          // Đặc biệt kiểm tra cho các kiểu cược đặc biệt từ BET_CONFIG
          const specialBetAliases = BET_CONFIG.betTypes
            .filter((bt) => bt.aliases.some((a) => /^b[78]l/i.test(a)))
            .flatMap((bt) => bt.aliases);

          if (
            !betType &&
            specialBetAliases.includes(betTypeText.toLowerCase())
          ) {
            betType = identifyBetType(betTypeText);
          }

          if (betType) {
            const amount = parseAmount(amountText);

            // Check number lengths
            const lengths = new Set(numbers.map((num) => num.length));
            if (lengths.size > 1) {
              result.valid = false;
              result.error =
                'Tất cả các số trong một dòng cược phải có cùng độ dài';
              result.numbers = numbers;
              return result;
            }

            // NEW CODE: Add validation against bet type rules
            if (numbers.length > 0) {
              const digitCount = numbers[0].length;
              const validation = validateBetTypeDigitCount(
                betType.id,
                digitCount
              );
              if (!validation.valid) {
                result.valid = false;
                result.error = validation.message;
                result.numbers = numbers;
                return result;
              }
            }

            // Set result
            result.numbers = numbers;
            result.betType = betType;
            result.amount = amount;
            result.valid = true;
            return result;
          }
        }
      }
    }

    // SPECIAL DIRECT HANDLING FOR KÉO PATTERN
    // Handle kéo pattern as a special case first - new precise regex
    const keoRegex =
      /(\d+)\/(\d+)(?:keo|k)(\d+)([a-z]+)(\d+(?:[,.]\d+)?(?:\.([a-z]+)(\d+(?:[,.]\d+)?))?)/i;
    const keoMatch = normalizedLine.match(keoRegex);

    if (keoMatch) {
      // Extract all components
      const [
        fullMatch,
        start,
        next,
        end,
        betTypeText,
        amountText,
        secondBetType,
        secondAmount,
      ] = keoMatch;

      // Convert numbers
      const startNum = parseInt(start, 10);
      const nextNum = parseInt(next, 10);
      const endNum = parseInt(end, 10);
      const step = nextNum - startNum;

      if (step > 0) {
        // Generate the sequence
        const sequence = [];
        for (let i = startNum; i <= endNum; i += step) {
          sequence.push(
            i.toString().padStart(Math.max(start.length, end.length), '0')
          );
        }

        // Identify the primary bet type
        let betType = identifyBetType(betTypeText);

        // Đặc biệt kiểm tra cho các kiểu cược đặc biệt từ BET_CONFIG
        const specialBetAliases = BET_CONFIG.betTypes
          .filter((bt) => bt.aliases.some((a) => /^b[78]l/i.test(a)))
          .flatMap((bt) => bt.aliases);

        if (!betType && specialBetAliases.includes(betTypeText.toLowerCase())) {
          betType = identifyBetType(betTypeText);
        }

        if (betType) {
          // Parse amount
          const amount = parseAmount(amountText);

          // Build the result
          result.numbers = sequence;
          result.betType = betType;
          result.amount = amount;
          result.valid = true;

          // Check if there's a second bet type
          if (secondBetType) {
            let secondBetTypeObj = identifyBetType(secondBetType);

            // Đặc biệt kiểm tra cho các kiểu cược đặc biệt từ BET_CONFIG
            if (
              !secondBetTypeObj &&
              specialBetAliases.includes(secondBetType.toLowerCase())
            ) {
              secondBetTypeObj = identifyBetType(secondBetType);
            }

            if (secondBetTypeObj) {
              result.additionalBetTypes = [
                {
                  betType: secondBetTypeObj,
                  amount: parseAmount(secondAmount),
                  numbers: sequence, // Share the same numbers
                },
              ];
            }
          }

          return result;
        }
      }
    }

    // Xử lý cách thông thường nếu không phát hiện kiểu cược rõ ràng
    // Phân tích
    const numbers = [];
    let currentNumber = '';
    let currentBetType = '';
    let currentAmount = '';
    let parsingState = 'number'; // Trạng thái phân tích: 'number', 'betType', 'amount'

    // Trong hàm parseBetLine, thay đổi đoạn xử lý ký tự:
    for (let i = 0; i < normalizedLine.length; i++) {
      const char = normalizedLine[i];

      if (char === '.') {
        // Dấu chấm có thể là dấu phân cách số hoặc là dấu thập phân trong số tiền
        if (parsingState === 'amount') {
          // Nếu đang ở trạng thái phân tích số tiền, dấu chấm là một phần của số tiền
          currentAmount += char;
        } else if (parsingState === 'number' && currentNumber) {
          // Thêm số hiện tại vào danh sách
          const processedNumbers = processNumber(currentNumber, station);
          numbers.push(...processedNumbers);
          currentNumber = '';
        } else if (parsingState === 'betType' && currentBetType) {
          // Đã có kiểu cược, nhưng gặp dấu chấm, có thể có nhiều kiểu cược
          result.betType = identifyBetType(currentBetType);
          currentBetType = '';
          parsingState = 'number';
        }
      } else if (/[0-9]/.test(char)) {
        // Ký tự số
        if (parsingState === 'number' || parsingState === 'amount') {
          if (parsingState === 'betType' && currentBetType) {
            // Chuyển từ betType sang amount
            result.betType = identifyBetType(currentBetType);
            currentBetType = '';
            parsingState = 'amount';
          }

          if (
            parsingState === 'number' &&
            hasCompleteBetTypeAndAmount(normalizedLine, i)
          ) {
            // Nếu phía sau có đủ kiểu cược và số tiền, kết thúc số hiện tại
            if (currentNumber) {
              const processedNumbers = processNumber(currentNumber, station);
              numbers.push(...processedNumbers);
              currentNumber = '';
            }
            // Chuyển sang phân tích kiểu cược
            parsingState = 'betType';
            currentBetType += char;
          } else if (parsingState === 'amount') {
            currentAmount += char;
          } else {
            currentNumber += char;
          }
        } else {
          // Trong kiểu cược, có thể là phần của kiểu cược hoặc số tiền
          // Cải tiến: Trong trường hợp betType có thể có nhiều ký tự (b7l, b8l)
          if (parsingState === 'betType') {
            // Kiểm tra xem kết hợp với ký tự tiếp theo có tạo ra betTypeAlias hợp lệ không
            const potentialBetType = currentBetType + char;

            // Thử tìm kiếm alias phù hợp trong danh sách đã sắp xếp
            let foundMatch = false;
            for (const alias of sortedAliases) {
              if (
                alias.toLowerCase().startsWith(potentialBetType.toLowerCase())
              ) {
                currentBetType += char;
                foundMatch = true;
                break;
              }
            }

            if (foundMatch) {
              continue;
            }
          }

          if (isBetTypeOrAmount(currentBetType + char)) {
            currentBetType += char;
          } else {
            // Chuyển sang phân tích số tiền
            result.betType = identifyBetType(currentBetType);
            currentBetType = '';
            parsingState = 'amount';
            currentAmount += char;
          }
        }
      } else if (char === '/' || char === 'k') {
        // Ký tự đặc biệt trong số
        if (parsingState === 'number') {
          currentNumber += char;
        } else if (parsingState === 'betType') {
          currentBetType += char;
        }
      } else if (isAlphabetChar(char)) {
        // Cải tiến: Kiểm tra kỹ hơn khi gặp ký tự chữ cái
        // Ký tự chữ cái - có thể là phần của kiểu cược hoặc là phần của kéo hoặc từ khóa đặc biệt

        // Improved check for "keo" pattern
        const isKeoPattern =
          currentNumber.includes('/') &&
          (char.toLowerCase() === 'k' ||
            (currentNumber.toLowerCase().includes('/k') &&
              char.toLowerCase() === 'e') ||
            (currentNumber.toLowerCase().includes('/ke') &&
              char.toLowerCase() === 'o'));

        if (
          parsingState === 'number' &&
          (isKeoPattern ||
            currentNumber.includes('/') ||
            isPartOfSpecialKeyword(currentNumber, char))
        ) {
          // Đang phân tích "kéo" hoặc các ký tự đặc biệt khác trong số
          currentNumber += char;
        } else {
          // Kiểm tra nếu đang ở trạng thái betType và đây có thể là phần của kiểu cược
          // dài hơn (ví dụ: 'b7lo')
          if (parsingState === 'betType' && currentBetType) {
            // Kiểm tra xem kết hợp với ký tự tiếp theo có tạo ra betTypeAlias hợp lệ không
            const potentialBetType = currentBetType + char;

            // Thử tìm kiếm alias phù hợp
            let foundMatch = false;
            for (const alias of sortedAliases) {
              if (
                alias.toLowerCase().startsWith(potentialBetType.toLowerCase())
              ) {
                currentBetType += char;
                foundMatch = true;
                break;
              }
            }

            if (foundMatch) {
              continue;
            }
          }

          // Chuyển sang kiểu cược
          if (parsingState === 'number' && currentNumber) {
            const processedNumbers = processNumber(currentNumber, station);
            numbers.push(...processedNumbers);
            currentNumber = '';
          }

          parsingState = 'betType';
          currentBetType += char;
        }
      } else if (char === ',') {
        // Dấu phẩy có thể dùng trong số tiền
        if (parsingState === 'amount') {
          currentAmount += char;
        } else if (parsingState === 'number' && currentNumber) {
          // Xử lý dấu phẩy như dấu chấm nếu đang ở phần số
          const processedNumbers = processNumber(currentNumber, station);
          numbers.push(...processedNumbers);
          currentNumber = '';
        }
      } else if (char === 'n' && parsingState === 'amount') {
        // Ký tự 'n' trong số tiền (nghìn)
        // Không thêm gì, bỏ qua
      }
    }

    // Xử lý phần cuối
    if (parsingState === 'number' && currentNumber) {
      const processedNumbers = processNumber(currentNumber, station);
      numbers.push(...processedNumbers);
    } else if (parsingState === 'betType' && currentBetType) {
      // Kiểm tra đặc biệt cho các kiểu cược trong BET_CONFIG
      const specialBetAliases = BET_CONFIG.betTypes
        .filter((bt) => bt.aliases.some((a) => /^b[78]l/i.test(a)))
        .flatMap((bt) => bt.aliases);

      if (specialBetAliases.includes(currentBetType.toLowerCase())) {
        result.betType = identifyBetType(currentBetType);
      } else {
        result.betType = identifyBetType(currentBetType);
      }
    } else if (parsingState === 'amount' && currentAmount) {
      result.amount = parseAmount(currentAmount);
    }

    // Nếu vẫn chưa có kiểu cược, thử phân tích lại xem có vô tình bỏ qua không
    if (!result.betType && numbers.length > 0) {
      // Tìm kiểu cược ở cuối dòng (bao gồm cả trường hợp có khoảng trắng + chữ 'n' sau số tiền)
      const betTypeMatch = normalizedLine.match(
        /([a-z][a-z0-9]+)(?:\s+)?(\d+(?:[,.]\d+)?(?:n)?)?$/i
      );
      if (betTypeMatch) {
        const potentialBetType = betTypeMatch[1].toLowerCase();
        let betType = null;

        // Kiểm tra đặc biệt cho các kiểu cược trong BET_CONFIG
        const specialBetAliases = BET_CONFIG.betTypes
          .filter((bt) => bt.aliases.some((a) => /^b[78]l/i.test(a)))
          .flatMap((bt) => bt.aliases);

        if (specialBetAliases.includes(potentialBetType)) {
          betType = identifyBetType(potentialBetType);
        } else {
          betType = identifyBetType(potentialBetType);
        }

        if (betType) {
          result.betType = betType;

          // Nếu có số tiền
          if (betTypeMatch[2]) {
            result.amount = parseAmount(betTypeMatch[2]);
          }
        }
      }
    }

    // Đảm bảo không có số trùng lặp
    result.numbers = Array.from(new Set(numbers));

    // THÊM ĐOẠN CODE KIỂM TRA ĐỘ DÀI NHẤT QUÁN CỦA CÁC SỐ
    if (result.numbers.length > 0) {
      const lengths = new Set(result.numbers.map((num) => num.length));
      if (lengths.size > 1) {
        result.valid = false;
        result.error = 'Tất cả các số trong một dòng cược phải có cùng độ dài';
        return result;
      }

      // NEW CODE: Add validation against bet type rules
      if (result.valid && result.betType && result.numbers.length > 0) {
        const digitCount = result.numbers[0].length;
        const validation = validateBetTypeDigitCount(
          result.betType.id,
          digitCount
        );
        if (!validation.valid) {
          result.valid = false;
          result.error = validation.message;
        }
      }
    }

    // Kiểm tra tính hợp lệ
    result.valid =
      result.numbers.length > 0 && result.betType && result.amount > 0;

    // NEW CODE: Add compatibility validation between bet type and region
    if (result.valid && result.betType) {
      const compatibilityCheck = validateBetTypeRegionCompatibility(
        result.betType,
        station
      );
      if (!compatibilityCheck.valid) {
        result.valid = false;
        result.error = compatibilityCheck.error;
      }
    }

    // Vị trí cuối cùng của hàm, thêm đoạn xử lý đặc biệt cho các kiểu cược trong BET_CONFIG
    if (!result.valid && result.numbers.length > 0) {
      // Thử phân tích theo pattern đặc biệt cho kiểu cược trong BET_CONFIG
      const specialBetAliases = BET_CONFIG.betTypes
        .filter((bt) => bt.aliases.some((a) => /^b[78]l/i.test(a)))
        .flatMap((bt) => bt.aliases);

      const specialBetPattern = new RegExp(
        `(${specialBetAliases.join('|')})(\\d+)`,
        'i'
      );
      const numberPart = result.numbers.join('.');
      const remainingText = normalizedLine.substring(
        normalizedLine.indexOf(numberPart) + numberPart.length
      );
      const specialBetMatch = remainingText.match(specialBetPattern);

      if (specialBetMatch) {
        const [_, betTypeText, amountText] = specialBetMatch;
        const betType = identifyBetType(betTypeText);
        const amount = parseAmount(amountText);

        if (betType && amount > 0) {
          result.betType = betType;
          result.amount = amount;
          result.valid = true;
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Lỗi khi phân tích dòng cược:', error, line);
    return {
      ...result,
      error: `Lỗi phân tích: ${error.message}`,
    };
  }
}

/**
 * Xử lý chuỗi số cược và chuyển đổi thành mảng số
 */
function processNumber(numberString) {
  // Xử lý kéo: 10/20keo90 or 10/20k90
  // Enhanced to better handle the format directly
  const keoRegex = /^(\d+)\/(\d+)(?:keo|k)(\d+)$/i;
  const keoMatch = numberString.match(keoRegex);

  if (keoMatch) {
    const start = parseInt(keoMatch[1], 10);
    const next = parseInt(keoMatch[2], 10);
    const end = parseInt(keoMatch[3], 10);

    const step = next - start;
    // If step is invalid, just return original string to avoid errors
    if (step <= 0) return [numberString];

    const numbers = [];
    // Generate sequence with proper padding
    const padLength = Math.max(keoMatch[1].length, keoMatch[3].length);
    for (let i = start; i <= end; i += step) {
      numbers.push(i.toString().padStart(padLength, '0'));
    }

    return numbers;
  }

  // Handle other special keyword cases from BET_CONFIG
  const lowerString = numberString.toLowerCase();
  const specialKeyword = BET_CONFIG.numberCombinations.find((nc) =>
    nc.aliases.includes(lowerString)
  );

  if (specialKeyword) {
    switch (specialKeyword.name.toLowerCase()) {
      case 'tài':
        return generateTaiNumbers();
      case 'xỉu':
        return generateXiuNumbers();
      case 'chẵn':
        return generateChanNumbers();
      case 'lẻ':
        return generateLeNumbers();
      case 'chẵn chẵn':
        return generateChanChanNumbers();
      case 'lẻ lẻ':
        return generateLeLeNumbers();
      case 'chẵn lẻ':
        return generateChanLeNumbers();
      case 'lẻ chẵn':
        return generateLeChanNumbers();
    }
  }

  // Handle grouped numbers
  if (/^\d{4,}$/.test(numberString) && numberString.length % 2 === 0) {
    const numbers = [];
    for (let i = 0; i < numberString.length; i += 2) {
      numbers.push(numberString.substring(i, i + 2));
    }
    return numbers;
  }

  // Return as is for normal numbers
  return [numberString];
}

/**
 * Kiểm tra xem chuỗi từ vị trí hiện tại có đủ thông tin cho kiểu cược và số tiền không
 * @param {string} line - Dòng cần kiểm tra
 * @param {number} currentPos - Vị trí hiện tại trong dòng
 * @returns {boolean} Có đủ thông tin hay không
 */
function hasCompleteBetTypeAndAmount(line, currentPos) {
  // Tìm kiểu cược ở phần còn lại của dòng
  const remainingLine = line.substring(currentPos);

  // Cải tiến: Sử dụng regex chính xác hơn để tìm kiểu cược
  // Tạo pattern regex từ các alias kiểu cược, sắp xếp theo độ dài để ưu tiên tìm kiếm các alias dài hơn trước
  const betTypePattern = BET_CONFIG.betTypes
    .flatMap((bt) => bt.aliases)
    .sort((a, b) => b.length - a.length)
    .join('|');

  // Tìm kiểu cược và số tiền ở phần sau của dòng
  // Cải tiến: Sử dụng word boundary \b để đảm bảo tìm đúng kiểu cược hoàn chỉnh
  const betTypeRegex = new RegExp(
    `\\b(${betTypePattern})\\d+(?:[,.n]\\d+)?$`,
    'i'
  );
  return betTypeRegex.test(remainingLine);
}

/**
 * Kiểm tra xem chuỗi có thể là kiểu cược hoặc số tiền hay không
 */
function isBetTypeOrAmount(text) {
  // Tạo danh sách aliases sắp xếp theo độ dài (dài nhất trước)
  const sortedAliases = BET_CONFIG.betTypes
    .flatMap((bt) => bt.aliases)
    .sort((a, b) => b.length - a.length);

  // Kiểm tra nếu là kiểu cược - ưu tiên match kiểu cược dài nhất trước
  const isBetType = sortedAliases.some((alias) =>
    text.toLowerCase().startsWith(alias.toLowerCase())
  );

  // Hoặc kiểm tra nếu thuộc kiểu số liệu
  return isBetType || /^[0-9,.]+$/.test(text);
}

/**
 * Phân tích số tiền cược
 * @param {string} amountString - Chuỗi số tiền
 * @returns {number} Số tiền đã phân tích
 */
function parseAmount(amountString) {
  if (!amountString) return 0;

  let cleaned = amountString.replace(/[^0-9,.]/g, '');
  if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }

  const amount = parseFloat(cleaned);
  if (isNaN(amount)) return 0;

  return amount * 1000;
}

/**
 * Xác định kiểu cược từ chuỗi
 */
function identifyBetType(betTypeString) {
  if (!betTypeString) return null;

  const normalized = betTypeString.toLowerCase();

  // Xử lý các kiểu cược đặc biệt từ BET_CONFIG
  const betTypeCorrections = {
    dui: 'duoi',
    xcdui: 'xcduoi',
  };

  // Nếu có trong mảng corrections, thì chuyển đổi
  if (betTypeCorrections[normalized]) {
    return identifyBetType(betTypeCorrections[normalized]);
  }

  // Đặc biệt xử lý cho các kiểu cược theo alias từ BET_CONFIG
  for (const betType of BET_CONFIG.betTypes) {
    for (const alias of betType.aliases) {
      if (normalized === alias.toLowerCase()) {
        return {
          id: betType.name,
          name: betType.name,
          alias: alias,
        };
      }
    }
  }

  // Partial match
  for (const betType of BET_CONFIG.betTypes) {
    for (const alias of betType.aliases) {
      if (
        alias.toLowerCase().startsWith(normalized) ||
        normalized.startsWith(alias.toLowerCase())
      ) {
        return {
          id: betType.name,
          name: betType.name,
          alias: alias,
        };
      }
    }
  }

  return null;
}

/**
 * Kiểm tra xem ký tự có phải là chữ cái hay không
 */
function isAlphabetChar(char) {
  return /[a-z]/i.test(char);
}

// Add new validation helper function
function validateBetTypeDigitCount(betTypeId, digitCount) {
  const betType = BET_CONFIG.betTypes.find((bt) => bt.name === betTypeId);
  if (!betType || !betType.bet_rule) {
    return { valid: true }; // No rules defined, allow any
  }

  const allowedDigitRules = betType.bet_rule;
  const isAllowed = allowedDigitRules.some(
    (rule) => rule === `${digitCount} digits`
  );

  if (!isAllowed) {
    return {
      valid: false,
      message: `Kiểu cược ${
        betType.name
      } chỉ chấp nhận ${allowedDigitRules.join(
        ', '
      )}, không hỗ trợ số ${digitCount} chữ số`,
    };
  }

  return { valid: true };
}

/**
 * Kiểm tra tính tương thích giữa kiểu cược và miền/đài
 * @param {object} betType - Thông tin kiểu cược
 * @param {object} station - Thông tin đài
 * @returns {object} Kết quả kiểm tra {valid: boolean, error: string}
 */
function validateBetTypeRegionCompatibility(betType, station) {
  // Nếu không có thông tin kiểu cược hoặc đài, trả về lỗi
  if (!betType || !station) {
    return {
      valid: false,
      error: 'Thiếu thông tin kiểu cược hoặc đài',
    };
  }

  // Tìm kiểu cược trong danh sách kiểu cược từ BET_CONFIG
  const defaultBetType = BET_CONFIG.betTypes.find(
    (bt) =>
      bt.name === betType.id ||
      bt.aliases.some((a) => a.toLowerCase() === betType.alias?.toLowerCase())
  );

  // Nếu không tìm thấy kiểu cược, trả về lỗi
  if (!defaultBetType) {
    return {
      valid: false,
      error: `Kiểu cược ${betType.alias || betType.id} không tồn tại`,
    };
  }

  // Lấy danh sách các miền mà kiểu cược này có thể áp dụng
  const applicableRegions = defaultBetType.applicable_regions || [];

  // Lấy miền của đài
  const stationRegion = station.region;

  // Kiểm tra xem miền của đài có nằm trong danh sách các miền mà kiểu cược này có thể áp dụng hay không
  if (!applicableRegions.includes(stationRegion)) {
    return {
      valid: false,
      error: `Kiểu cược ${
        defaultBetType.name
      } không áp dụng cho miền ${mapRegionName(stationRegion)}`,
    };
  }

  // Nếu tất cả các kiểm tra đều thành công, trả về kết quả thành công
  return {
    valid: true,
  };
}

/**
 * Map tên miền sang tên hiển thị
 * @param {string} region - Mã miền
 * @returns {string} Tên miền hiển thị
 */
function mapRegionName(region) {
  const regionObj = BET_CONFIG.regions.find((r) => r.code === region);
  return regionObj ? regionObj.name : region;
}

/**
 * Tạo danh sách số tài (50-99)
 */
function generateTaiNumbers() {
  const numbers = [];
  for (let i = 50; i <= 99; i++) {
    numbers.push(i.toString().padStart(2, '0'));
  }
  return numbers;
}

/**
 * Tạo danh sách số xỉu (00-49)
 */
function generateXiuNumbers() {
  const numbers = [];
  for (let i = 0; i <= 49; i++) {
    numbers.push(i.toString().padStart(2, '0'));
  }
  return numbers;
}

/**
 * Tạo danh sách số chẵn (00, 02, 04, ..., 98)
 */
function generateChanNumbers() {
  const numbers = [];
  for (let i = 0; i <= 98; i += 2) {
    numbers.push(i.toString().padStart(2, '0'));
  }
  return numbers;
}

/**
 * Tạo danh sách số lẻ (01, 03, 05, ..., 99)
 */
function generateLeNumbers() {
  const numbers = [];
  for (let i = 1; i <= 99; i += 2) {
    numbers.push(i.toString().padStart(2, '0'));
  }
  return numbers;
}

/**
 * Tạo danh sách số chẵn chẵn (00, 02, 04, ..., 88)
 */
function generateChanChanNumbers() {
  const numbers = [];
  for (let i = 0; i <= 8; i += 2) {
    for (let j = 0; j <= 8; j += 2) {
      numbers.push(`${i}${j}`);
    }
  }
  return numbers;
}

/**
 * Tạo danh sách số lẻ lẻ (11, 13, 15, ..., 99)
 */
function generateLeLeNumbers() {
  const numbers = [];
  for (let i = 1; i <= 9; i += 2) {
    for (let j = 1; j <= 9; j += 2) {
      numbers.push(`${i}${j}`);
    }
  }
  return numbers;
}

/**
 * Tạo danh sách số chẵn lẻ (01, 03, 05, ..., 89)
 */
function generateChanLeNumbers() {
  const numbers = [];
  for (let i = 0; i <= 8; i += 2) {
    for (let j = 1; j <= 9; j += 2) {
      numbers.push(`${i}${j}`);
    }
  }
  return numbers;
}

/**
 * Tạo danh sách số lẻ chẵn (10, 12, 14, ..., 98)
 */
function generateLeChanNumbers() {
  const numbers = [];
  for (let i = 1; i <= 9; i += 2) {
    for (let j = 0; j <= 8; j += 2) {
      numbers.push(`${i}${j}`);
    }
  }
  return numbers;
}

export default {
  parseBetCode,
};
