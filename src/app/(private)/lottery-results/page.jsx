// src/app/(private)/lottery-results/page.jsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useLotteryResults } from '@/hooks/useLotteryResults';
import { useServerQuery } from '@/hooks/useServerAction';
import { fetchAllStationsData } from '@/app/actions/stations';
import {
  fetchLotteryResults,
  checkResultsExist,
} from '@/app/actions/lottery-results';
import { RegionTabs } from '@/components/lottery/RegionTabs';
import { LotteryResultTable } from '@/components/lottery/LotteryResultTable';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [results, setResults] = useState([]);

  // Fetch base lottery results data
  const { latestDate, isCrawling, crawlResults } = useLotteryResults();

  // Fetch stations data
  const { data: stationsData, isLoading: isLoadingStations } = useServerQuery(
    'stationsData',
    () => fetchAllStationsData(),
    {
      onError: (error) => {
        toast.error(`Error fetching stations data: ${error.message}`);
      },
    }
  );

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

  // Fetch filtered results
  const {
    data: filteredData,
    isLoading: isLoadingResults,
    refetch: refetchFiltered,
  } = useServerQuery(
    [
      'filteredResults',
      {
        region: selectedRegion,
        stationId: selectedStation,
        date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
      },
    ],
    () =>
      fetchLotteryResults({
        region: selectedRegion,
        stationId: selectedStation,
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

  // Filter results when region changes
  const handleRegionChange = (regionId) => {
    const regionIdNum = regionId === 'all' ? null : parseInt(regionId);
    setSelectedRegion(regionIdNum);
    setSelectedStation(null);
  };

  // Filter results when station changes
  const handleStationChange = (stationId) => {
    setSelectedStation(stationId === 'all' ? null : parseInt(stationId));
  };

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

  // Get regions from stations data
  const regions = stationsData?.data?.regions || [];

  // Get stations based on selected region
  const stations = stationsData?.data?.stations || [];
  const filteredStations = selectedRegion
    ? stations.filter((station) => station.region_id === selectedRegion)
    : stations;

  // Check if selected date has results
  const hasResults = !selectedDate || dateResults?.data === true;

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
          <Select onValueChange={handleStationChange} defaultValue="all">
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Chọn đài" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả các đài</SelectItem>
              {filteredStations.map((station) => (
                <SelectItem key={station.id} value={station.id.toString()}>
                  {station.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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

      {isLoadingResults || isLoadingStations ? (
        <div className="flex justify-center my-12">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <RegionTabs
          regions={regions}
          defaultValue="all"
          onChange={handleRegionChange}
        >
          <div className="grid grid-cols-1 gap-8">
            {results && results.length > 0 ? (
              results.map((result) => (
                <LotteryResultTable key={result.id} result={result} />
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
        </RegionTabs>
      )}
    </div>
  );
}
