/* eslint-disable no-useless-escape */
// src/services/bet/formatter.js
import { BET_CONFIG } from '@/config/data';

/**
 * Chuẩn hóa mã cược đầu vào
 * @param {string} betCode - Mã cược đầu vào
 * @returns {string} Mã cược đã chuẩn hóa
 */
export function formatBetCode(betCode) {
  if (!betCode || typeof betCode !== 'string') {
    return betCode;
  }

  // Phân tách các dòng
  const lines = betCode
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '');

  if (lines.length === 0) {
    return betCode;
  }

  const formattedLines = [];

  // QUAN TRỌNG: Để xử lý nhiều đài, chúng ta cần lặp qua từng dòng và
  // kiểm tra xem dòng đó có phải là đài mới hay không

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i].trim();

    // NEW: Xử lý trường hợp đặc biệt - một dòng có cả đài và mã cược
    // Ví dụ: "mb 01.02.03b1" -> "mb\n01.02.03b1"
    const spaceParts = lineText.split(/\s+/);
    if (spaceParts.length >= 2) {
      const potentialStation = spaceParts[0].toLowerCase();

      // Kiểm tra nếu phần đầu tiên là đài hợp lệ
      if (isStationOnlyLine(potentialStation)) {
        // Lấy phần còn lại (không dùng split để đảm bảo lấy chính xác)
        const restOfText = lineText.substring(potentialStation.length).trim();

        // Kiểm tra nếu phần còn lại có số và có thể là mã cược
        if (/\d/.test(restOfText)) {
          // Tách thành hai dòng riêng biệt
          formattedLines.push(potentialStation);

          // Format the bet line, which might result in multiple lines
          const formattedBetLines = formatBetLine(restOfText);
          if (formattedBetLines.includes('\n')) {
            formattedBetLines.split('\n').forEach((line) => {
              formattedLines.push(line);
            });
          } else {
            formattedLines.push(formattedBetLines);
          }
          continue;
        }
      }
    }

    // Xử lý logic hiện tại nếu không phải trường hợp đặc biệt
    if (isStationOnlyLine(lineText)) {
      const formattedStation = formatStation(lineText);
      formattedLines.push(formattedStation);
    } else {
      // Nếu không phải là dòng đài, xử lý như dòng cược
      const formattedLine = formatBetLine(lineText);
      if (formattedLine.includes('\n')) {
        formattedLine.split('\n').forEach((line) => {
          formattedLines.push(line);
        });
      } else {
        formattedLines.push(formattedLine);
      }
    }
  }

  return formattedLines.join('\n');
}

/**
 * Kiểm tra xem dòng có phải là dòng chỉ chứa tên đài không
 */
function isStationOnlyLine(line) {
  // Loại bỏ dấu chấm cuối
  const cleanLine = line.replace(/\.+$/, '').trim().toLowerCase();

  // Kiểm tra xem là tên đài đơn thuần không
  // 1. Kiểm tra các mẫu đài nhiều miền (vd: 2dmn, 3dmt)
  if (/^\d+d(mn|mt|n|t|nam|trung)$/i.test(cleanLine)) {
    return true;
  }

  // 2. Kiểm tra tên đài đơn lẻ từ BET_CONFIG
  for (const station of BET_CONFIG.accessibleStations) {
    if (
      station.name.toLowerCase() === cleanLine ||
      station.aliases.some((alias) => alias === cleanLine)
    ) {
      return true;
    }
  }

  // 3. Kiểm tra mẫu region codes và aliases từ BET_CONFIG
  for (const region of BET_CONFIG.regions) {
    if (region.aliases.includes(cleanLine)) {
      return true;
    }
  }

  // 4. Kiểm tra nếu là tổ hợp các đài (vd: vl.ct, dn.hue)
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
 * Chuẩn hóa phần đài
 * @param {string} stationLine - Dòng chứa thông tin đài
 * @returns {string} Dòng đài đã chuẩn hóa
 */
function formatStation(stationLine) {
  // Loại bỏ dấu chấm cuối
  let formattedLine = stationLine.trim().replace(/\.+$/, '');

  // Nếu đã có số cược, tách phần đài ra
  if (/\d/.test(formattedLine) && !formattedLine.match(/^\d+d/)) {
    const stationPart = extractStationPart(formattedLine);
    return stationPart;
  }

  // Xử lý đài ghép không đúng định dạng
  const stationText = formattedLine.trim().toLowerCase();

  // Tìm các mẫu đài ghép liền nhau không dùng dấu phân cách
  const mergedStations = findMergedStations(stationText);
  if (mergedStations.found) {
    return mergedStations.formatted;
  }

  // Xử lý các viết tắt gây nhầm lẫn
  if (stationText === 'dn') {
    const currentDay = getCurrentDayOfWeek();
    // Thứ 4 (ngày 3) có cả Đồng Nai và Đà Nẵng
    if (currentDay === 3) {
      return 'dnai'; // Mặc định chọn Đồng Nai
    }
  }

  // Nếu không có gì để sửa, giữ nguyên
  return formattedLine;
}

/**
 * Tìm và sửa đài ghép liền nhau không dùng dấu phân cách
 */
function findMergedStations(stationText) {
  // Sử dụng BET_CONFIG.accessibleStations để tìm tất cả các đài và aliases
  for (const station1 of BET_CONFIG.accessibleStations) {
    // Thử tất cả các alias của đài 1
    for (const alias1 of [station1.name.toLowerCase(), ...station1.aliases]) {
      if (stationText.startsWith(alias1)) {
        const remainingText = stationText.substring(alias1.length);

        // Tìm đài thứ 2 trong phần còn lại
        for (const station2 of BET_CONFIG.accessibleStations) {
          // Không xét ghép giữa đài với chính nó
          if (station1.name === station2.name) continue;

          for (const alias2 of [
            station2.name.toLowerCase(),
            ...station2.aliases,
          ]) {
            if (remainingText === alias2 || remainingText.startsWith(alias2)) {
              return {
                found: true,
                formatted: `${alias1}.${alias2}`,
              };
            }
          }
        }
      }
    }
  }

  // Kiểm tra lại với ghép chính xác
  for (const station1 of BET_CONFIG.accessibleStations) {
    for (const alias1 of [station1.name.toLowerCase(), ...station1.aliases]) {
      for (const station2 of BET_CONFIG.accessibleStations) {
        // Không xét ghép giữa đài với chính nó
        if (station1.name === station2.name) continue;

        for (const alias2 of [
          station2.name.toLowerCase(),
          ...station2.aliases,
        ]) {
          // Nếu hai alias ghép lại bằng stationText
          if (stationText === alias1 + alias2) {
            return {
              found: true,
              formatted: `${alias1}.${alias2}`,
            };
          }
        }
      }
    }
  }

  return { found: false };
}

/**
 * Lấy ngày hiện tại trong tuần (0: Chủ nhật, 1-6: Thứ 2 - Thứ 7)
 */
function getCurrentDayOfWeek() {
  return new Date().getDay();
}

/**
 * Trích xuất phần đài từ một dòng
 */
function extractStationPart(line) {
  // Tìm vị trí của số đầu tiên hoặc kiểu cược
  let index = line.length;

  // Tìm vị trí số đầu tiên (trừ trường hợp bắt đầu bằng 2d, 3d)
  const numberMatch = /(?<!\d[a-z])\d/.exec(line);
  if (numberMatch) {
    index = Math.min(index, numberMatch.index);
  }

  // Tìm vị trí kiểu cược đầu tiên
  const betTypeAliases = BET_CONFIG.betTypes.flatMap((bt) => bt.aliases);
  for (const alias of betTypeAliases) {
    const aliasPos = line.indexOf(alias);
    if (aliasPos !== -1) {
      index = Math.min(index, aliasPos);
    }
  }

  return line.substring(0, index).trim();
}

/**
 * Format bet line with improved handling of special keywords and sequences
 * @param {string} line - Bet line to format
 * @returns {string} Formatted bet line
 */
function formatBetLine(line) {
  // Bước 1: Chuẩn hóa khoảng trắng và dấu phân cách giữa các số
  let normalizedLine = line.trim();

  // Xử lý đặc biệt cho kiểu đá với chuỗi số dài
  // Kiểm tra mẫu dạng: XXXXXX(da|dv)N - số liền nhau + da/dv + số tiền
  const daPattern = /^(\d+)(da|dv)(\d+(?:[,.]\d+)?)$/i;
  const daMatch = normalizedLine.match(daPattern);

  if (daMatch) {
    const [_, numbers, betType, amount] = daMatch;

    // Nếu chuỗi số có độ dài ≥ 4 và là bội số của 2, tách thành các cặp 2 chữ số
    if (numbers.length >= 4 && numbers.length % 2 === 0) {
      let formattedNumbers = '';
      for (let i = 0; i < numbers.length; i += 2) {
        if (i > 0) formattedNumbers += '.';
        formattedNumbers += numbers.substr(i, 2);
      }
      normalizedLine = `${formattedNumbers}${betType}${amount}`;
    }
  }

  // Cải tiến: Xử lý cả trường hợp số liền nhau trong đá có dấu chấm ở đâu đó
  // Ví dụ: 30.4050da1 -> 30.40.50da1
  const partialDaPattern =
    /^((?:\d+\.)*?)(\d{4,})(?!\.)?(da|dv)(\d+(?:[,.]\d+)?)$/i;
  const partialDaMatch = normalizedLine.match(partialDaPattern);

  if (partialDaMatch && !daMatch) {
    // Chỉ xử lý nếu chưa được xử lý bởi mẫu trước
    const [_, prefix, numbers, betType, amount] = partialDaMatch;

    if (numbers.length >= 4 && numbers.length % 2 === 0) {
      let formattedNumbers = '';
      for (let i = 0; i < numbers.length; i += 2) {
        if (i > 0) formattedNumbers += '.';
        formattedNumbers += numbers.substr(i, 2);
      }

      // Nối lại với prefix nếu có
      normalizedLine = prefix
        ? `${prefix}${formattedNumbers}${betType}${amount}`
        : `${formattedNumbers}${betType}${amount}`;
    }
  }

  // Convert spaces between numbers to dots (e.g. "15 16 37 77" → "15.16.37.77")
  normalizedLine = normalizedLine.replace(/(\d+)\s+(\d+)/g, '$1.$2');

  // Normalize spaces around keo pattern
  normalizedLine = normalizedLine.replace(
    /(\d+\/\d+keo\d+)\s+([a-z]+)/i,
    '$1$2'
  );

  // Loại bỏ dấu chấm ở đầu dòng
  normalizedLine = normalizedLine.replace(/^\./, '');

  // Sửa lỗi tên kiểu cược - sử dụng BET_CONFIG.betTypes
  const betTypeCorrections = {
    xcdui: 'duoi',
    xcduoi: 'duoi',
    xcd: 'dau',
    xcdau: 'dau',
  };

  // Apply corrections
  for (const [incorrect, correct] of Object.entries(betTypeCorrections)) {
    const pattern = new RegExp(`\\b${incorrect}(?!\\w)`, 'g');
    normalizedLine = normalizedLine.replace(pattern, correct);
  }

  // Đặc biệt xử lý "dui" -> "duoi"
  normalizedLine = normalizedLine.replace(/(\b|[^a-z])dui(\d+|$)/g, '$1duoi$2');

  // Bước 2: Phát hiện và tách nhiều kiểu cược (dau20.duoi10)
  const multipleBetTypesPattern =
    /^([\d.\s]+)\s*([a-z][a-z0-9]+\d+(?:[,.]\d+)?\.?[a-z][a-z0-9]*\d+(?:[,.]\d+)?)/i;
  const multipleBetMatch = normalizedLine.match(multipleBetTypesPattern);

  if (multipleBetMatch) {
    const [fullMatch, numbersPart, betTypesPart] = multipleBetMatch;

    // Chuẩn hóa phần số (chuyển dấu cách thành dấu chấm)
    const formattedNumbers = numbersPart.trim().replace(/\s+/g, '.');

    // Lấy danh sách tất cả aliases sắp xếp theo độ dài - dài nhất trước
    const sortedAliases = BET_CONFIG.betTypes
      .flatMap((bt) => bt.aliases)
      .sort((a, b) => b.length - a.length);

    // Tìm kiếm các kiểu cược từ phần betTypesPart
    const betTypes = [];
    let remainingText = betTypesPart;

    // Lặp cho đến khi hết text
    while (remainingText.length > 0) {
      let foundMatch = false;

      // Tìm kiếm alias dài nhất trước
      for (const alias of sortedAliases) {
        if (remainingText.toLowerCase().startsWith(alias.toLowerCase())) {
          // Tìm số tiền đi kèm
          const afterAlias = remainingText.substring(alias.length);
          const amountMatch = afterAlias.match(/^(\d+(?:[,.]\d+)?)/);

          if (amountMatch) {
            betTypes.push({
              type: alias,
              amount: amountMatch[1],
            });

            // Cập nhật remainingText, bỏ qua phần đã xử lý và dấu chấm nếu có
            remainingText = afterAlias.substring(amountMatch[0].length);
            if (remainingText.startsWith('.')) {
              remainingText = remainingText.substring(1);
            }

            foundMatch = true;
            break;
          }
        }
      }

      // Nếu không tìm thấy match nào, di chuyển tiếp một ký tự
      if (!foundMatch) {
        remainingText = remainingText.substring(1);
      }
    }

    // Tạo dòng cược riêng cho mỗi kiểu
    if (betTypes.length > 1) {
      return betTypes
        .map((bet) => `${formattedNumbers}${bet.type}${bet.amount}`)
        .join('\n');
    }
  }

  // Bước 3: Xử lý keo pattern với nhiều kiểu cược
  const keoMultiBetPattern =
    /^(\d+\/\d+(?:keo|k)\d+)\s*([a-z]+\d+(?:[,.]\d+)?\.?[a-z]+\d+(?:[,.]\d+)?)/i;
  const keoMultiMatch = normalizedLine.match(keoMultiBetPattern);

  if (keoMultiMatch) {
    const [fullMatch, keoPattern, betTypesPart] = keoMultiMatch;

    // Tìm các kiểu cược và số tiền
    const betTypes = [];
    const betTypePattern = /([a-z]+)(\d+(?:[,.]\d+)?)/gi;
    let betTypeMatch;

    while ((betTypeMatch = betTypePattern.exec(betTypesPart)) !== null) {
      betTypes.push({
        type: betTypeMatch[1],
        amount: betTypeMatch[2],
      });
    }

    // Tạo dòng cược riêng cho mỗi kiểu với cùng pattern keo
    if (betTypes.length > 1) {
      return betTypes
        .map((bet) => `${keoPattern}${bet.type}${bet.amount}`)
        .join('\n');
    }
  }

  // Loại bỏ khoảng trắng giữa kiểu cược và số tiền
  normalizedLine = normalizedLine.replace(
    /([a-z]+)\s+(\d+(?:[,.]\d+)?)/gi,
    '$1$2'
  );

  // Preprocessor: Remove trailing 'n' from amount directly
  normalizedLine = normalizedLine.replace(
    /([a-z]+\d+(?:[,.]\d+)?)n(\s|$|\n)/gi,
    '$1$2'
  );

  // Bước 4: Chuẩn hóa phần số cược
  // Thay thế các dấu phân cách không chuẩn bằng dấu chấm
  normalizedLine = normalizedLine.replace(/[,\- ]+/g, '.');

  // Loại bỏ các dấu chấm dư thừa/liên tiếp
  normalizedLine = normalizedLine.replace(/\.{2,}/g, '.');
  normalizedLine = normalizedLine.replace(/^\.|\.$/g, '');

  // QUAN TRỌNG: Đảm bảo không có dấu chấm trước các kiểu cược
  const betTypeAliases = BET_CONFIG.betTypes.flatMap((bt) => bt.aliases);
  for (const alias of betTypeAliases) {
    // Tìm và loại bỏ dấu chấm trước kiểu cược
    const betTypeRegex = new RegExp(`\\.(${alias}\\d*(?:[,.n]\\d+)?)`, 'gi');
    normalizedLine = normalizedLine.replace(betTypeRegex, '$1');
  }

  // Bước 5: Xử lý trường hợp nhiều kiểu cược trên cùng dãy số
  // Kiểm tra pattern như: [số].[số][kiểu cược][số tiền].[kiểu cược][số tiền]
  const combinedBetTypesPattern = /^([\d.]+)((?:[a-z]+\d+(?:[,.]\d+)?\.?)+)$/i;
  const combinedMatch = normalizedLine.match(combinedBetTypesPattern);

  if (combinedMatch) {
    const [fullMatch, numbersPart, betTypesPart] = combinedMatch;

    // Create pattern to identify separate bet types
    const betTypePattern = betTypeAliases
      .sort((a, b) => b.length - a.length)
      .map((alias) => `(${alias}\\d+(?:[,.]\d+)?)`)
      .join('|');

    // Find all bet types and amounts
    const betTypeRegex = new RegExp(betTypePattern, 'gi');
    const foundBetTypes = [];
    let match;

    while ((match = betTypeRegex.exec(betTypesPart)) !== null) {
      // Get the matched bet type + amount
      const betTypeWithAmount = match[0];
      foundBetTypes.push(betTypeWithAmount);
    }

    // If we found multiple bet types, split them into separate lines
    if (foundBetTypes.length > 1) {
      const separateLines = [];

      for (const betType of foundBetTypes) {
        separateLines.push(`${numbersPart}${betType}`);
      }

      return separateLines.join('\n');
    }
  }

  // Bước 6: Thêm số tiền mặc định cho kiểu cược thiếu số tiền
  const betTypeWithoutAmount = normalizedLine.match(/([a-z]+)(?!\d)(\s|$)/i);
  if (betTypeWithoutAmount) {
    const betTypeAlias = betTypeWithoutAmount[1].toLowerCase();
    const validBetType = betTypeAliases.includes(betTypeAlias);

    if (validBetType) {
      normalizedLine = normalizedLine.replace(
        new RegExp(`${betTypeAlias}(\\s|$)`, 'i'),
        `${betTypeAlias}10$1`
      );
    }
  }

  return normalizedLine;
}

/**
 * Tách mã cược thành các thành phần để dễ dàng xử lý
 * @param {string} betCode - Mã cược đầu vào
 * @returns {object} Các thành phần của mã cược
 */
export function decomposeBetCode(betCode) {
  if (!betCode || typeof betCode !== 'string') {
    return { station: '', lines: [] };
  }

  // Phân tách các dòng
  const lines = betCode
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '');

  if (lines.length === 0) {
    return { station: '', lines: [] };
  }

  // Lấy phần đài
  const station = extractStationPart(lines[0]);

  // Lấy phần số cược từ dòng đầu tiên nếu có
  let betLines = [];
  const firstLineBetPart = lines[0].substring(station.length).trim();
  if (firstLineBetPart) {
    betLines.push(firstLineBetPart);
  }

  // Thêm các dòng còn lại, bỏ qua các dòng chỉ chứa tên đài
  for (let i = 1; i < lines.length; i++) {
    if (!isStationOnlyLine(lines[i])) {
      betLines.push(lines[i]);
    }
  }

  return {
    station,
    lines: betLines,
  };
}

export default {
  formatBetCode,
  decomposeBetCode,
};
