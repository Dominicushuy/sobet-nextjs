// src/components/bet-codes/ReconciliationDialog.jsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BetStatusBadge } from '@/components/bet-codes/BetStatusBadge';
import { StationEntriesGroup } from '@/components/bet-codes/StationEntriesGroup';
import { formatCurrency } from '@/lib/utils';
import { formatDate } from '@/utils/formatters';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export function ReconciliationDialog({
  isOpen,
  onClose,
  date,
  reconciliationData,
  isLoading,
  onConfirmReconciliation,
  isProcessing,
  results,
}) {
  const [confirmStep, setConfirmStep] = useState(false);

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
      stationTotals[stationKey].totalAmount += Number(entry.amount) || 0;
      stationTotals[stationKey].totalStake += Number(entry.stake) || 0;
      stationTotals[stationKey].count += 1;
    });
  }

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
  } else if (confirmStep && reconciliationData) {
    // Confirmation step
    const confirmedBets = reconciliationData.bets.filter(
      (bet) => bet.status === 'confirmed'
    );
    const betIdsToReconcile = confirmedBets.map((bet) => bet.id);

    dialogContent = (
      <div className="space-y-6">
        <div className="flex items-center">
          <AlertTriangle className="h-6 w-6 text-amber-500 mr-2" />
          <div>
            <h3 className="text-lg font-medium">Xác nhận đối soát</h3>
            <p className="text-sm text-muted-foreground">
              Bạn đang thực hiện đối soát {confirmedBets.length} mã cược đã xác
              nhận. Hành động này sẽ cập nhật trạng thái trúng/thua cho các mã
              cược.
            </p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
          <p className="text-amber-800 text-sm">
            Quá trình đối soát sẽ đánh dấu các mã cược là &quot;đã xử lý&quot;
            và không thể hoàn tác. Vui lòng kiểm tra các số liệu bên dưới trước
            khi xác nhận.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Thống kê đối soát</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Tổng số mã cược</p>
                <p className="text-2xl font-bold">{confirmedBets.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Tổng tiền cược</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    confirmedBets.reduce(
                      (sum, bet) => sum + Number(bet.amount || 0),
                      0
                    )
                  )}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Tổng tiền đóng</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    confirmedBets.reduce(
                      (sum, bet) => sum + Number(bet.stake || 0),
                      0
                    )
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6">
          <Button
            className="w-full"
            onClick={() => onConfirmReconciliation(betIdsToReconcile)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              'Xác nhận đối soát'
            )}
          </Button>
        </div>
      </div>
    );
  } else if (reconciliationData) {
    // Initial data display
    const { statistics, bets, lotteryResults, date } = reconciliationData;
    const confirmedBets = bets.filter((bet) => bet.status === 'confirmed');
    const hasLotteryResults = lotteryResults && lotteryResults.length > 0;

    dialogContent = (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">
              Đối soát kết quả ngày {formatDate(date)}
            </h3>
            <p className="text-sm text-muted-foreground">
              Kiểm tra và xác nhận kết quả trúng thưởng
            </p>
          </div>
          {!hasLotteryResults && (
            <Badge variant="destructive">
              Chưa có kết quả xổ số cho ngày này
            </Badge>
          )}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Thống kê mã cược</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Tổng mã cược</p>
                <p className="text-2xl font-bold">{statistics.total}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Mã nháp</p>
                <p className="text-2xl font-bold">{statistics.draft}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Mã đã xác nhận</p>
                <p className="text-2xl font-bold">{statistics.confirmed}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Tổng tiền đóng</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(statistics.totalStake)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {hasLotteryResults ? (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Kết quả xổ số</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <div className="max-h-48 overflow-y-auto border rounded-md p-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Đài</TableHead>
                          <TableHead>Giải ĐB</TableHead>
                          <TableHead>Giải Nhất</TableHead>
                          <TableHead>Ngày xổ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lotteryResults.map((result) => (
                          <TableRow key={result.id}>
                            <TableCell className="font-medium">
                              {result.station?.name || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {result.special_prize?.map((num, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="mr-1"
                                >
                                  {num}
                                </Badge>
                              ))}
                            </TableCell>
                            <TableCell>
                              {result.first_prize?.map((num, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="mr-1"
                                >
                                  {num}
                                </Badge>
                              ))}
                            </TableCell>
                            <TableCell>
                              {formatDate(result.draw_date)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>

            {confirmedBets.length > 0 ? (
              <>
                <div className="mt-4">
                  <h4 className="font-medium mb-2">
                    Danh sách mã cược cần đối soát ({confirmedBets.length})
                  </h4>

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
                  <Button onClick={() => setConfirmStep(true)}>
                    Tiến hành đối soát
                  </Button>
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
          </>
        ) : (
          <div className="text-center py-8 space-y-2">
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
            <p className="text-lg font-medium">
              Chưa có kết quả xổ số cho ngày này
            </p>
            <p className="text-sm text-muted-foreground">
              Bạn cần chờ có kết quả xổ số trước khi thực hiện đối soát
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        {dialogContent}
      </DialogContent>
    </Dialog>
  );
}
