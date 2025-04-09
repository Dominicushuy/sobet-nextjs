// src/components/bet-types/BetTypeCard.jsx

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Info,
  Coins,
  MapPin,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Edit3,
  Calculator,
  Power,
  PowerOff,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  formatRegionName,
  getBetTypeDescription,
  getBetTypeExample,
  getPayoutRateLabel,
} from './utils';

// Render payout rate
export const renderPayoutRate = (payoutRate, multiplier = 1) => {
  if (!payoutRate) return <span className="text-muted-foreground">-</span>;

  try {
    if (typeof payoutRate === 'number') {
      return (
        <div>
          <span className="text-lg font-semibold text-green-600 dark:text-green-400">
            1 ăn {payoutRate}
          </span>
          {multiplier !== 1 && (
            <span className="ml-2 text-sm text-amber-600 dark:text-amber-400">
              (x{multiplier} = {payoutRate * multiplier})
            </span>
          )}
        </div>
      );
    } else if (typeof payoutRate === 'object') {
      return (
        <div className="space-y-1">
          {Object.entries(payoutRate).map(([key, value], index) => (
            <div key={index} className="flex justify-between text-sm">
              <span>{getPayoutRateLabel(key)}:</span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                1 ăn {value}
                {multiplier !== 1 && (
                  <span className="ml-1 text-amber-600 dark:text-amber-400">
                    (x{multiplier} = {value * multiplier})
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return (
      <pre className="text-xs font-mono bg-muted p-2 rounded-md overflow-x-auto">
        {JSON.stringify(payoutRate, null, 2)}
      </pre>
    );
  } catch (e) {
    return <span>{String(payoutRate)}</span>;
  }
};

const BetTypeCard = ({
  betType,
  isSuperAdmin = false,
  onToggleExpand,
  isExpanded,
  onEdit,
  onToggleStatus,
}) => {
  return (
    <Card className="w-full mb-4 hover:bg-muted/20 transition-colors">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row">
          {/* Left: Expand button and name */}
          <div className="flex items-start md:w-1/4">
            <div className="flex items-center">
              <button
                onClick={() => onToggleExpand && onToggleExpand(betType.id)}
                className="mr-2 p-1 hover:bg-muted rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </button>
              <div>
                <h3 className="text-lg font-bold line-clamp-1">
                  {betType.name}
                </h3>
                <div className="text-sm text-muted-foreground line-clamp-1">
                  {betType.aliases && betType.aliases.length > 0
                    ? betType.aliases.join(', ')
                    : '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Middle: Description and regions */}
          <div className="md:w-2/4 mt-2 md:mt-0">
            <div className="flex flex-col md:flex-row gap-2 md:gap-4">
              {/* Description */}
              <div className="md:w-3/5">
                <div className="text-sm font-medium flex items-center">
                  <Info className="h-4 w-4 mr-1 text-primary" />
                  Mô tả
                </div>
                <div className="text-sm line-clamp-2">
                  {getBetTypeDescription(betType)}
                </div>
              </div>

              {/* Regions */}
              <div className="md:w-2/5">
                <div className="text-sm font-medium flex items-center">
                  <MapPin className="h-4 w-4 mr-1 text-primary" />
                  Áp dụng
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {betType.applicable_regions &&
                    betType.applicable_regions.map((region) => (
                      <Badge key={region} variant="outline" className="text-xs">
                        {formatRegionName(region)}
                      </Badge>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Payout rates and actions */}
          <div className="md:w-1/4 mt-2 md:mt-0 flex justify-between items-start">
            <div>
              <div className="text-sm font-medium flex items-center">
                <Coins className="h-4 w-4 mr-1 text-primary" />
                Tỷ lệ trả thưởng
              </div>
              <div className="text-sm">
                {typeof betType.payout_rate === 'number' ? (
                  <Badge className="mt-1 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-300">
                    1 ăn {betType.payout_rate}
                    {betType.multiplier && betType.multiplier !== 1 && (
                      <span className="ml-1">x{betType.multiplier}</span>
                    )}
                  </Badge>
                ) : (
                  <Badge className="mt-1" variant="outline">
                    Chi tiết
                  </Badge>
                )}
              </div>
              {betType.custom_payout_rate ? (
                <Badge variant="secondary" className="mt-1 text-xs">
                  Tùy chỉnh
                </Badge>
              ) : null}
            </div>

            {/* Status badge and actions - only for SuperAdmin */}
            <div className="flex flex-col items-end">
              <Badge
                variant={betType.is_active ? 'default' : 'destructive'}
                className="mb-2"
              >
                {betType.is_active ? 'Hoạt động' : 'Vô hiệu hóa'}
              </Badge>

              {isSuperAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Mở menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Tùy chọn</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onEdit && onEdit(betType)}>
                      <Edit3 className="mr-2 h-4 w-4" />
                      Chỉnh sửa
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onToggleStatus && onToggleStatus(betType)}
                    >
                      {betType.is_active ? (
                        <>
                          <PowerOff className="mr-2 h-4 w-4" />
                          Vô hiệu hóa
                        </>
                      ) : (
                        <>
                          <Power className="mr-2 h-4 w-4" />
                          Kích hoạt
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BetTypeCard;
