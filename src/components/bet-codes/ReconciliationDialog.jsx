// src/components/bet-codes/ReconciliationDialog.jsx
'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StationEntriesGroup } from '@/components/bet-codes/StationEntriesGroup';
import { LotteryResultCard } from '@/components/lottery/LotteryResultCard';
import { formatCurrency } from '@/lib/utils';
import { formatDate } from '@/utils/formatters';
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useServerMutation } from '@/hooks/useServerAction';
import { crawlLatestResults } from '@/app/actions/lottery-results';
import { toast } from 'sonner';

export function ReconciliationDialog({
  isOpen,
  onClose,
  date,
  reconciliationData,
  isLoading,
  onConfirmReconciliation,
  isProcessing,
  results,
  refetchReconciliation,
}) {
  const formattedDate = date ? formatDate(date) : '';

  // Mutation to crawl latest results
  const { mutate: fetchLatestResults, isPending: isFetchingResults } =
    useServerMutation(
      'fetchLatestResults',
      (params) => crawlLatestResults(params.userId, params.date),
      {
        onSuccess: (result) => {
          if (result.data) {
            toast.success(
              `Đã lấy ${result.data.total} kết quả, lưu ${result.data.saved} kết quả mới`
            );

            // Instead of reloading, refetch the reconciliation data
            if (typeof refetchReconciliation === 'function') {
              refetchReconciliation();
            }
          } else {
            toast.error('Không thể lấy kết quả xổ số');
          }
        },
        onError: () => {
          toast.error('Lỗi khi lấy kết quả xổ số');
        },
      }
    );

  const handleFetchResults = () => {
    if (reconciliationData?.date) {
      fetchLatestResults({
        userId: reconciliationData.userId,
        date: reconciliationData.date,
      });
    }
  };

  // Group entries by station for display
  const entriesByStation = {};
  const stationTotals = {};

  if (reconciliationData?.bets) {
    // Only display confirmed bets for reconciliation
    const confirmedBets = reconciliationData.bets.filter(
      (bet) => bet.status === 'confirmed'
    );

    confirmedBets.forEach((entry) => {
      const stationName =
        entry.station?.name ||
        (entry.station_data?.multiStation
          ? `${entry.station_data.count} Đài ${entry.station_data.name}`
          : entry.station_data?.name) ||
        'Không xác định';

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
      stationTotals[stationKey].totalAmount += Number(entry.amount || 0);
      stationTotals[stationKey].totalStake += Number(entry.stake || 0);
      stationTotals[stationKey].count += 1;
    });
  }

  const handleDirectReconciliation = () => {
    if (reconciliationData?.bets) {
      const confirmedBets = reconciliationData.bets.filter(
        (bet) => bet.status === 'confirmed'
      );
      const betIdsToReconcile = confirmedBets.map((bet) => bet.id);

      // console.log(betIdsToReconcile);

      onConfirmReconciliation(betIdsToReconcile);
    }
  };

  // Content based on current state
  let dialogContent;

  if (isLoading) {
    dialogContent = (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-medium">Đang tải dữ liệu đối soát...</p>
      </div>
    );
  } else if (isProcessing) {
    dialogContent = (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-medium">Đang xử lý đối soát...</p>
        <p className="text-sm text-muted-foreground mt-2">
          Vui lòng đợi trong giây lát
        </p>
      </div>
    );
  } else if (results) {
    // Results screen after successful reconciliation
    dialogContent = (
      <div className="space-y-6">
        <div className="flex items-center justify-center">
          <CheckCircle className="h-16 w-16 text-green-500 mr-4" />
          <div>
            <h3 className="text-2xl font-bold">Đối soát thành công</h3>
            <p className="text-muted-foreground">
              Đã xử lý và cập nhật trạng thái các mã cược
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Tổng cược đã xử lý</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{results.processed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Tổng trúng thưởng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(results.totalWinAmount)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Số lượng trúng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {results.winners}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Số lượng không trúng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">
                {results.losers}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  } else if (reconciliationData) {
    // Initial data display
    const { statistics, bets, lotteryResults, date, userId } =
      reconciliationData;
    const confirmedBets = bets.filter((bet) => bet.status === 'confirmed');
    const hasLotteryResults = lotteryResults && lotteryResults.length > 0;

    dialogContent = (
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-primary mr-2" />
            <div>
              <h3 className="text-lg font-medium">
                Đối soát kết quả ngày {formattedDate}
              </h3>
              <p className="text-sm text-muted-foreground">
                Kiểm tra và xác nhận kết quả trúng thưởng
              </p>
            </div>
          </div>
          {!hasLotteryResults && (
            <Badge variant="destructive">
              Chưa có kết quả xổ số cho ngày này
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Thống kê mã cược</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Tổng mã cược</p>
                  <p className="text-2xl font-bold">{statistics.total}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Mã nháp</p>
                  <p className="text-2xl font-bold">{statistics.draft}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Mã đã xác nhận
                  </p>
                  <p className="text-2xl font-bold">{statistics.confirmed}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Tổng tiền đóng
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(statistics.totalStake)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {hasLotteryResults ? (
            <Card className="col-span-1 md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-center">
                  <span>Kết quả xổ số</span>
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                    {lotteryResults.length} đài
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-72">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lotteryResults.map((result) => (
                      <LotteryResultCard key={result.id} result={result} />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card className="col-span-1 md:col-span-2 border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center h-full py-8">
                <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
                <p className="text-lg font-medium text-center">
                  Chưa có kết quả xổ số cho ngày {formattedDate}
                </p>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  Vui lòng lấy kết quả xổ số trước khi thực hiện đối soát
                </p>
                <Button
                  onClick={handleFetchResults}
                  disabled={isFetchingResults}
                  size="lg"
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  {isFetchingResults ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang lấy kết quả...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Lấy kết quả xổ số ngày {formattedDate}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {confirmedBets.length > 0 ? (
          <>
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">
                  Danh sách mã cược cần đối soát ({confirmedBets.length})
                </h4>
              </div>

              <div className="border rounded-md overflow-hidden">
                <div className="overflow-x-auto">
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
                        isSelectable={false}
                      />
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={onClose}>
                Hủy bỏ
              </Button>
              {hasLotteryResults && (
                <Button
                  onClick={handleDirectReconciliation}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    'Tiến hành đối soát'
                  )}
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-8 space-y-2">
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
            <p className="text-lg font-medium">
              Không có mã cược nào đã xác nhận
            </p>
            <p className="text-sm text-muted-foreground">
              Bạn cần xác nhận các mã cược trước khi thực hiện đối soát
            </p>
            <Button variant="outline" onClick={onClose} className="mt-4">
              Đóng
            </Button>
          </div>
        )}
      </div>
    );
  } else {
    // Fallback for no data
    dialogContent = (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
        <p className="text-lg font-medium">Không thể tải dữ liệu đối soát</p>
        <p className="text-sm text-muted-foreground mt-2">
          Vui lòng thử lại sau
        </p>
        <Button variant="outline" onClick={onClose} className="mt-4">
          Đóng
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="flex items-center justify-between">
          <span className="text-lg font-bold">Đối soát mã cược</span>
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-muted-foreground hover:bg-transparent"
          >
            <span className="sr-only">Đóng</span>
          </Button>
        </DialogTitle>
        {dialogContent}
      </DialogContent>
    </Dialog>
  );
}
