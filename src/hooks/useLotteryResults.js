// src/hooks/useLotteryResults.js
'use client';

import { useState, useCallback } from 'react';
import { useServerQuery, useServerMutation } from '@/hooks/useServerAction';
import { toast } from 'sonner';
import {
  fetchLotteryResults,
  getLatestResultDate,
  crawlLatestResults,
} from '@/app/actions/lottery-results';

export function useLotteryResults() {
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);

  // Fetch latest result date
  const { data: latestDateData, isLoading: isLoadingLatestDate } =
    useServerQuery('latestResultDate', () => getLatestResultDate(), {
      onError: (error) => {
        toast.error(`Error fetching latest result date: ${error.message}`);
      },
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
      onError: (error) => {
        toast.error(`Error fetching lottery results: ${error.message}`);
      },
    }
  );

  // Crawl latest results
  const { mutate: crawlResults, isPending: isCrawling } = useServerMutation(
    'crawlResults',
    (userId) => crawlLatestResults(userId),
    {
      onSuccess: (result) => {
        if (result.data) {
          toast.success(
            `Successfully crawled ${result.data.total} results, saved ${result.data.saved} new results`
          );
          refetchResults();
        }
      },
      onError: (error) => {
        toast.error(`Error crawling results: ${error.message}`);
      },
    }
  );

  return {
    // Data
    latestDate: latestDateData?.data,
    results: resultsData?.data || [],

    // Loading states
    isLoadingLatestDate,
    isLoadingResults,
    isCrawling,

    // Actions
    setSelectedRegion,
    setSelectedStation,
    crawlResults,
    refetchResults,
  };
}
