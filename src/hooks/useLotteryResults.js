// src/hooks/useLotteryResults.js
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useServerQuery, useServerMutation } from '@/hooks/useServerAction';
import { toast } from 'sonner';
import {
  fetchLotteryResults,
  getLatestResultDate,
  crawlLatestResults,
  canShowUpdateButton,
} from '@/app/actions/lottery-results';

export function useLotteryResults(initialFilters = {}) {
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [filterCriteria, setFilterCriteria] = useState(initialFilters);
  const [filteredData, setFilteredData] = useState([]);

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
    const params = {
      region: selectedRegion,
      stationId: selectedStation,
    };

    // Thêm ngày nếu có
    if (filterCriteria.date) {
      params.date = filterCriteria.date;
    }
    // Hỗ trợ cả date range nếu cần
    else if (filterCriteria.dateRange) {
      if (filterCriteria.dateRange.from) {
        params.from = filterCriteria.dateRange.from;
      }
      if (filterCriteria.dateRange.to) {
        params.to = filterCriteria.dateRange.to;
      }
    }

    return params;
  }, [selectedRegion, selectedStation, filterCriteria]);

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

  // Apply filters to results data
  const applyFilters = useCallback(
    (data = []) => {
      if (!data || data.length === 0) {
        setFilteredData([]);
        return [];
      }

      let filtered = [...data];

      // Apply additional client-side filters if needed
      if (filterCriteria.searchTerm && filterCriteria.searchTerm.trim()) {
        const searchRegex = new RegExp(filterCriteria.searchTerm.trim(), 'i');
        filtered = filtered.filter(
          (item) =>
            searchRegex.test(item.station?.name) ||
            searchRegex.test(item.special_prize?.join(' ')) ||
            searchRegex.test(item.first_prize?.join(' '))
        );
      }

      setFilteredData(filtered);
      return filtered;
    },
    [filterCriteria]
  );

  // Function to refresh filtered data
  const refetchFiltered = useCallback(() => {
    if (resultsData?.data) {
      return applyFilters(resultsData.data);
    }
    return [];
  }, [applyFilters, resultsData?.data]);

  // Update filters
  const updateFilters = useCallback((newFilters) => {
    setFilterCriteria((prev) => {
      const updated = { ...prev, ...newFilters };
      return updated;
    });
  }, []);

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
          // Will trigger refetchFiltered via the useEffect below
        }
      },
      onError: () => {
        toast.error(
          'Lỗi khi lấy kết quả. Vui lòng thử lại hoặc kiểm tra lại quyền truy cập.'
        );
      },
    }
  );

  // Apply filters whenever results or filter criteria change
  useEffect(() => {
    refetchFiltered();
  }, [resultsData?.data, filterCriteria, refetchFiltered]);

  return {
    // Data
    latestDate: latestDateData?.data,
    results: resultsData?.data || [],
    filteredData,
    canShowUpdateButton: canUpdateData?.data || false,
    filterCriteria,

    // Loading states
    isLoadingLatestDate,
    isLoadingResults,
    isCrawling,
    isCheckingUpdatePermission,

    // Actions
    setSelectedRegion,
    setSelectedStation,
    updateFilters,
    crawlResults,
    refetchResults,
    refetchFiltered,
    applyFilters,
  };
}
