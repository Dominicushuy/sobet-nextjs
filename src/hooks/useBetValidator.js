'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchBetData, submitBetCode } from '@/app/actions/bet-code';
import { parseBetCode } from '@/utils/bet-parser';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';

/**
 * Custom hook to handle bet validation and submission with client-side processing
 */
export function useBetValidator() {
  const { user } = useAuth();
  const [betData, setBetData] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch the necessary data once when the hook initializes
  useEffect(() => {
    const loadBetData = async () => {
      if (!user?.id) return;

      try {
        setIsLoadingData(true);
        const result = await fetchBetData(user.id);

        if (result.error) {
          toast.error(`Lỗi khi tải dữ liệu: ${result.error}`);
        } else {
          setBetData(result.data);
        }
      } catch (error) {
        console.error('Error loading bet data:', error);
        toast.error('Có lỗi xảy ra khi tải dữ liệu');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadBetData();
  }, [user?.id]);

  // Validate bet code on client side
  const validateBetCode = useCallback(
    (betCodeText) => {
      if (!betData) {
        return { data: null, error: 'Dữ liệu cược chưa được tải' };
      }

      const {
        accessibleStations,
        allStations,
        betTypes,
        commissionSettings,
        numberCombinations,
      } = betData;

      return parseBetCode(
        betCodeText,
        allStations,
        accessibleStations,
        betTypes,
        commissionSettings.priceRate,
        numberCombinations
      );
    },
    [betData]
  );

  // Submit validated bet code
  const handleSubmitBetCode = useCallback(
    async (formattedBetCode) => {
      if (!user?.id || !formattedBetCode) {
        return { data: null, error: 'Dữ liệu không hợp lệ' };
      }

      try {
        setIsProcessing(true);
        return await submitBetCode(user.id, formattedBetCode);
      } catch (error) {
        console.error('Error submitting bet code:', error);
        return { data: null, error: 'Lỗi lưu mã cược: ' + error.message };
      } finally {
        setIsProcessing(false);
      }
    },
    [user?.id]
  );

  // Process a new bet code
  const processBetCode = useCallback(
    async (betCodeText) => {
      try {
        setIsProcessing(true);

        // Client-side validation
        const validationResult = validateBetCode(betCodeText);

        if (validationResult.error) {
          return validationResult;
        }

        // Submit validated bet code
        const submitResult = await handleSubmitBetCode(validationResult.data);

        if (submitResult.error) {
          return { data: null, error: submitResult.error };
        }

        return { data: validationResult.data, error: null };
      } catch (error) {
        console.error('Error processing bet code:', error);
        return { data: null, error: 'Lỗi xử lý mã cược: ' + error.message };
      } finally {
        setIsProcessing(false);
      }
    },
    [validateBetCode, handleSubmitBetCode]
  );

  return {
    betData,
    isLoadingData,
    isProcessing,
    validateBetCode,
    processBetCode,
    submitBetCode: handleSubmitBetCode,
  };
}
