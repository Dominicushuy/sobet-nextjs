// src/components/bet-types/BetTypeDetails.jsx
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
import { Calculator, Check, Info, MapPin, Coins } from 'lucide-react';
import { formatRegionName, getPayoutRateLabel } from './utils';
import { renderPayoutRate } from './BetTypeCard';

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
                    {getPayoutRateLabel(key)}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Chi tiết cơ bản */}
          <div className="rounded-lg border p-4">
            <h3 className="text-lg font-semibold mb-4">Thông tin chi tiết</h3>

            <div className="space-y-4">
              {/* Bet rule */}
              <div>
                <div className="text-sm font-medium">Quy tắc cược:</div>
                <div className="mt-1">
                  {Array.isArray(betType.bet_rule) ? (
                    <ul className="list-disc pl-5 space-y-1">
                      {betType.bet_rule.map((rule, idx) => (
                        <li key={idx}>{rule}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{betType.bet_rule}</p>
                  )}
                </div>
              </div>

              {/* Matching method */}
              <div>
                <div className="text-sm font-medium">
                  Phương thức đối chiếu:
                </div>
                <div className="mt-1 p-2 bg-muted rounded-md">
                  {betType.matching_method}
                </div>
              </div>

              {/* Multiplier & Special calculation */}
              <div className="grid grid-cols-2 gap-4">
                {betType.multiplier && (
                  <div>
                    <div className="text-sm font-medium flex items-center">
                      <Calculator className="h-4 w-4 mr-1 text-primary" />
                      Hệ số nhân:
                    </div>
                    <div className="mt-1">
                      <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900 dark:text-amber-300">
                        {betType.multiplier}x
                      </Badge>
                    </div>
                  </div>
                )}

                {betType.special_calc && (
                  <div>
                    <div className="text-sm font-medium flex items-center">
                      <Calculator className="h-4 w-4 mr-1 text-primary" />
                      Tính toán đặc biệt:
                    </div>
                    <div className="mt-1">
                      <Badge variant="outline">
                        {betType.special_calc === 'bridge'
                          ? 'Kiểu đá'
                          : betType.special_calc}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detailed payout rates */}
          <div className="rounded-lg border p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Coins className="h-5 w-5 mr-2 text-primary" />
              Tỷ lệ trả thưởng chi tiết
            </h3>
            <div className="space-y-2">
              {renderPayoutRate(betType.payout_rate)}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Số kết hợp lô */}
          <div className="rounded-lg border p-4">
            <h3 className="text-lg font-semibold mb-4">Số kết hợp lô</h3>
            {renderCombinations(betType.combinations)}
          </div>

          {/* Thông tin miền áp dụng */}
          <div className="rounded-lg border p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
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
          <div className="rounded-lg border p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
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

              <div>
                <p className="text-sm font-medium">Cách đặt cược:</p>
                <div className="mt-1 p-3 bg-blue-50 dark:bg-blue-950 rounded-md text-blue-600 dark:text-blue-400">
                  <code className="font-mono">
                    {betType.aliases?.[0] || betType.name.toLowerCase()}
                    [số tiền]
                  </code>
                  <p className="mt-2">
                    {betType.aliases?.slice(0, 5).join(', ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Các tổ hợp số áp dụng */}
      <div className="rounded-lg border p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
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
