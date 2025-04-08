// src/components/bet-types/BetTypeCard.jsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Info,
  Coins,
  MapPin,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Edit3,
} from '@/components/ui/dropdown-menu';
import {
  formatRegionName,
  getBetTypeDescription,
  getBetTypeExample,
  getPayoutRateLabel,
} from './utils';

export const renderPayoutRate = (payoutRate) => {
  if (!payoutRate) return <span className="text-muted-foreground">-</span>;

  try {
    if (typeof payoutRate === 'number') {
      return (
        <span className="text-lg font-semibold text-green-600 dark:text-green-400">
          1 ăn {payoutRate}
        </span>
      );
    } else if (typeof payoutRate === 'object') {
      return (
        <div className="space-y-1">
          {Object.entries(payoutRate).map(([key, value], index) => (
            <div key={index} className="flex justify-between text-sm">
              <span>{getPayoutRateLabel(key)}:</span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                1 ăn {value}
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
  isAdmin = false,
  onToggleExpand,
  isExpanded,
  onEdit,
  onToggleStatus,
}) => {
  return (
    <Card key={betType.id} className="h-full flex flex-col">
      <CardHeader className="bg-muted/50 pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg flex items-center">
            {isAdmin && (
              <button
                onClick={() => onToggleExpand && onToggleExpand(betType.id)}
                className="mr-2"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
            {betType.name}
          </CardTitle>
          <div className="flex items-center space-x-2">
            {betType.custom_payout_rate ? (
              <Badge variant="secondary">Tỷ lệ tùy chỉnh</Badge>
            ) : (
              <Badge variant="outline">Tỷ lệ mặc định</Badge>
            )}
            {isAdmin && (
              <Badge variant={betType.is_active ? 'default' : 'destructive'}>
                {betType.is_active ? 'Hoạt động' : 'Vô hiệu hóa'}
              </Badge>
            )}
            {isAdmin && (
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
                    <Info className="mr-2 h-4 w-4" />
                    {betType.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          <strong>Bí danh:</strong>{' '}
          {betType.aliases && betType.aliases.length > 0
            ? betType.aliases.join(', ')
            : '-'}
        </div>
      </CardHeader>
      <CardContent className="pt-4 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium flex items-center">
              <Info className="h-4 w-4 mr-2 text-primary" />
              Mô tả:
            </div>
            <div className="text-sm bg-muted p-2 rounded-md mt-1">
              {getBetTypeDescription(betType)}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-primary" />
              Miền áp dụng:
            </div>
            <div className="flex gap-1 mt-1">
              {betType.applicable_regions &&
                betType.applicable_regions.map((region) => (
                  <Badge key={region} variant="outline">
                    {formatRegionName(region)}
                  </Badge>
                ))}
            </div>
          </div>
          <Separator />
          <div>
            <div className="text-sm font-medium flex items-center">
              <Coins className="h-4 w-4 mr-2 text-primary" />
              Tỷ lệ trả thưởng:
            </div>
            <div className="mt-1">
              {renderPayoutRate(
                betType.custom_payout_rate || betType.payout_rate
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 p-2 bg-blue-50 dark:bg-blue-950 rounded-md text-blue-600 dark:text-blue-400 text-sm">
          <strong>Cách đặt cược:</strong> {getBetTypeExample(betType)}
        </div>
      </CardContent>
    </Card>
  );
};

export default BetTypeCard;
