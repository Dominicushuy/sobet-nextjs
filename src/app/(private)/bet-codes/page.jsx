'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useServerQuery } from '@/hooks/useServerAction';
import { fetchUserBetEntries } from '@/app/actions/bet-entries';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { formatDate } from '@/utils/formatters';
import { getStationName } from '@/utils/displayUtils';

// Import các component đã tạo
import { SearchFilter } from '@/components/bet-codes/SearchFilter';
import { StationEntriesGroup } from '@/components/bet-codes/StationEntriesGroup';
import { EmptyState } from '@/components/bet-codes/EmptyState';
import moment from 'moment';

export default function UserBetCodesPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filteredEntries, setFilteredEntries] = useState([]);

  // Query for bet entries
  const {
    data: betEntriesData,
    isLoading: isLoadingEntries,
    refetch: refetchEntries,
  } = useServerQuery(
    ['userBetEntries', selectedDate],
    () =>
      fetchUserBetEntries({
        date: moment(selectedDate).format('YYYY-MM-DD'),
        searchTerm: null,
      }),
    {
      enabled: !!user?.id,
      onError: (error) => {
        toast.error('Lỗi khi tải mã cược: ' + error.message);
      },
    }
  );

  // Filter bet entries by search term (client-side)
  useEffect(() => {
    if (betEntriesData?.data) {
      if (!searchTerm) {
        setFilteredEntries(betEntriesData.data);
        return;
      }

      const filtered = betEntriesData.data.filter((entry) => {
        // Search in bet entry properties
        return (
          entry.original_text
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          entry.formatted_text
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          entry.bet_type_alias
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          getStationName(entry)
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (Array.isArray(entry.numbers) &&
            entry.numbers.some((num) =>
              num.toLowerCase().includes(searchTerm.toLowerCase())
            ))
        );
      });

      setFilteredEntries(filtered);
    }
  }, [betEntriesData, searchTerm]);

  // Reset filters
  const resetFilters = () => {
    setSelectedDate(null);
    setSearchTerm('');
  };

  // Group entries by station
  const entriesByStation = {};
  const stationTotals = {};

  if (filteredEntries?.length > 0) {
    filteredEntries.forEach((entry) => {
      const stationName = getStationName(entry);
      const stationKey = stationName.replace(/\s+/g, '-').toLowerCase();

      if (!entriesByStation[stationKey]) {
        entriesByStation[stationKey] = {
          name: stationName,
          entries: [],
        };
        stationTotals[stationKey] = {
          totalAmount: 0,
          totalStake: 0,
          count: 0,
        };
      }

      entriesByStation[stationKey].entries.push(entry);
      stationTotals[stationKey].totalAmount += Number(entry.amount) || 0;
      stationTotals[stationKey].totalStake += Number(entry.stake) || 0;
      stationTotals[stationKey].count += 1;
    });
  }

  // Calculate grand totals
  const grandTotals = Object.values(stationTotals).reduce(
    (acc, station) => {
      acc.totalAmount += station.totalAmount;
      acc.totalStake += station.totalStake;
      acc.count += station.count;
      return acc;
    },
    { totalAmount: 0, totalStake: 0, count: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Mã Cược Của Tôi</h1>
          <p className="text-muted-foreground">
            Danh sách mã cược đã đặt trong hệ thống
          </p>
        </div>

        <Button onClick={refetchEntries} disabled={isLoadingEntries}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoadingEntries ? 'animate-spin' : ''}`}
          />
          Làm mới
        </Button>
      </div>

      {/* Filter Card (sử dụng SearchFilter component) */}
      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc</CardTitle>
          <CardDescription>
            Lọc danh sách mã cược theo ngày và từ khóa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SearchFilter
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            onResetFilters={resetFilters}
            onApplyFilters={() => {}}
          />
        </CardContent>
      </Card>

      {/* Status info */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {isLoadingEntries
            ? 'Đang tải dữ liệu...'
            : `Có ${filteredEntries.length} mã cược`}
        </h2>
        {isLoadingEntries && (
          <RefreshCw className="h-5 w-5 animate-spin text-primary" />
        )}
      </div>

      {/* Display bet entries */}
      {isLoadingEntries ? (
        <Card>
          <CardContent className="flex justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : filteredEntries.length > 0 ? (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-xl">Tổng Hợp Mã Cược</CardTitle>
            <CardDescription>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2 py-2 px-3 bg-muted/50 rounded-md border">
                <div className="flex items-center">
                  <span className="text-sm font-semibold mr-2">
                    Tổng số mã cược:
                  </span>
                  <span className="text-sm font-bold text-primary">
                    {grandTotals.count} mã
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-semibold mr-2">
                    Tổng số tiền cược:
                  </span>
                  <span className="text-sm font-bold">
                    {formatCurrency(grandTotals.totalAmount)}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-semibold mr-2">
                    Tổng số tiền đóng:
                  </span>
                  <span className="text-sm font-bold text-orange-500">
                    {formatCurrency(grandTotals.totalStake)}
                  </span>
                </div>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Đài</TableHead>
                    <TableHead>Loại cược</TableHead>
                    <TableHead>Số cược</TableHead>
                    <TableHead>Tiền cược</TableHead>
                    <TableHead>Tiền đóng</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày cược</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <StationEntriesGroup
                    entriesByStation={entriesByStation}
                    stationTotals={stationTotals}
                    userId={user?.id}
                  />
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 py-2 px-6 flex justify-end">
            <div className="text-sm text-muted-foreground">
              Cập nhật lần cuối: {formatDate(new Date())}
            </div>
          </CardFooter>
        </Card>
      ) : (
        <EmptyState
          type="no-entries"
          onAction={resetFilters}
          actionLabel="Xóa bộ lọc"
        />
      )}
    </div>
  );
}
