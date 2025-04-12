// src/contexts/ChatContext.jsx
import React, {
  createContext,
  useState,
  useContext,
  useRef,
  useEffect,
} from 'react';
import { useBetCode } from './BetCodeContext';
import betCodeService from '@/services/bet';
import { uid } from 'uid';
import { formatBetCode } from '@/services/bet/formatter';
import { isStationLine, parseBetCode } from '@/services/bet/parser';
import { calculateStake } from '@/services/bet/stakeCalculator';
import { calculatePotentialPrize } from '@/services/bet/prizeCalculator';
import { useBetConfig } from './BetConfigContext';
import {
  validateMultiStationBetCode,
  validateStationAvailability,
} from '@/services/bet/stationValidator';

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const { addDraftCode } = useBetCode();

  // Use dynamic bet config
  const betConfig = useBetConfig();

  // Load from session storage on mount
  useEffect(() => {
    try {
      const savedMessages = sessionStorage.getItem('chatMessages');
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      } else {
        // Add welcome message if no saved messages
        const welcomeMessage = {
          id: Date.now().toString(),
          text: 'Xin chào! Tôi có thể giúp bạn nhập mã cược. Hãy nhập mã cược vào ô bên dưới để bắt đầu.',
          sender: 'bot',
          timestamp: new Date().toISOString(),
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('Error loading messages from session storage:', error);
    }
  }, []);

  // Save to session storage when messages change
  useEffect(() => {
    try {
      sessionStorage.setItem('chatMessages', JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving messages to session storage:', error);
    }
  }, [messages]);

  const addMessage = (text, sender = 'user', additionalProps = {}) => {
    const newMessage = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date().toISOString(),
      ...additionalProps,
    };

    setMessages((prev) => [...prev, newMessage]);

    // If user message, process it
    if (sender === 'user') {
      processUserMessage(text);
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const processUserMessage = async (text) => {
    setIsTyping(true);

    try {
      // Short delay to simulate processing
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Format the bet code first for better parsing
      const formattedBetCode = formatBetCode(text, betConfig);

      // console.log('Formatted bet code:', formattedBetCode);

      // Before standard analysis, check multi-station validation
      const multiLineValidation = validateMultiStationBetCode(
        formattedBetCode,
        betConfig
      );
      if (!multiLineValidation.valid) {
        addMessage(multiLineValidation.message, 'bot', { error: true });
        setIsTyping(false);
        return;
      }

      // Analyze bet code
      const betCodeResult = betCodeService.analyzeBetCode(
        formattedBetCode,
        betConfig
      );

      // console.log('Bet code result:', betCodeResult);

      // Validate station availability if bet code was parsed successfully
      if (
        betCodeResult.success &&
        betCodeResult.parseResult &&
        betCodeResult.parseResult.station
      ) {
        const validation = validateStationAvailability(
          betCodeResult.parseResult.station,
          betConfig
        );
        if (!validation.valid) {
          addMessage(validation.message, 'bot', { error: true });
          setIsTyping(false);
          return;
        }
      }

      // Kiểm tra nếu có nhiều đài trong một mã cược
      const multiStationBetCodes = processMultiStationBetCode(
        formattedBetCode,
        betConfig
      );

      // console.log('multiStationBetCodes:', multiStationBetCodes);

      if (multiStationBetCodes) {
        // Thay đổi logic: phân tích tất cả mã cược trước, chỉ lưu khi không có lỗi
        let successCount = 0;
        let totalStake = 0;
        let totalPotential = 0;
        const failedBetCodes = [];
        const successfulBetCodes = [];

        // THAY ĐỔI: Phân tích tất cả mã cược trước
        for (const item of multiStationBetCodes) {
          const betCodeResult = betCodeService.analyzeBetCode(
            item.betCode,
            betConfig
          );

          if (betCodeResult.success) {
            const stakeAmount =
              betCodeResult.calculationResults.stakeResult?.totalStake || 0;
            const potentialWinning =
              betCodeResult.calculationResults.prizeResult?.totalPotential || 0;

            // Thay vì lưu ngay, thêm vào danh sách thành công để xử lý sau
            successfulBetCodes.push({
              id: uid(),
              station: betCodeResult.parseResult.station,
              lines: betCodeResult.parseResult.lines,
              originalText: item.betCode,
              formattedText:
                betCodeResult.formattedText !== item.betCode
                  ? betCodeResult.formattedText
                  : item.betCode,
              stakeAmount,
              potentialWinning,
              stakeDetails:
                betCodeResult.calculationResults.stakeResult?.details || [],
              prizeDetails:
                betCodeResult.calculationResults.prizeResult?.details || [],
              permutations: betCodeResult.parseResult.permutations || {},
            });

            successCount++;
            totalStake += stakeAmount;
            totalPotential += potentialWinning;
          } else {
            // Collect error information for failed bet codes
            failedBetCodes.push({
              station: item.station,
              betLine: item.betLine,
              originalText: text,
              betCode: item.betCode,
              betCodeResult, // Store the full result for better error analysis
            });
          }
        }

        // THAY ĐỔI: Chỉ lưu khi tất cả mã cược đều hợp lệ
        if (failedBetCodes.length > 0) {
          // Có mã lỗi - không lưu bất kỳ mã nào
          const errorMessage = formatFailedBetCodesMessage(failedBetCodes);
          addMessage(
            `Phát hiện ${failedBetCodes.length} mã cược lỗi. Vui lòng sửa tất cả lỗi trước khi tiếp tục.\n\n${errorMessage}`,
            'bot',
            { error: true }
          );
        } else if (successCount > 0) {
          // Không có lỗi và có mã thành công - lưu tất cả
          // Lưu các mã cược thành công vào hệ thống
          for (const betCode of successfulBetCodes) {
            addDraftCode(betCode);
          }

          // Hiển thị thông báo thành công
          addMessage(
            `Đã xử lý thành công ${successCount} mã cược từ ${multiStationBetCodes.length} dòng.`,
            'bot',
            {
              betCodeInfo: {
                multiStations: true,
                stationCount: new Set(
                  multiStationBetCodes.map((item) => item.station)
                ).size,
                lineCount: successCount,
                totalStake,
                potentialWin: totalPotential,
              },
            }
          );
        } else {
          // Không có mã cược nào thành công
          addMessage(
            'Không có mã cược hợp lệ nào được tìm thấy. Vui lòng kiểm tra lại định dạng của các dòng cược.',
            'bot',
            { error: true }
          );
        }

        setIsTyping(false);
        return;
      }

      // Xử lý khi ở định dạng đã chuẩn hóa
      if (formattedBetCode !== text) {
        // Kiểm tra xem định dạng mới có tách thành nhiều dòng không
        const formattedLines = formattedBetCode.split('\n');
        const originalLines = text.split('\n');

        // Nếu số dòng sau khi định dạng nhiều hơn số dòng ban đầu, có thể đã tách mã cược
        if (formattedLines.length > originalLines.length) {
          // Xử lý tách mã cược
          let successCount = 0;
          const addedCodes = [];
          let totalStake = 0;
          let totalPotential = 0;

          // Đảm bảo dòng đầu tiên là tên đài
          const stationLine = formattedLines[0];

          // Xử lý từng dòng mã cược đã tách
          for (let i = 1; i < formattedLines.length; i++) {
            const betLine = formattedLines[i];
            if (!betLine.trim()) continue;

            // Tạo mã cược hoàn chỉnh với tên đài
            const completeBetCode = `${stationLine}\n${betLine}`;

            // Phân tích mã cược
            const lineResult = betCodeService.analyzeBetCode(
              completeBetCode,
              betConfig
            );

            if (lineResult.success) {
              const codeId = uid();
              const stakeAmount =
                lineResult.calculationResults.stakeResult?.totalStake || 0;
              const potentialWinning =
                lineResult.calculationResults.prizeResult?.totalPotential || 0;

              // Thêm vào danh sách nháp
              addDraftCode({
                id: codeId,
                station: lineResult.parseResult.station,
                lines: lineResult.parseResult.lines,
                originalText: completeBetCode,
                formattedText:
                  lineResult.formattedText !== completeBetCode
                    ? lineResult.formattedText
                    : completeBetCode,
                stakeAmount,
                potentialWinning,
                drawDate:
                  lineResult.drawDate ||
                  (lineResult.parseResult
                    ? lineResult.parseResult.drawDate
                    : null),
                stakeDetails:
                  lineResult.calculationResults.stakeResult?.details || [],
                prizeDetails:
                  lineResult.calculationResults.prizeResult?.details || [],
                autoExpanded: true,
                specialCase: 'multiple_bet_types',
              });

              successCount++;
              totalStake += stakeAmount;
              totalPotential += potentialWinning;
              addedCodes.push({
                id: codeId,
                line: betLine,
                stakeAmount,
                potentialWinning,
              });
            }
          }

          // Hiển thị thông báo thành công cho người dùng
          if (successCount > 0) {
            let message = `Mã cược hợp lệ! Đã tự động tách thành ${successCount} mã cược và thêm vào danh sách.`;
            message += `\n\nMã cược gốc đã được tối ưu định dạng và tách thành ${successCount} mã cược riêng biệt.`;

            addMessage(message, 'bot', {
              betCodeInfo: {
                station: formattedLines[0],
                lineCount: successCount,
                totalStake,
                potentialWin: totalPotential,
                formattedCode: formattedBetCode,
                isAutoExpanded: true,
                specialCasesType: 'multiple_bet_types',
                addedCodes,
              },
            });

            setIsTyping(false);
            return;
          }
        }
      }

      // console.log("'Formatted bet code:", formattedBetCode)

      // Parse the bet code
      const parseResult = parseBetCode(formattedBetCode, betConfig);

      // console.log('Parsed result:', parseResult)

      // Xử lý khi parse result không thành công
      if (!parseResult.success) {
        // Trích xuất thông báo lỗi từ parseResult
        let errorMessage = 'Mã cược không hợp lệ. ';

        // NEW: Handle calculation errors first (more specific)
        if (parseResult.calculationErrors) {
          errorMessage = `Mã cược có lỗi liên quan đến kiểu đặt cược:\n\n${parseResult.calculationErrors}`;
        }
        // NEW: Handle line-specific errors
        else if (parseResult.lineErrors) {
          errorMessage = `Mã cược có lỗi ở các dòng cụ thể:\n\n${parseResult.lineErrors}`;
        }
        // Handle existing errors
        else if (parseResult.errors && parseResult.errors.length > 0) {
          const detailedErrors = parseResult.errors
            .map((err) => err.message || err)
            .join(', ');
          errorMessage += `Chi tiết lỗi: ${detailedErrors}`;
        }

        // Nếu có station nhưng không có dòng cược
        if (
          parseResult.station &&
          (!parseResult.lines || parseResult.lines.length === 0)
        ) {
          errorMessage = `Đã xác định đài ${parseResult.station.name}, nhưng không tìm thấy dòng cược hợp lệ. Vui lòng kiểm tra định dạng mã cược.`;
        }

        // Nếu có lỗi ở các dòng cụ thể
        if (parseResult.lines && parseResult.lines.length > 0) {
          const lineErrors = [];

          parseResult.lines.forEach((line, index) => {
            if (!line.valid && line.error) {
              // Định dạng rõ ràng hơn cho lỗi độ dài không nhất quán
              if (
                line.error.includes(
                  'Tất cả các số trong một dòng cược phải có cùng độ dài'
                )
              ) {
                lineErrors.push(
                  `Dòng ${index + 1}: ${
                    line.error
                  } - Không thể kết hợp các số có độ dài khác nhau (VD: 11 và 222)`
                );
              } else {
                lineErrors.push(`Dòng ${index + 1}: ${line.error}`);
              }
            }
          });

          if (lineErrors.length > 0) {
            errorMessage += `\n\nLỗi cụ thể:\n${lineErrors.join('\n')}`;
          }
        }

        // Hiển thị thông báo lỗi
        addMessage(errorMessage, 'bot', {
          error: true,
          errors: parseResult.errors,
          parseResult: parseResult,
        });

        setIsTyping(false);
        return;
      }

      if (parseResult.success) {
        // Calculate stake and potential prize
        const stakeResult = calculateStake(parseResult, betConfig);
        const prizeResult = calculatePotentialPrize(parseResult, betConfig);

        const totalStake = stakeResult.success ? stakeResult.totalStake : 0;

        const totalPotential = prizeResult.success
          ? prizeResult.totalPotential
          : 0;

        // Phát hiện các trường hợp đặc biệt
        const specialCases = extractSpecialCases(
          formattedBetCode,
          parseResult,
          betConfig
        );

        // THAY ĐỔI: Kiểm tra xem có trường hợp đặc biệt cần tách không
        if (
          specialCases.groupedNumbers.length > 0 ||
          specialCases.multipleBetTypes.length > 0
        ) {
          // CÓ TRƯỜNG HỢP ĐẶC BIỆT -> TỰ ĐỘNG TÁCH

          // Get original station text
          const originalLines = text.split('\n');
          const originalStationText = originalLines[0].trim();

          // Cải tiến: Xử lý trường hợp formatted code có nhiều dòng sau khi tối ưu
          if (formattedBetCode.split('\n').length > originalLines.length) {
            const formattedLines = formattedBetCode.split('\n');
            let successCount = 0;
            let totalStakeAmount = 0;
            let totalPotentialWinAmount = 0;
            const addedCodes = [];

            // Đảm bảo dòng đầu tiên là tên đài
            const stationLine = formattedLines[0];

            for (let i = 1; i < formattedLines.length; i++) {
              const betLine = formattedLines[i].trim();
              if (!betLine) continue;

              // Tạo mã cược hoàn chỉnh với tên đài
              const completeBetCode = `${stationLine}\n${betLine}`;

              // Phân tích mã cược
              const lineResult = betCodeService.analyzeBetCode(
                completeBetCode,
                betConfig
              );

              if (lineResult.success) {
                const codeId = uid();
                const stakeAmount =
                  lineResult.calculationResults.stakeResult?.totalStake || 0;
                const potentialWinning =
                  lineResult.calculationResults.prizeResult?.totalPotential ||
                  0;

                // Thêm vào danh sách nháp
                addDraftCode({
                  id: codeId,
                  station: lineResult.parseResult.station,
                  lines: lineResult.parseResult.lines,
                  originalText: completeBetCode,
                  formattedText:
                    lineResult.formattedText !== completeBetCode
                      ? lineResult.formattedText
                      : completeBetCode,
                  stakeAmount,
                  potentialWinning,
                  stakeDetails:
                    lineResult.calculationResults.stakeResult?.details || [],
                  prizeDetails:
                    lineResult.calculationResults.prizeResult?.details || [],
                  autoExpanded: true,
                  specialCase: specialCases.type,
                });

                successCount++;
                totalStakeAmount += stakeAmount;
                totalPotentialWinAmount += potentialWinning;
                addedCodes.push({
                  id: codeId,
                  line: betLine,
                  stakeAmount,
                  potentialWinning,
                });
              }
            }

            // Thêm thông báo thành công cho người dùng
            if (successCount > 0) {
              let message = `Mã cược hợp lệ! Đã tự động tách thành ${successCount} mã cược và thêm vào danh sách.`;

              // Thêm mô tả chi tiết về loại trường hợp đặc biệt
              if (specialCases.description) {
                message += `\n\n${specialCases.description}.`;
              }

              message +=
                '\n\nMã cược đã được tối ưu định dạng và tách thành các mã cược riêng biệt.';

              // Thêm thông tin về tổng tiền cược và tiềm năng thắng
              addMessage(message, 'bot', {
                betCodeInfo: {
                  station: stationLine,
                  lineCount: successCount,
                  totalStake: totalStakeAmount,
                  potentialWin: totalPotentialWinAmount,
                  formattedCode: formattedBetCode,
                  isAutoExpanded: true,
                  specialCasesType: specialCases.type,
                  addedCodes,
                },
                detailedCalculations: {
                  totalStakeAmount,
                  totalPotentialWinAmount,
                  successfulLines: successCount,
                },
              });

              setIsTyping(false);
              return;
            }
          }

          // Thu thập tất cả các dòng đã tách
          const separateLines = [
            ...specialCases.groupedNumbers.flatMap(
              (group) => group.separateLines
            ),
            ...specialCases.multipleBetTypes.flatMap(
              (betTypes) => betTypes.separateLines
            ),
          ];

          // Thêm từng mã cược đã tách vào hệ thống
          let successCount = 0;
          let totalStakeAmount = 0;
          let totalPotentialWinAmount = 0;
          const addedCodes = [];

          for (let i = 0; i < separateLines.length; i++) {
            const line = separateLines[i];
            // Kiểm tra nếu line đã chứa đài hay chưa
            if (line.includes('\n')) {
              // Line đã có đài
              const separateResult = betCodeService.analyzeBetCode(
                line,
                betConfig
              );

              if (separateResult.success) {
                const codeId = uid();
                const stakeAmount =
                  separateResult.calculationResults.stakeResult?.totalStake ||
                  0;
                const potentialWinning =
                  separateResult.calculationResults.prizeResult
                    ?.totalPotential || 0;

                addDraftCode({
                  id: codeId,
                  station: separateResult.parseResult.station,
                  lines: separateResult.parseResult.lines,
                  originalText: line,
                  formattedText:
                    separateResult.formattedText !== line
                      ? separateResult.formattedText
                      : line,
                  stakeAmount,
                  potentialWinning,
                  stakeDetails:
                    separateResult.calculationResults.stakeResult?.details ||
                    [],
                  prizeDetails:
                    separateResult.calculationResults.prizeResult?.details ||
                    [],
                  autoExpanded: true,
                  specialCase: specialCases.type,
                });

                successCount++;
                totalStakeAmount += stakeAmount;
                totalPotentialWinAmount += potentialWinning;

                // Lưu thông tin mã cược đã thêm
                addedCodes.push({
                  id: codeId,
                  line,
                  stakeAmount,
                  potentialWinning,
                });
              }
            } else {
              // Line chưa có đài, thêm đài vào
              const separateCode = `${originalStationText}\n${line}`;
              const separateResult = betCodeService.analyzeBetCode(
                separateCode,
                betConfig
              );

              if (separateResult.success) {
                const codeId = uid();
                const stakeAmount =
                  separateResult.calculationResults.stakeResult?.totalStake ||
                  0;
                const potentialWinning =
                  separateResult.calculationResults.prizeResult
                    ?.totalPotential || 0;

                addDraftCode({
                  id: codeId,
                  station: separateResult.parseResult.station,
                  lines: separateResult.parseResult.lines,
                  originalText: separateCode,
                  formattedText:
                    separateResult.formattedText !== separateCode
                      ? separateResult.formattedText
                      : separateCode,
                  stakeAmount,
                  potentialWinning,
                  stakeDetails:
                    separateResult.calculationResults.stakeResult?.details ||
                    [],
                  prizeDetails:
                    separateResult.calculationResults.prizeResult?.details ||
                    [],
                  autoExpanded: true,
                  specialCase: specialCases.type,
                });

                successCount++;
                totalStakeAmount += stakeAmount;
                totalPotentialWinAmount += potentialWinning;

                // Lưu thông tin mã cược đã thêm
                addedCodes.push({
                  id: codeId,
                  line,
                  stakeAmount,
                  potentialWinning,
                });
              }
            }
          }

          // Thêm thông báo thành công cho người dùng
          if (successCount > 0) {
            let message = `Mã cược hợp lệ! Đã tự động tách thành ${successCount} mã cược và thêm vào danh sách.`;

            // Thêm mô tả chi tiết về loại trường hợp đặc biệt
            if (specialCases.description) {
              message += `\n\n${specialCases.description}.`;
            }

            if (formattedBetCode !== text) {
              // Đảm bảo định dạng hiển thị cho người dùng là đúng
              const correctedFormat = ensureCorrectBetCodeFormat(
                formattedBetCode,
                betConfig
              );
              message +=
                '\n\nMã cược đã được tối ưu định dạng:\n```\n' +
                correctedFormat +
                '\n```';
            }

            // Thêm thông tin về tổng tiền cược và tiềm năng thắng
            addMessage(message, 'bot', {
              betCodeInfo: {
                station: parseResult.station.name,
                lineCount: successCount,
                totalStake: totalStakeAmount,
                potentialWin: totalPotentialWinAmount,
                formattedCode:
                  formattedBetCode !== text
                    ? ensureCorrectBetCodeFormat(formattedBetCode, betConfig)
                    : null,
                isAutoExpanded: true,
                specialCasesType: specialCases.type,
                addedCodes, // Thêm thông tin các mã cược đã thêm
              },
              detailedCalculations: {
                totalStakeAmount,
                totalPotentialWinAmount,
                separateLines: separateLines.length,
                successfulLines: successCount,
              },
            });
          } else {
            addMessage(
              'Có lỗi xảy ra khi tách mã cược. Vui lòng kiểm tra lại định dạng mã cược.',
              'bot',
              { error: true }
            );
          }
        } else {
          // KHÔNG CÓ TRƯỜNG HỢP ĐẶC BIỆT -> XỬ LÝ BÌNH THƯỜNG

          // Update the multi-line handling (without special cases)
          if (parseResult.lines.length > 1) {
            // Multiple lines - split into individual bet codes

            // Get original station text (first line of input)
            const originalLines = text.split('\n');
            const originalStationText = originalLines[0].trim();

            // For each line, create and add an individual bet code
            for (let i = 0; i < parseResult.lines.length; i++) {
              const line = parseResult.lines[i];

              // Create a new bet code text with just this line
              const singleLineBetCode = `${originalStationText}\n${line.originalLine}`;

              // Analyze this new bet code
              const singleLineResult = betCodeService.analyzeBetCode(
                singleLineBetCode,
                betConfig
              );

              if (singleLineResult.success) {
                addDraftCode({
                  id: uid(),
                  station: singleLineResult.parseResult.station,
                  lines: singleLineResult.parseResult.lines,
                  originalText: singleLineBetCode,
                  formattedText:
                    singleLineResult.formattedText !== singleLineBetCode
                      ? singleLineResult.formattedText
                      : singleLineBetCode,
                  stakeAmount:
                    singleLineResult.calculationResults.stakeResult
                      ?.totalStake || 0,
                  potentialWinning:
                    singleLineResult.calculationResults.prizeResult
                      ?.totalPotential || 0,
                  stakeDetails:
                    singleLineResult.calculationResults.stakeResult?.details ||
                    [],
                  prizeDetails:
                    singleLineResult.calculationResults.prizeResult?.details ||
                    [],
                });
              }
            }
          } else {
            // Single line - keep existing logic
            let message = 'Mã cược hợp lệ! Đã thêm vào danh sách mã cược.';

            if (formattedBetCode !== text) {
              // Đảm bảo định dạng hiển thị cho người dùng là đúng
              const correctedFormat = ensureCorrectBetCodeFormat(
                formattedBetCode,
                betConfig
              );
              message +=
                '\n\nMã cược đã được tối ưu định dạng:\n```\n' +
                correctedFormat +
                '\n```';
            }

            addMessage(message, 'bot', {
              betCodeInfo: {
                station: parseResult.station.name,
                lineCount: parseResult.lines.length,
                totalStake,
                potentialWin: totalPotential,
                formattedCode:
                  formattedBetCode !== text
                    ? ensureCorrectBetCodeFormat(formattedBetCode, betConfig)
                    : null,
              },
              detailedCalculations: {
                stakeDetails: stakeResult.details || [],
                prizeDetails: prizeResult.details || [],
              },
            });

            // Add to draft codes
            addDraftCode({
              station: parseResult.station,
              lines: parseResult.lines,
              originalText: text,
              formattedText:
                formattedBetCode !== text ? formattedBetCode : text,
              stakeAmount: totalStake,
              potentialWinning: totalPotential,
              drawDate: betCodeResult.drawDate || parseResult.drawDate,
              stakeDetails: stakeResult.details || [],
              prizeDetails: prizeResult.details || [],
            });
          }
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      addMessage(
        'Đã xảy ra lỗi khi xử lý mã cược. ' +
          error.message +
          '\n\nVui lòng thử lại với một mã cược khác hoặc kiểm tra định dạng mã cược.',
        'bot',
        {
          error: true,
        }
      );
    } finally {
      setIsTyping(false);
    }
  };

  const addSystemExample = () => {
    const exampleMessage = {
      id: Date.now().toString(),
      text: 'Dưới đây là một số ví dụ về mã cược:\n\n1. Cược đơn giản:\nmb\n25.36.47dd10\n\n\n2. Nhiều kiểu cược:\nvl.ct\n25.36b10\n47.58da5\n\n\n3. Cược nhiều đài:\n2dmn\n123.456.789xc2\n\n\n4. Định dạng đặc biệt:\ntp\n1234.5678da10 (Viết gọn cho 12.34 và 56.78)\n66.88da1.b5 (Đặt cược đá và bao lô cho cùng số)\n\n\n5. Đặt cược nhiều đài trong một lần:\nmb\n763b2\n3dmn\n25.42da1\n2dmn\n28b5\n\n\n**Cấu trúc mã cược:**\n- Đài đặt ở mỗi dòng (vd: mb, vl.ct, 2dmn)\n- Các dòng sau: Số cược + Kiểu cược + Tiền cược\n\nKiểu cược phổ biến:\n- dd: Đầu đuôi\n- b: Bao lô\n- xc: Xỉu chủ\n- dau: Đầu\n- duoi: Đuôi\n- da: Đá',
      sender: 'bot',
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, exampleMessage]);
  };

  const value = {
    messages,
    isTyping,
    addMessage,
    clearMessages,
    addSystemExample,
    messagesEndRef,
    betConfig, // Expose bet config for other components if needed
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

/**
 * Phát hiện các trường hợp đặc biệt trong mã cược
 * @param {string} betCode - Mã cược đầu vào
 * @param {object} parseResult - Kết quả phân tích mã cược
 * @param {object} betConfig - Cấu hình cược từ hook
 * @returns {object} Thông tin về các trường hợp đặc biệt
 */
function extractSpecialCases(betCode, parseResult) {
  const specialCases = {
    groupedNumbers: [],
    multipleBetTypes: [],
    type: null, // Thêm trường để xác định loại cụ thể
    description: '', // Thêm mô tả chi tiết
  };

  if (!parseResult || !parseResult.lines) {
    return specialCases;
  }

  parseResult.lines.forEach((line) => {
    // 1. Kiểm tra số gộp thành nhóm (vd: 1234.5678da1)
    const groupedNumbers = line.originalLine.match(/\d{4,}/g);
    if (groupedNumbers && groupedNumbers.some((num) => num.length % 2 === 0)) {
      const separateLines = [];

      if (line.betType?.alias === 'da' || line.betType?.alias === 'dv') {
        // Xử lý đặc biệt cho kiểu đá (da/dv)
        // Phân tích từng nhóm 4 chữ số thành cặp để đá với nhau
        const pairs = [];

        for (const group of groupedNumbers) {
          if (group.length % 4 === 0) {
            // Tách nhóm 4 chữ số thành các cặp 2 chữ số để đá
            for (let i = 0; i < group.length; i += 4) {
              if (i + 4 <= group.length) {
                const firstPair = group.substring(i, i + 2);
                const secondPair = group.substring(i + 2, i + 4);
                pairs.push(`${firstPair}.${secondPair}`);
              }
            }
          } else if (group.length % 2 === 0) {
            // Tách thành các số 2 chữ số riêng lẻ
            const singleNumbers = [];
            for (let i = 0; i < group.length; i += 2) {
              singleNumbers.push(group.substring(i, i + 2));
            }
            if (singleNumbers.length >= 2) {
              // Tạo cặp từ các số này
              for (let i = 0; i < singleNumbers.length; i += 2) {
                if (i + 1 < singleNumbers.length) {
                  pairs.push(`${singleNumbers[i]}.${singleNumbers[i + 1]}`);
                }
              }
            }
          }
        }

        // Nếu có cặp đá sẵn (nhưng không phải là cặp đá gộp)
        const lineWithoutGroups = line.originalLine
          .split(/[a-zA-Z]/)[0] // Lấy phần trước kiểu cược
          .split('.')
          .filter((part) => !groupedNumbers.includes(part)); // Lọc bỏ các số gộp

        for (const part of lineWithoutGroups) {
          if (part.match(/^\d+\.\d+$/)) {
            // Đây là cặp đá có sẵn
            pairs.push(part);
          }
        }

        // Thêm betType và amount vào mỗi cặp
        const formattedAmount = Math.floor((line.amount || 10000) / 1000);
        const betTypeStr = `${line.betType.alias}${formattedAmount}`;

        // Tạo ra một dòng cược riêng biệt cho mỗi cặp đá
        // Quan trọng: Thêm đài vào mỗi dòng cược
        const stationText = parseResult.station.name || 'mb';

        pairs.forEach((pair) => {
          separateLines.push(`${stationText}\n${pair}${betTypeStr}`);
        });

        // Cập nhật mô tả cho loại này
        if (specialCases.type === null) {
          specialCases.type = 'da_grouped';
          specialCases.description = `Mã đá gộp ${groupedNumbers.join(
            ', '
          )} được tách thành ${pairs.length} cặp đá riêng biệt`;
        }
      } else {
        // Các kiểu cược khác - tách mỗi số 4 chữ số thành hai số 2 chữ số
        const expandedNumbers = [];

        for (const group of groupedNumbers) {
          if (group.length % 2 === 0) {
            for (let i = 0; i < group.length; i += 2) {
              expandedNumbers.push(group.substring(i, i + 2));
            }
          }
        }

        // Tạo lại dòng với tất cả các số đã tách
        const existingNumbers = line.originalLine
          .split(/[a-zA-Z]/)[0]
          .split('.')
          .filter((n) => !groupedNumbers.includes(n));
        const allNumbers = [...existingNumbers, ...expandedNumbers].filter(
          Boolean
        );

        // Thêm betType và amount
        const formattedAmount = Math.floor((line.amount || 10000) / 1000);
        const betTypeStr = `${line.betType.alias}${formattedAmount}`;

        // Không cần tách thành nhiều dòng cho các kiểu cược không phải đá
        separateLines.push(`${allNumbers.join('.')}${betTypeStr}`);

        // Cập nhật mô tả cho loại này
        if (specialCases.type === null) {
          specialCases.type = 'number_grouped';
          specialCases.description = `Số gộp ${groupedNumbers.join(
            ', '
          )} được tách thành các số 2 chữ số riêng biệt`;
        }
      }

      if (separateLines.length > 0) {
        specialCases.groupedNumbers.push({
          originalLine: line.originalLine,
          explanation: `Số ${groupedNumbers.join(
            ', '
          )} sẽ được tách thành các cặp 2 chữ số`,
          separateLines,
        });
      }
    }

    // 2. Kiểm tra nhiều kiểu cược (vd: 23.45.67dd10.dau20.duoi5)
    if (line.additionalBetTypes && line.additionalBetTypes.length > 0) {
      const numbersPart = line.numbers ? line.numbers.join('.') : '';
      const separateLines = [];

      // Tạo dòng cho kiểu cược chính
      const formattedMainAmount = Math.floor((line.amount || 10000) / 1000);
      const mainBetType = `${line.betType.alias}${formattedMainAmount}`;

      // Quan trọng: Thêm đài vào mỗi dòng cược
      const stationText = parseResult.station.name || 'mb';

      // Tạo một dòng cược hoàn chỉnh bao gồm đài
      separateLines.push(`${stationText}\n${numbersPart}${mainBetType}`);

      // Tạo dòng cho mỗi kiểu cược bổ sung
      line.additionalBetTypes.forEach((additionalBet) => {
        const formattedAmount = Math.floor(
          (additionalBet.amount || 10000) / 1000
        );
        const betTypeStr = `${additionalBet.betType.alias}${formattedAmount}`;
        separateLines.push(`${stationText}\n${numbersPart}${betTypeStr}`);
      });

      if (separateLines.length > 0) {
        specialCases.multipleBetTypes.push({
          originalLine: line.originalLine,
          explanation: 'Nhiều kiểu cược sẽ được tách thành dòng riêng biệt',
          separateLines,
        });

        // Cập nhật mô tả cho loại này nếu chưa có type nào được set
        if (specialCases.type === null) {
          const betTypes = [
            line.betType.alias,
            ...line.additionalBetTypes.map((b) => b.betType.alias),
          ];
          specialCases.type = 'multiple_bet_types';
          specialCases.description = `Nhiều kiểu cược (${betTypes.join(
            ', '
          )}) cho cùng dãy số được tách thành các dòng riêng biệt`;
        }
      }
    }
  });

  return specialCases;
}

const processMultiStationBetCode = (text, betConfig) => {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return null;

  const betCodesByStation = [];
  let currentStation = null;
  const uniqueStations = new Set(); // Track unique stations

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Detect if this line is a station line
    if (isStationLine(line, betConfig)) {
      currentStation = line;
      uniqueStations.add(line); // Add to unique stations set
      continue;
    }

    // If we have a station and this is a bet line
    if (currentStation) {
      // Create a new station-betcode pair
      betCodesByStation.push({
        station: currentStation,
        betLine: line,
        betCode: `${currentStation}\n${line}`,
      });
    }
  }

  // Only return result if we have more than one unique station
  return uniqueStations.size > 1 && betCodesByStation.length > 0
    ? betCodesByStation
    : null;
};

const ensureCorrectBetCodeFormat = (betCode, betConfig) => {
  if (!betCode || typeof betCode !== 'string') {
    return betCode;
  }

  const lines = betCode.split('\n');
  if (lines.length <= 1) return betCode;

  // Lấy danh sách alias từ betConfig
  const betTypeAliases = betConfig.betTypes.flatMap((bt) => bt.aliases);

  // Chỉ xử lý các dòng từ dòng thứ 2 trở đi (sau dòng đài)
  for (let i = 1; i < lines.length; i++) {
    let line = lines[i];

    // Loại bỏ dấu chấm trước kiểu cược
    for (const alias of betTypeAliases) {
      const betTypeRegex = new RegExp(`\\.(${alias}\\d*(?:[,.n]\\d+)?)`, 'gi');
      line = line.replace(betTypeRegex, '$1');
    }

    lines[i] = line;
  }

  return lines.join('\n');
};

/**
 * Extracts the most relevant error message from a bet code result with improved logic
 * @param {object} betCodeResult - The result from betCodeService.analyzeBetCode
 * @returns {string} The most relevant error message
 */
function extractMainErrorMessage(betCodeResult) {
  if (!betCodeResult) return 'Lỗi không xác định';

  // Check in order of specificity
  if (betCodeResult.calculationErrors) {
    return betCodeResult.calculationErrors;
  }

  if (betCodeResult.lineErrors) {
    return betCodeResult.lineErrors;
  }

  if (betCodeResult.error) {
    return betCodeResult.error;
  }

  if (betCodeResult.errors && betCodeResult.errors.length > 0) {
    return betCodeResult.errors.map((err) => err.message || err).join(', ');
  }

  if (betCodeResult.parseResult && betCodeResult.parseResult.errors) {
    return betCodeResult.parseResult.errors
      .map((err) => err.message || err)
      .join(', ');
  }

  // Check for specific line errors in parse result
  if (betCodeResult.parseResult && betCodeResult.parseResult.lines) {
    const lineErrors = betCodeResult.parseResult.lines
      .filter((line) => !line.valid && line.error)
      .map((line) => line.error);

    if (lineErrors.length > 0) {
      return lineErrors.join(', ');
    }
  }

  return 'Định dạng mã cược không hợp lệ';
}

/**
 * Format error message for failed bet codes with improved error handling
 * @param {Array} failedBetCodes - Array of failed bet codes with error information
 * @returns {string} Formatted error message
 */
function formatFailedBetCodesMessage(failedBetCodes) {
  if (!failedBetCodes || failedBetCodes.length === 0) {
    return 'Không có mã cược nào bị lỗi.';
  }

  // Helper function to find the original user input line with improved accuracy
  const findOriginalLine = (originalText, betLine) => {
    if (!originalText) return betLine;

    // Extract number patterns from the betLine for matching
    const betNumbers = betLine.match(/\d+/g) || [];
    if (betNumbers.length === 0) return betLine; // Fallback if no numbers

    // Split the original text into lines
    const originalLines = originalText.trim().split('\n');

    // Look for a line with similar number patterns
    let bestMatch = null;
    let bestMatchScore = 0;

    for (const line of originalLines) {
      const lineNumbers = line.match(/\d+/g) || [];
      const matchingNumbers = betNumbers.filter((n) => lineNumbers.includes(n));

      if (matchingNumbers.length > 0) {
        // Score this match by number of matching digits and similarity in length
        const score =
          matchingNumbers.length * 10 +
          (100 - Math.abs(line.length - betLine.length));
        if (score > bestMatchScore) {
          bestMatch = line;
          bestMatchScore = score;
        }
      }
    }

    return bestMatch || betLine;
  };

  // Extract station name with better error handling
  const extractStationName = (item) => {
    if (!item) return 'Không xác định';

    // Handle special case for tp.dong thap
    if (item.betCode && item.betCode.toLowerCase().includes('tp.dong thap')) {
      return 'tp.dong thap';
    }

    if (item.station) return item.station;

    if (
      item.betCodeResult &&
      item.betCodeResult.parseResult &&
      item.betCodeResult.parseResult.station
    ) {
      return item.betCodeResult.parseResult.station.name || 'Không xác định';
    }

    return 'Không xác định';
  };

  // Group errors by type for better presentation
  const errorsByType = {
    numberLengthErrors: [],
    betTypeErrors: [],
    stationErrors: [],
    formatErrors: [],
    otherErrors: [],
  };

  // Categorize each error with improved logic
  failedBetCodes.forEach((item) => {
    const errorMessage = extractMainErrorMessage(item.betCodeResult);
    const stationName = extractStationName(item);

    if (
      errorMessage.includes(
        'Tất cả các số trong một dòng cược phải có cùng độ dài'
      )
    ) {
      errorsByType.numberLengthErrors.push({
        ...item,
        errorMessage,
        stationName,
      });
    } else if (
      errorMessage.includes('Kiểu cược') &&
      (errorMessage.includes('chỉ chấp nhận') ||
        errorMessage.includes('không hỗ trợ'))
    ) {
      errorsByType.betTypeErrors.push({
        ...item,
        errorMessage,
        stationName,
      });
    } else if (
      errorMessage.includes('Không thể xác định đài') ||
      errorMessage.includes('đài không tồn tại') ||
      errorMessage.includes('Không tìm thấy đài')
    ) {
      errorsByType.stationErrors.push({
        ...item,
        errorMessage,
        stationName,
      });
    } else if (item.betCodeResult && !item.betCodeResult.success) {
      errorsByType.formatErrors.push({
        ...item,
        errorMessage,
        stationName,
      });
    } else {
      errorsByType.otherErrors.push({
        ...item,
        errorMessage,
        stationName,
      });
    }
  });

  // Build the message with improved formatting
  let message = `⚠️ ${failedBetCodes.length} mã cược không thể xử lý do lỗi:\n\n`;

  let errorCount = 1;

  // Number length errors
  if (errorsByType.numberLengthErrors.length > 0) {
    message += `📏 **Lỗi độ dài số không nhất quán (${errorsByType.numberLengthErrors.length}):**\n`;
    errorsByType.numberLengthErrors.forEach((error) => {
      // Find original line from original text if available
      const originalLine = findOriginalLine(error.originalText, error.betLine);
      message += `${errorCount++}. Đài: **${
        error.stationName
      }** - \`${originalLine}\`\n   *Các số phải có cùng độ dài (ví dụ: 23.45.67 hoặc 123.456.789)*\n\n`;
    });
  }

  // Bet type errors
  if (errorsByType.betTypeErrors.length > 0) {
    message += `🎮 **Lỗi kiểu cược không hỗ trợ (${errorsByType.betTypeErrors.length}):**\n`;
    errorsByType.betTypeErrors.forEach((error) => {
      const originalLine = findOriginalLine(error.originalText, error.betLine);
      message += `${errorCount++}. Đài: **${
        error.stationName
      }** - \`${originalLine}\`\n   *${error.errorMessage}*\n\n`;
    });
  }

  // Station errors
  if (errorsByType.stationErrors.length > 0) {
    message += `🏢 **Lỗi đài không hợp lệ (${errorsByType.stationErrors.length}):**\n`;
    errorsByType.stationErrors.forEach((error) => {
      const originalLine = findOriginalLine(error.originalText, error.betLine);
      message += `${errorCount++}. \`${originalLine}\`\n   *${
        error.errorMessage
      }*\n\n`;
    });
  }

  // Format errors
  if (errorsByType.formatErrors.length > 0) {
    message += `📝 **Lỗi định dạng (${errorsByType.formatErrors.length}):**\n`;
    errorsByType.formatErrors.forEach((error) => {
      const originalLine = findOriginalLine(error.originalText, error.betLine);
      message += `${errorCount++}. Đài: **${
        error.stationName
      }** - \`${originalLine}\`\n   *${error.errorMessage}*\n\n`;
    });
  }

  // Other errors
  if (errorsByType.otherErrors.length > 0) {
    message += `❓ **Lỗi khác (${errorsByType.otherErrors.length}):**\n`;
    errorsByType.otherErrors.forEach((error) => {
      const originalLine = findOriginalLine(error.originalText, error.betLine);
      message += `${errorCount++}. Đài: **${
        error.stationName
      }** - \`${originalLine}\`\n   *${error.errorMessage}*\n\n`;
    });
  }

  message += 'Vui lòng kiểm tra và sửa lại các mã cược bị lỗi.';
  return message;
}
