// src/app/(private)/admin/bet-types/components/BetTypeDetails.jsx
import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calculator, Check, Coins, Info, MapPin } from 'lucide-react';
import {
  formatRegionName,
  renderCombinations,
  renderPayoutRate,
  getBetTypeDescription,
  getBetTypeExample,
} from './utils';

export default function BetTypeDetails({ betType, combinationsData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Thông tin cơ bản */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card rounded-lg border shadow-sm p-4">
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <Info className="h-5 w-5 mr-2 text-primary" />
              Thông tin chi tiết
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Mô tả:</p>
                <p className="text-sm text-muted-foreground bg-muted p-2 rounded-md">
                  {getBetTypeDescription(betType)}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium">Cách đặt cược:</p>
                <p className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 p-2 rounded-md">
                  {getBetTypeExample(betType)}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium">Phương thức đối chiếu:</p>
                <p className="text-sm text-muted-foreground">
                  {betType.matching_method || '-'}
                </p>
              </div>

              {betType.special_calc && (
                <div>
                  <p className="text-sm font-medium">Tính toán đặc biệt:</p>
                  <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 p-2 rounded-md">
                    {betType.special_calc === 'bridge'
                      ? 'Kiểu đá: Tính dựa trên số cặp số trúng và số lần xuất hiện'
                      : betType.special_calc}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium">Hoán vị:</p>
                <Badge variant={betType.is_permutation ? 'default' : 'outline'}>
                  {betType.is_permutation
                    ? 'Có tính hoán vị'
                    : 'Không tính hoán vị'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border shadow-sm p-4">
            <h3 className="text-lg font-semibold mb-4">Số kết hợp lô</h3>
            {renderCombinations(betType.combinations)}
          </div>
        </div>

        {/* Tỷ lệ trả thưởng */}
        <div>
          <div className="bg-card rounded-lg border shadow-sm p-4">
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <Coins className="h-5 w-5 mr-2 text-primary" />
              Tỷ lệ trả thưởng
            </h3>
            {renderPayoutRate(betType.payout_rate)}
          </div>

          <div className="bg-card rounded-lg border shadow-sm p-4 mt-4">
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-primary" />
              Miền áp dụng
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {['north', 'central', 'south'].map((region) => (
                <div
                  key={region}
                  className={`flex items-center p-2 rounded-md ${
                    betType.applicable_regions?.includes(region)
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Check
                    className={`h-4 w-4 mr-2 ${
                      betType.applicable_regions?.includes(region)
                        ? 'opacity-100'
                        : 'opacity-0'
                    }`}
                  />
                  {formatRegionName(region)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Các tổ hợp số áp dụng */}
      <div className="bg-card rounded-lg border shadow-sm p-4">
        <h3 className="text-lg font-semibold mb-2 flex items-center">
          <Calculator className="h-5 w-5 mr-2 text-primary" />
          Các tổ hợp số áp dụng
        </h3>
        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên tổ hợp</TableHead>
                <TableHead>Bí danh</TableHead>
                <TableHead>Định nghĩa</TableHead>
                <TableHead>Cú pháp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(combinationsData?.data || [])
                .filter(
                  (combo) =>
                    combo.applicable_bet_types &&
                    Array.isArray(combo.applicable_bet_types) &&
                    (combo.applicable_bet_types.includes(
                      betType.name.toLowerCase()
                    ) ||
                      (betType.aliases &&
                        betType.aliases.some((alias) =>
                          combo.applicable_bet_types.includes(
                            alias.toLowerCase()
                          )
                        )))
                )
                .map((combo) => (
                  <TableRow key={combo.id}>
                    <TableCell className="font-medium">{combo.name}</TableCell>
                    <TableCell>
                      {combo.aliases && combo.aliases.length > 0
                        ? combo.aliases.join(', ')
                        : '-'}
                    </TableCell>
                    <TableCell>{combo.definition}</TableCell>
                    <TableCell>
                      <code className="bg-muted px-1.5 py-0.5 rounded text-sm">
                        {combo.syntax}
                      </code>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
