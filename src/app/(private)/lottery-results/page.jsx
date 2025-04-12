// src/app/(private)/lottery-results/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useLotteryResults } from '@/hooks/useLotteryResults';
import { useServerQuery } from '@/hooks/useServerAction';
import {
  fetchLotteryResults,
  checkResultsExist,
} from '@/app/actions/lottery-results';
import { LotteryResultCard } from '@/components/lottery/LotteryResultCard';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { RefreshCw, CalendarCheck, Filter, Calendar } from 'lucide-react';
import { format, subDays, isBefore, isAfter } from 'date-fns';
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
  const [isAfterDrawTime, setIsAfterDrawTime] = useState(false);

  // 7 ngày gần nhất
  const today = new Date();
  const sevenDaysAgo = subDays(today, 7); // 7 ngày bao gồm ngày hiện tại

  // Check if current time is after draw time (16:30)
  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = currentHour * 60 + currentMinute; // Convert to minutes
      const drawTime = 16 * 60 + 30; // 16:30 in minutes

      setIsAfterDrawTime(currentTime >= drawTime);
    };

    // Check immediately on mount
    checkTime();

    // Set up interval to check every minute
    const intervalId = setInterval(checkTime, 60000);

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

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
      onError: (error) => {
        toast.error(`Lỗi khi lấy kết quả: ${error.message}`);
      },
    }
  );

  // Handle date change với validation
  const handleDateChange = (date) => {
    // Kiểm tra nếu ngày được chọn nằm trong phạm vi cho phép
    if (date && (isBefore(date, sevenDaysAgo) || isAfter(date, today))) {
      toast.error('Chỉ được chọn ngày trong phạm vi 7 ngày gần nhất');
      return;
    }
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

  // Get results from filteredData
  const results = filteredData?.data || [];

  // Group results by region for better organization
  const groupedResults = {};
  if (results && results.length > 0) {
    results.forEach((result) => {
      const regionId = result.station?.region?.id;
      const regionName = result.station?.region?.name || 'Unknown';
      const regionCode = result.station?.region?.code || 'unknown';

      if (!groupedResults[regionId]) {
        groupedResults[regionId] = {
          name: regionName,
          code: regionCode,
          results: [],
        };
      }

      groupedResults[regionId].results.push(result);
    });
  }

  // Sort regions in this order: north, central, south
  const regionOrder = { north: 1, central: 2, south: 3 };
  const sortedGroups = Object.values(groupedResults).sort(
    (a, b) => regionOrder[a.code] - regionOrder[b.code]
  );

  return (
    <div className="space-y-6 container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Kết quả xổ số</h1>
          <p className="text-muted-foreground">
            Xem kết quả xổ số các miền Bắc, Trung, Nam
          </p>
        </div>

        {(isSuperAdmin || isAdmin) && isAfterDrawTime && (
          <Button onClick={handleCrawl} disabled={isCrawling}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isCrawling ? 'animate-spin' : ''}`}
            />
            Cập nhật kết quả mới
          </Button>
        )}
      </div>

      <div className="bg-card rounded-lg p-4 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* DatePicker với giới hạn 7 ngày */}
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
                  fromDate={sevenDaysAgo}
                  toDate={today}
                  disabled={(date) =>
                    isBefore(date, sevenDaysAgo) || isAfter(date, today)
                  }
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

          <div className="flex items-center bg-primary/10 px-4 py-2 rounded-md border border-primary/20">
            <div className="flex items-center">
              <CalendarCheck className="h-5 w-5 text-primary mr-2" />
              <div className="flex flex-col">
                <span className="text-xs text-primary font-medium uppercase">
                  Kết quả ngày
                </span>
                <span className="text-lg font-bold">
                  {selectedDate
                    ? format(selectedDate, 'dd/MM/yyyy')
                    : latestDate
                      ? format(new Date(latestDate), 'dd/MM/yyyy')
                      : 'Đang tải...'}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchFiltered()}
              disabled={isLoadingResults}
              className="ml-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoadingResults ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </div>
      </div>

      {isLoadingResults ? (
        <div className="flex justify-center my-12">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-8">
          {sortedGroups.length > 0 ? (
            sortedGroups.map((group, index) => (
              <div key={index} className="space-y-4">
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold">{group.name}</h2>
                  <Separator className="flex-1" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {group.results.map((result) => (
                    <LotteryResultCard key={result.id} result={result} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-card rounded-lg shadow-sm">
              <Filter className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">
                Không tìm thấy kết quả
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {selectedDate && dateResults?.data === false
                  ? isSuperAdmin || isAdmin
                    ? 'Vui lòng nhấn "Lấy kết quả" để lấy kết quả cho ngày đã chọn.'
                    : 'Chưa có kết quả cho ngày đã chọn. Vui lòng thử chọn ngày khác.'
                  : isSuperAdmin || (isAdmin && isAfterDrawTime)
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
