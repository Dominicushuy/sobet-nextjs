// src/services/betCodeService.js
import { parseBetCode } from './parser';
import { formatBetCode } from './formatter';
import { calculateStake } from './stakeCalculator';
import { calculatePotentialPrize } from './prizeCalculator';
import { generatePermutations } from '@/utils/bet';
import { BET_CONFIG } from '@/config/data';

/**
 * Dịch vụ phân tích và xử lý mã cược
 */
export const betCodeService = {
  /**
   * Phân tích toàn diện một mã cược
   * @param {string} rawText - Mã cược thô
   * @returns {object} Kết quả phân tích
   */
  analyzeBetCode(rawText) {
    try {
      // Kiểm tra nếu là trường hợp nhiều đài trong một mã cược
      if (this.isMultiStationBetCode(rawText)) {
        return this.analyzeMultiStationBetCode(rawText);
      }

      // Chuẩn hóa định dạng
      const formattedText = formatBetCode(rawText);
      const isFormatted = formattedText !== rawText;

      // Phân tích mã cược
      const parseResult = parseBetCode(formattedText);

      // Nếu mã cược hợp lệ, tính toán số tiền và tiềm năng thắng
      let calculationResults = { stakeResult: null, prizeResult: null };

      // NEW: Check for validity at the line level even if parsing succeeded overall
      const hasInvalidLines =
        parseResult.success &&
        parseResult.lines &&
        parseResult.lines.some((line) => !line.valid && line.error);

      if (hasInvalidLines) {
        // Add specific error details from individual lines
        const errorMessages = parseResult.lines
          .filter((line) => !line.valid && line.error)
          .map((line) => `Dòng "${line.originalLine}": ${line.error}`)
          .join('\n');

        parseResult.lineErrors = errorMessages;
      }

      if (parseResult.success) {
        // Check for permutation types and ensure the permutations are generated
        for (const line of parseResult.lines) {
          // Check if this line has a permutation bet type from BET_CONFIG
          const betTypeAlias = line.betType?.alias?.toLowerCase();
          const betType = BET_CONFIG.betTypes.find((bt) =>
            bt.aliases.some((a) => a.toLowerCase() === betTypeAlias)
          );

          const isPermutationType = betType && betType.is_permutation;

          // If this is a permutation type, mark it and generate permutations
          if (
            isPermutationType ||
            (betTypeAlias &&
              (betTypeAlias.includes('dao') ||
                betTypeAlias.includes('dxc') ||
                betTypeAlias === 'xcd'))
          ) {
            line.isPermutation = true;

            // Generate permutations if not already present
            if (!line.permutations && line.numbers) {
              line.permutations = {};
              for (const number of line.numbers) {
                const perms = generatePermutations(number);
                line.permutations[number] = perms;
              }
            }
          }
        }

        calculationResults.stakeResult = calculateStake(parseResult);
        calculationResults.prizeResult = calculatePotentialPrize(parseResult);

        // NEW: Check if stake calculation has errors
        if (calculationResults.stakeResult.hasErrors) {
          parseResult.calculationErrors = calculationResults.stakeResult.details
            .filter((detail) => !detail.valid && detail.error)
            .map((detail) => `Dòng "${detail.originalLine}": ${detail.error}`)
            .join('\n');

          parseResult.success = false;
        }
      }

      return {
        success: parseResult.success,
        rawText,
        formattedText,
        isFormatted,
        parseResult,
        calculationResults,
      };
    } catch (error) {
      console.error('Error analyzing bet code:', error);
      return {
        success: false,
        error: error.message,
        rawText,
      };
    }
  },

  /**
   * Kiểm tra xem có phải mã cược nhiều đài không
   * @param {string} text - Mã cược cần kiểm tra
   * @returns {boolean} Là mã cược nhiều đài hay không
   */
  isMultiStationBetCode(text) {
    if (!text || typeof text !== 'string') return false;

    const lines = text
      .trim()
      .split('\n')
      .filter((line) => line.trim() !== '');
    if (lines.length < 2) return false;

    // Đếm số dòng đài
    let stationLineCount = 0;
    for (const line of lines) {
      if (this.isStationLine(line)) {
        stationLineCount++;
        if (stationLineCount >= 2) return true;
      }
    }

    return false;
  },

  /**
   * Kiểm tra xem một dòng có phải là dòng đài không
   * @param {string} line - Dòng cần kiểm tra
   * @returns {boolean} Là dòng đài hay không
   */
  isStationLine(line) {
    // Lấy danh sách các đài và aliases từ BET_CONFIG
    const stationAliases = BET_CONFIG.accessibleStations.flatMap((station) => [
      station.name.toLowerCase(),
      ...station.aliases,
    ]);

    // Lấy danh sách các region aliases từ BET_CONFIG
    const regionAliases = BET_CONFIG.regions.flatMap(
      (region) => region.aliases
    );

    // Các mẫu đài nhiều miền từ region aliases
    const multiRegionPattern = new RegExp(
      `^\\d+d(${regionAliases.join('|')})$`,
      'i'
    );

    // Kiểm tra nếu dòng chỉ chứa tên đài
    const simpleLine = line.trim().toLowerCase().replace(/\.+$/, '');

    // Trường hợp 1: đài nhiều miền
    if (multiRegionPattern.test(simpleLine)) {
      return true;
    }

    // Fallback cho các mẫu 2dmn, 3dmt
    if (/^\d+d(mn|mt|n|t|nam|trung)$/i.test(simpleLine)) {
      return true;
    }

    // Trường hợp 2: Đài đơn lẻ
    if (stationAliases.includes(simpleLine)) {
      return true;
    }

    // Trường hợp 3: Các tên miền
    if (regionAliases.includes(simpleLine)) {
      return true;
    }

    // Trường hợp 4: Nhiều đài (vl.ct, v.v.)
    if (simpleLine.includes('.')) {
      const parts = simpleLine.split('.');
      if (parts.length > 1) {
        // Nếu tất cả các phần đều là tên đài
        return parts.every((part) => stationAliases.includes(part));
      }
    }

    return false;
  },

  /**
   * Phân tích mã cược nhiều đài
   * @param {string} rawText - Mã cược thô
   * @returns {object} Kết quả phân tích
   */
  analyzeMultiStationBetCode(rawText) {
    const stationBetCodes = this.extractMultiStationBetCodes(rawText);
    if (!stationBetCodes || stationBetCodes.length === 0) {
      return {
        success: false,
        error: 'Không thể phân tách mã cược nhiều đài',
        rawText,
        multiStation: true,
      };
    }

    // Phân tích từng cặp đài-dòng cược
    const analysisResults = stationBetCodes.map((item) => ({
      station: item.station,
      betLines: item.betLines,
      analysis: this.analyzeBetCode(item.betCode),
    }));

    // Kiểm tra xem có ít nhất một mã cược thành công
    const hasSuccessfulCode = analysisResults.some(
      (result) => result.analysis.success
    );

    // Trả về kết quả tích hợp
    return {
      success: hasSuccessfulCode,
      rawText,
      multiStation: true,
      stationBetCodes,
      analysisResults,
    };
  },

  /**
   * Trích xuất các cặp đài-dòng cược từ mã cược nhiều đài
   * @param {string} rawText - Mã cược thô
   * @returns {Array} Danh sách các cặp đài-dòng cược
   */
  extractMultiStationBetCodes(rawText) {
    const lines = rawText
      .trim()
      .split('\n')
      .filter((line) => line.trim() !== '');
    if (lines.length < 2) return null;

    const result = [];
    let currentStation = null;
    let currentBetLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (this.isStationLine(line)) {
        // Nếu đã có station và betLines, lưu lại vào result
        if (currentStation && currentBetLines.length > 0) {
          const betCode = `${currentStation}\n${currentBetLines.join('\n')}`;
          result.push({
            station: currentStation,
            betLines: [...currentBetLines],
            betCode,
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
      const betCode = `${currentStation}\n${currentBetLines.join('\n')}`;
      result.push({
        station: currentStation,
        betLines: [...currentBetLines],
        betCode,
      });
    }

    return result.length > 0 ? result : null;
  },

  /**
   * Kiểm tra nhanh xem một mã cược có hợp lệ không
   * @param {string} text - Mã cược cần kiểm tra
   * @returns {boolean} Kết quả kiểm tra
   */
  isValidBetCode(text) {
    try {
      // Kiểm tra trường hợp nhiều đài
      if (this.isMultiStationBetCode(text)) {
        const stationBetCodes = this.extractMultiStationBetCodes(text);
        if (!stationBetCodes || stationBetCodes.length === 0) return false;

        // Kiểm tra xem có ít nhất một mã cược hợp lệ
        return stationBetCodes.some((item) => {
          const formattedText = formatBetCode(item.betCode);
          const parseResult = parseBetCode(formattedText);
          return parseResult.success;
        });
      }

      // Xử lý bình thường nếu không phải mã cược nhiều đài
      const formattedText = formatBetCode(text);
      const parseResult = parseBetCode(formattedText);

      return parseResult.success;
    } catch (error) {
      return false;
    }
  },

  /**
   * Trích xuất thông tin tóm tắt từ mã cược
   * @param {string} text - Mã cược
   * @returns {object} Thông tin tóm tắt
   */
  extractBetCodeSummary(text) {
    // Kiểm tra trường hợp nhiều đài
    if (this.isMultiStationBetCode(text)) {
      const stationBetCodes = this.extractMultiStationBetCodes(text);
      if (!stationBetCodes || stationBetCodes.length === 0) {
        return {
          isValid: false,
          station: null,
          lineCount: 0,
          stakeAmount: 0,
          potentialWinning: 0,
          multiStation: true,
          stationCount: 0,
        };
      }

      // Tính tổng hợp từ tất cả các đài
      let totalStakeAmount = 0;
      let totalPotentialWinning = 0;
      let totalLineCount = 0;
      let validCodeCount = 0;

      stationBetCodes.forEach((item) => {
        const analysis = this.analyzeBetCode(item.betCode);
        if (analysis.success) {
          validCodeCount++;
          const stakeResult = analysis.calculationResults.stakeResult;
          const prizeResult = analysis.calculationResults.prizeResult;

          totalStakeAmount += stakeResult.success ? stakeResult.totalStake : 0;
          totalPotentialWinning += prizeResult.success
            ? prizeResult.totalPotential
            : 0;
          totalLineCount += analysis.parseResult.lines.length;
        }
      });

      return {
        isValid: validCodeCount > 0,
        multiStation: true,
        stationCount: stationBetCodes.length,
        lineCount: totalLineCount,
        stakeAmount: totalStakeAmount,
        potentialWinning: totalPotentialWinning,
        validCodeCount,
        totalStations: stationBetCodes.length,
      };
    }

    // Xử lý bình thường nếu không phải mã cược nhiều đài
    const analysis = this.analyzeBetCode(text);

    if (!analysis.success) {
      return {
        isValid: false,
        station: null,
        lineCount: 0,
        stakeAmount: 0,
        potentialWinning: 0,
      };
    }

    const { parseResult, calculationResults } = analysis;
    const { stakeResult, prizeResult } = calculationResults;

    return {
      isValid: true,
      station: parseResult.station,
      lineCount: parseResult.lines.length,
      stakeAmount: stakeResult.success ? stakeResult.totalStake : 0,
      potentialWinning: prizeResult.success ? prizeResult.totalPotential : 0,
      lines: parseResult.lines,
    };
  },
};

export default betCodeService;
