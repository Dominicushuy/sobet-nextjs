// src/components/verifications/VerificationTable.jsx
'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VerificationDetails } from './VerificationDetails';

export function VerificationTable({ verifications = [] }) {
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (id) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Calculate totals
  const totals = verifications.reduce(
    (acc, verification) => {
      acc.totalBets += verification.total_bet_codes || 0;
      acc.totalWinners += verification.winning_entries || 0;
      acc.totalLosers += verification.losing_entries || 0;
      acc.totalStake += verification.total_stake_amount || 0;
      acc.totalWinning += verification.total_winning_amount || 0;
      acc.totalProfit += verification.total_profit_amount || 0;
      acc.totalCost += verification.total_cost_amount || 0;

      return acc;
    },
    {
      totalBets: 0,
      totalWinners: 0,
      totalLosers: 0,
      totalStake: 0,
      totalWinning: 0,
      totalProfit: 0,
      totalCost: 0,
    }
  );

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Tổng quan đối soát</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">
                Tổng số mã cược
              </div>
              <div className="text-2xl font-bold">{totals.totalBets}</div>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Tổng tiền đặt</div>
              <div className="text-2xl font-bold">
                {formatCurrency(totals.totalStake)}
              </div>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">
                Tổng tiền thắng
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(totals.totalWinning)}
              </div>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Tổng lãi/lỗ</div>
              <div
                className={`text-2xl font-bold ${totals.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {formatCurrency(totals.totalProfit)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verifications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Chi tiết đối soát theo người dùng</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Số mã cược</TableHead>
                  <TableHead>Số mã trúng</TableHead>
                  <TableHead>Số mã không trúng</TableHead>
                  <TableHead>Tiền đóng</TableHead>
                  <TableHead>Tiền trúng</TableHead>
                  <TableHead>Lãi/Lỗ</TableHead>
                  <TableHead>Thu/Chi phí</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verifications.length > 0 ? (
                  verifications.map((verification) => {
                    const isExpanded = expandedRows[verification.id] || false;
                    const profitAmount = verification.total_profit_amount || 0;
                    const costAmount = verification.total_cost_amount || 0;
                    const isProfit = profitAmount >= 0;

                    return (
                      <>
                        <TableRow
                          key={verification.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleRow(verification.id)}
                        >
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 p-0"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">
                            {verification.admin?.full_name || 'Unknown User'}
                          </TableCell>
                          <TableCell>
                            {verification.total_bet_codes || 0}
                          </TableCell>
                          <TableCell>
                            <Badge variant="success" className="font-semibold">
                              {verification.winning_entries || 0}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="destructive"
                              className="font-semibold"
                            >
                              {verification.losing_entries || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(
                              verification.total_stake_amount || 0
                            )}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(
                              verification.total_winning_amount || 0
                            )}
                          </TableCell>
                          <TableCell
                            className={`font-semibold ${isProfit ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {formatCurrency(profitAmount)}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(costAmount)}
                          </TableCell>
                        </TableRow>

                        {/* Expanded details */}
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={9} className="p-0 border-t-0">
                              <VerificationDetails
                                verification={verification}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      Không có dữ liệu đối soát cho ngày này
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
