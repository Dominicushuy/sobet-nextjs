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
  Settings,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Utility functions
export const formatRegionName = (region) => {
  const regionMap = {
    north: 'Miền Bắc',
    central: 'Miền Trung',
    south: 'Miền Nam',
  };
  return regionMap[region] || region;
};

export const getBetTypeDescription = (betType) => {
  const descriptions = {
    'Đầu Đuôi':
      'Đánh vào 2 chữ số cuối của các lô ở đầu (giải 8/7) và đuôi (giải đặc biệt).',
    'Xỉu chủ': 'Đánh vào 3 chữ số cuối của các lô ở giải 7/6 và giải đặc biệt.',
    Đầu: 'Đánh vào 2 hoặc 3 chữ số cuối của các lô ở giải 8/7 (2 số) hoặc giải 7/6 (3 số).',
    Đuôi: 'Đánh vào 2 hoặc 3 chữ số cuối của giải đặc biệt.',
    'Bao Lô': 'Đánh vào 2, 3 hoặc 4 chữ số cuối của tất cả các lô.',
    'Đảo Bao Lô': 'Tương tự Bao Lô nhưng tính cả hoán vị của các số.',
    'Bao Lô 7':
      'Đánh vào 2 chữ số cuối của 7 lô ở các giải 8, 7, 6, 5 và đặc biệt (chỉ miền Nam/Trung).',
    'Bao Lô 8':
      'Đánh vào 2 chữ số cuối của 8 lô ở các giải 7, 6 và đặc biệt (chỉ miền Bắc).',
    'Bao Lô 7 Đảo': 'Tương tự Bao Lô 7 nhưng tính cả hoán vị.',
    'Bao Lô 8 Đảo': 'Tương tự Bao Lô 8 nhưng tính cả hoán vị.',
    Đá: 'Đánh vào việc ít nhất 2 số trùng với 2 chữ số cuối của các lô.',
    'Đảo Xỉu Chủ':
      'Đánh vào hoán vị của 3 chữ số cuối của các lô ở giải 7/6 và giải đặc biệt.',
    'Đảo Xỉu Chủ Đầu':
      'Đánh vào hoán vị của 3 chữ số cuối của các lô ở giải 7/6.',
    'Đảo Xỉu Chủ Đuôi': 'Đánh vào hoán vị của 3 chữ số cuối của giải đặc biệt.',
    'Nhất To': 'Đánh vào 2, 3 hoặc 4 chữ số cuối của giải nhất (chỉ miền Bắc).',
  };

  return descriptions[betType.name] || 'Không có mô tả.';
};

export const getBetTypeExample = (betType) => {
  const examples = {
    'Đầu Đuôi': 'Ví dụ: 45dd10 - Đánh số 45 kiểu đầu đuôi với 10.000đ',
    'Xỉu chủ': 'Ví dụ: 123xc5 - Đánh số 123 kiểu xỉu chủ với 5.000đ',
    Đầu: 'Ví dụ: 45dau10 - Đánh số 45 kiểu đầu với 10.000đ',
    Đuôi: 'Ví dụ: 45duoi10 - Đánh số 45 kiểu đuôi với 10.000đ',
    'Bao Lô': 'Ví dụ: 45b10 - Đánh số 45 kiểu bao lô với 10.000đ',
    'Đảo Bao Lô': 'Ví dụ: 45daob10 - Đánh số 45 và 54 kiểu bao lô với 10.000đ',
    'Bao Lô 7': 'Ví dụ: 45b7l10 - Đánh số 45 kiểu bao lô 7 với 10.000đ',
    'Bao Lô 8': 'Ví dụ: 45b8l10 - Đánh số 45 kiểu bao lô 8 với 10.000đ',
    'Bao Lô 7 Đảo':
      'Ví dụ: 45b7ld10 - Đánh số 45 và 54 kiểu bao lô 7 với 10.000đ',
    'Bao Lô 8 Đảo':
      'Ví dụ: 45b8ld10 - Đánh số 45 và 54 kiểu bao lô 8 với 10.000đ',
    Đá: 'Ví dụ: 45.67.89da10 - Đánh đá các cặp số 45-67, 45-89, 67-89 với 10.000đ',
    'Đảo Xỉu Chủ':
      'Ví dụ: 123dxc10 - Đánh tất cả hoán vị của 123 kiểu xỉu chủ với 10.000đ',
    'Đảo Xỉu Chủ Đầu':
      'Ví dụ: 123dxcdau10 - Đánh tất cả hoán vị của 123 ở đầu với 10.000đ',
    'Đảo Xỉu Chủ Đuôi':
      'Ví dụ: 123dxcduoi10 - Đánh tất cả hoán vị của 123 ở đuôi với 10.000đ',
    'Nhất To': 'Ví dụ: 45nt10 - Đánh số 45 kiểu nhất to với 10.000đ',
  };

  return examples[betType.name] || 'Không có ví dụ.';
};

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
              <span>{key}:</span>
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
                    <Settings className="mr-2 h-4 w-4" />
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
