// src/hooks/useLotteryResults.js
'use client';

import { useState, useCallback } from 'react';
import { useServerQuery, useServerMutation } from '@/hooks/useServerAction';
import { toast } from 'sonner';
import {
  fetchLotteryResults,
  getLatestResultDate,
  crawlLatestResults,
  canShowUpdateButton,
} from '@/app/actions/lottery-results';

export function useLotteryResults() {
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);

  // Fetch latest result date
  const { data: latestDateData, isLoading: isLoadingLatestDate } =
    useServerQuery('latestResultDate', () => getLatestResultDate(), {
      onError: () => {
        toast.error(
          'Lỗi khi lấy ngày kết quả xổ số mới nhất. Vui lòng thử lại hoặc kiểm tra lại quyền truy cập.'
        );
      },
    });

  // Kiểm tra có thể hiển thị nút cập nhật kết quả không
  const { data: canUpdateData, isLoading: isCheckingUpdatePermission } =
    useServerQuery('canShowUpdateButton', canShowUpdateButton, {
      refetchInterval: 60000, // Kiểm tra lại mỗi phút
    });

  // Fetch results based on filters
  const fetchParams = useCallback(() => {
    return {
      region: selectedRegion,
      stationId: selectedStation,
    };
  }, [selectedRegion, selectedStation]);

  const {
    data: resultsData,
    isLoading: isLoadingResults,
    refetch: refetchResults,
  } = useServerQuery(
    ['lotteryResults', fetchParams()],
    () => fetchLotteryResults(fetchParams()),
    {
      onError: () => {
        toast.error(
          'Lỗi khi lấy kết quả xổ số. Vui lòng thử lại hoặc kiểm tra lại quyền truy cập.'
        );
      },
    }
  );

  // Crawl latest results
  const { mutate: crawlResults, isPending: isCrawling } = useServerMutation(
    'crawlResults',
    (params) => {
      const { userId, date } =
        typeof params === 'object' ? params : { userId: params, date: null };
      return crawlLatestResults(userId, date);
    },
    {
      onSuccess: (result) => {
        if (result.data) {
          toast.success(
            `Đã lấy ${result.data.total} kết quả, lưu ${result.data.saved} kết quả mới`
          );
          refetchResults();
        }
      },
      onError: () => {
        toast.error(
          'Lỗi khi lấy kết quả. Vui lòng thử lại hoặc kiểm tra lại quyền truy cập.'
        );
      },
    }
  );

  return {
    // Data
    latestDate: latestDateData?.data,
    results: resultsData?.data || [],
    canShowUpdateButton: canUpdateData?.data || false,

    // Loading states
    isLoadingLatestDate,
    isLoadingResults,
    isCrawling,
    isCheckingUpdatePermission,

    // Actions
    setSelectedRegion,
    setSelectedStation,
    crawlResults,
    refetchResults,
  };
}
