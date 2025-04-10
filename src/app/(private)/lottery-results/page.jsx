// src/app/(private)/lottery-results/page.jsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useLotteryResults } from '@/hooks/useLotteryResults';
import { useServerQuery } from '@/hooks/useServerAction';
import {
  fetchLotteryResults,
  checkResultsExist,
} from '@/app/actions/lottery-results';
import { LotteryResultTable } from '@/components/lottery/LotteryResultTable';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { RefreshCw, CalendarCheck, Filter, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export default function LotteryResultsPage() {
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const [selectedDate, setSelectedDate] = useState(null);
  const [results, setResults] = useState([]);

  // Fetch base lottery results data
  const { latestDate, isCrawling, crawlResults } = useLotteryResults();

  // Check if the selected date has results
  const { data: dateResults, isLoading: isCheckingDate } = useServerQuery(
    [
      'dateHasResults',
      selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
    ],
    () =>
      selectedDate
        ? checkResultsExist(format(selectedDate, 'yyyy-MM-dd'))
        : { data: true, error: null },
    {
      enabled: !!selectedDate,
      onError: (error) => {
        toast.error(`Error checking date results: ${error.message}`);
      },
    }
  );

  // Fetch results by date only (no region or station filter)
  const {
    data: filteredData,
    isLoading: isLoadingResults,
    refetch: refetchFiltered,
  } = useServerQuery(
    [
      'filteredResults',
      {
        date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
      },
    ],
    () =>
      fetchLotteryResults({
        date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
      }),
    {
      onSuccess: (result) => {
        if (result.data) {
          setResults(result.data);
        }
      },
      onError: (error) => {
        toast.error(`Lỗi khi lấy kết quả: ${error.message}`);
      },
    }
  );

  console.log('Filtered Results:', filteredData);

  // Handle date change
  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  // Handle crawl for latest results
  const handleCrawl = () => {
    if (user?.id) {
      crawlResults(user.id);
    }
  };

  // Handle crawl for specific date
  const handleCrawlForDate = () => {
    if (user?.id && selectedDate) {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      toast.info(
        `Đang lấy kết quả cho ngày ${format(selectedDate, 'dd/MM/yyyy')}`
      );
      crawlResults({
        userId: user.id,
        date: formattedDate,
      });
      setTimeout(() => {
        refetchFiltered();
      }, 2000);
    }
  };

  // Group results by region for better organization
  const groupedResults = {};
  if (results && results.length > 0) {
    results.forEach((result) => {
      const regionId = result.station?.region?.id;
      const regionName = result.station?.region?.name || 'Unknown';

      if (!groupedResults[regionId]) {
        groupedResults[regionId] = {
          name: regionName,
          results: [],
        };
      }

      groupedResults[regionId].results.push(result);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Kết quả xổ số</h1>
          <p className="text-muted-foreground">
            Xem kết quả xổ số các miền Bắc, Trung, Nam
          </p>
        </div>

        {(isSuperAdmin || isAdmin) && (
          <div className="flex space-x-2">
            <Button onClick={handleCrawl} disabled={isCrawling}>
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isCrawling ? 'animate-spin' : ''}`}
              />
              Cập nhật kết quả mới
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* DatePicker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full md:w-[240px] justify-start text-left font-normal"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, 'PPP', { locale: vi })
                ) : (
                  <span>Chọn ngày xem kết quả</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={handleDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Crawl button for specific date */}
          {(isSuperAdmin || isAdmin) &&
            selectedDate &&
            dateResults?.data === false && (
              <Button
                onClick={handleCrawlForDate}
                disabled={isCrawling || isCheckingDate}
                variant="secondary"
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${isCrawling ? 'animate-spin' : ''}`}
                />
                Lấy kết quả ngày{' '}
                {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : ''}
              </Button>
            )}
        </div>

        <div className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Kết quả ngày:{' '}
            {selectedDate
              ? format(selectedDate, 'dd/MM/yyyy')
              : latestDate
                ? new Date(latestDate).toLocaleDateString()
                : ''}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetchFiltered()}
            disabled={isLoadingResults}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoadingResults ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
      </div>

      <Separator />

      {isLoadingResults ? (
        <div className="flex justify-center my-12">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-8">
          {Object.values(groupedResults).length > 0 ? (
            Object.values(groupedResults).map((group, index) => (
              <div key={index} className="space-y-4">
                <h2 className="text-xl font-bold border-b pb-2">
                  {group.name}
                </h2>
                <div className="grid gap-6">
                  {group.results.map((result) => (
                    <LotteryResultTable key={result.id} result={result} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <Filter className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">
                Không tìm thấy kết quả
              </h3>
              <p className="text-muted-foreground">
                {selectedDate && dateResults?.data === false
                  ? isSuperAdmin || isAdmin
                    ? 'Vui lòng nhấn "Lấy kết quả" để lấy kết quả cho ngày đã chọn.'
                    : 'Chưa có kết quả cho ngày đã chọn. Vui lòng thử chọn ngày khác.'
                  : isSuperAdmin || isAdmin
                    ? 'Vui lòng nhấn "Cập nhật kết quả mới" để lấy kết quả mới nhất.'
                    : 'Chưa có kết quả cho ngày hôm nay. Vui lòng thử lại sau.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
