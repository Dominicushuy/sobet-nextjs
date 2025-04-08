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
import { formatRegionName } from '@/components/bet-types/BetTypeCard';

// Render combinations
const renderCombinations = (combinations) => {
  if (!combinations) return <p className="text-muted-foreground">-</p>;

  try {
    if (typeof combinations === 'object') {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {Object.keys(combinations).map((key) => (
                  <th
                    key={key}
                    className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    {key.includes('digits') ? key : formatRegionName(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              <tr>
                {Object.values(combinations).map((value, index) => (
                  <td
                    key={index}
                    className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                  >
                    {typeof value === 'object'
                      ? Object.entries(value).map(([k, v]) => (
                          <div key={k} className="flex justify-between">
                            <span>{formatRegionName(k)}:</span>
                            <span className="font-semibold">{v} lô</span>
                          </div>
                        ))
                      : `${value} lô`}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      );
    }
    return (
      <pre className="text-sm font-mono bg-muted p-2 rounded-md overflow-x-auto">
        {JSON.stringify(combinations, null, 2)}
      </pre>
    );
  } catch (e) {
    return (
      <pre className="text-sm font-mono bg-muted p-2 rounded-md overflow-x-auto">
        {String(combinations)}
      </pre>
    );
  }
};

export default function BetTypeDetails({ betType, combinationsData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Số kết hợp lô */}
        <div className="bg-card rounded-lg border shadow-sm p-4">
          <h3 className="text-lg font-semibold mb-4">Số kết hợp lô</h3>
          {renderCombinations(betType.combinations)}
        </div>

        {/* Thông tin miền áp dụng */}
        <div className="bg-card rounded-lg border shadow-sm p-4">
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

        {/* Thông tin bổ sung */}
        <div className="bg-card rounded-lg border shadow-sm p-4">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <Info className="h-5 w-5 mr-2 text-primary" />
            Thông tin bổ sung
          </h3>
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium">Hoán vị:</p>
              <Badge variant={betType.is_permutation ? 'default' : 'outline'}>
                {betType.is_permutation
                  ? 'Có tính hoán vị'
                  : 'Không tính hoán vị'}
              </Badge>
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
              {(combinationsData?.data || []).filter(
                (combo) =>
                  combo.applicable_bet_types &&
                  Array.isArray(combo.applicable_bet_types) &&
                  (combo.applicable_bet_types.includes(
                    betType.name.toLowerCase()
                  ) ||
                    (betType.aliases &&
                      betType.aliases.some((alias) =>
                        combo.applicable_bet_types.includes(alias.toLowerCase())
                      )))
              ).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    <p className="text-muted-foreground">
                      Không có tổ hợp số nào áp dụng cho loại cược này
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
