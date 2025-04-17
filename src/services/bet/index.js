// src/services/bet/index.js - Fixed permutation handling

import { isStationLine, parseBetCode } from './parser';
import { formatBetCode } from './formatter';
import { calculateStake } from './stakeCalculator';
import { calculatePotentialPrize } from './prizeCalculator';
import { generatePermutations, getDrawDate } from '@/utils/bet';

/**
 * Dịch vụ phân tích và xử lý mã cược
 */
export const betCodeService = {
  /**
   * Phân tích toàn diện một mã cược
   * @param {string} rawText - Mã cược thô
   * @returns {object} Kết quả phân tích
   */
  analyzeBetCode(rawText, betConfig) {
    try {
      // Kiểm tra nếu là trường hợp nhiều đài trong một mã cược
      if (this.isMultiStationBetCode(rawText, betConfig)) {
        return this.analyzeMultiStationBetCode(rawText, betConfig);
      }

      // Chuẩn hóa định dạng
      const formattedText = formatBetCode(rawText, betConfig);
      const isFormatted = formattedText !== rawText;

      // Phân tích mã cược
      const parseResult = parseBetCode(formattedText, betConfig);

      // Format date as ISO string (YYYY-MM-DD)
      const formattedDrawDate = getDrawDate();

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
        parseResult.drawDate = formattedDrawDate;

        // SPECIAL HANDLING for virtual stations
        if (parseResult.station && parseResult.station.isVirtualStation) {
          // Ensure we can process bets for virtual stations
          // Make sure all required properties are available
          parseResult.station.id = null; // Set to null since it doesn't exist in the stations table
        }

        // Check for permutation types and ensure the permutations are generated
        for (const line of parseResult.lines) {
          // First use the isPermutation flag directly from the parser
          const isPermutationType = line.isPermutation;

          // Alternatively, check from BET_CONFIG if not already marked
          if (!isPermutationType) {
            // Check if this line has a permutation bet type from BET_CONFIG
            const betTypeAlias = line.betType?.alias?.toLowerCase();
            const betType = betConfig.betTypes.find((bt) =>
              bt.aliases.some((a) => a.toLowerCase() === betTypeAlias)
            );

            // Determine if this is a permutation type based on config or aliases
            if (
              (betType && betType.is_permutation) ||
              (betTypeAlias &&
                (betTypeAlias.includes('dao') ||
                  betTypeAlias.includes('dxc') ||
                  betTypeAlias === 'xcd'))
            ) {
              line.isPermutation = true;
            }
          }

          // Generate permutations if not already present and this is a permutation type
          if (
            line.isPermutation &&
            (!line.permutations ||
              Object.keys(line.permutations).length === 0) &&
            line.numbers
          ) {
            line.permutations = {};
            for (const number of line.numbers) {
              const perms = generatePermutations(number);
              line.permutations[number] = perms;
            }
          }
        }

        calculationResults.stakeResult = calculateStake(parseResult, betConfig);
        calculationResults.prizeResult = calculatePotentialPrize(
          parseResult,
          betConfig
        );

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
        drawDate: formattedDrawDate,
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
  isMultiStationBetCode(text, betConfig) {
    if (!text || typeof text !== 'string') return false;

    const lines = text
      .trim()
      .split('\n')
      .filter((line) => line.trim() !== '');
    if (lines.length < 2) return false;

    // Đếm số dòng đài
    let stationLineCount = 0;
    for (const line of lines) {
      if (isStationLine(line, betConfig)) {
        stationLineCount++;
        if (stationLineCount >= 2) return true;
      }
    }

    return false;
  },

  /**
   * Phân tích mã cược nhiều đài
   * @param {string} rawText - Mã cược thô
   * @returns {object} Kết quả phân tích
   */
  analyzeMultiStationBetCode(rawText, betConfig) {
    const stationBetCodes = this.extractMultiStationBetCodes(
      rawText,
      betConfig
    );
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
      analysis: this.analyzeBetCode(item.betCode, betConfig),
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
      drawDate: getDrawDate(),
    };
  },

  /**
   * Trích xuất các cặp đài-dòng cược từ mã cược nhiều đài
   * @param {string} rawText - Mã cược thô
   * @returns {Array} Danh sách các cặp đài-dòng cược
   */
  extractMultiStationBetCodes(rawText, betConfig) {
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

      if (isStationLine(line, betConfig)) {
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
};

export default betCodeService;
