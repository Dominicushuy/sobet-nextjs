// src/app/(private)/bet-types/page.jsx
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Search, X, RefreshCw, Info, Coins, MapPin } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useServerQuery } from '@/hooks/useServerAction';
import { getUserBetTypeSettings } from '@/app/actions/user-bet-types';
import { fetchAllNumberCombinations } from '@/app/actions/bet-types';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CombinationList from '@/components/bet-types/CombinationList';

export default function BetTypesPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [activeSection, setActiveSection] = useState('bet-types');

  // Fetch bet types for the user
  const { data: betTypesData, isLoading: isLoadingBetTypes } = useServerQuery(
    ['userBetTypes', user?.id],
    () => getUserBetTypeSettings(user?.id),
    {
      enabled: !!user?.id,
      onError: (error) => {
        toast.error('Lỗi khi tải thông tin loại cược: ' + error.message);
      },
    }
  );

  // Fetch number combinations
  const { data: combinationsData, isLoading: isLoadingCombinations } =
    useServerQuery(['numberCombinations'], () => fetchAllNumberCombinations(), {
      enabled: !!user?.id,
      onError: (error) => {
        toast.error('Lỗi khi tải danh sách tổ hợp số: ' + error.message);
      },
    });

  // Filter bet types by search term, active status, and region
  const filteredBetTypes =
    betTypesData?.data?.betTypes?.filter((betType) => {
      // Only show active bet types for the user
      if (!betType.is_active_for_user) return false;

      // Filter by region if a specific region is selected
      if (
        activeTab !== 'all' &&
        !betType.applicable_regions?.includes(activeTab)
      ) {
        return false;
      }

      if (!searchTerm) return true;

      // Search by name
      if (betType.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return true;
      }

      // Search in aliases
      if (betType.aliases && Array.isArray(betType.aliases)) {
        return betType.aliases.some((alias) =>
          alias.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      return false;
    }) || [];

  // Filter number combinations
  const filteredCombinations =
    combinationsData?.data?.filter((combination) => {
      if (!searchTerm) return true;

      // Search by name
      if (combination.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return true;
      }

      // Search in aliases
      if (combination.aliases && Array.isArray(combination.aliases)) {
        return combination.aliases.some((alias) =>
          alias.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      return false;
    }) || [];

  // Reset search
  const resetSearch = () => {
    setSearchTerm('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Loại Cược</h1>
        <p className="text-muted-foreground">
          Danh sách các loại cược và tổ hợp số có sẵn để sử dụng
        </p>
      </div>

      <div className="flex space-x-4">
        <Button
          variant={activeSection === 'bet-types' ? 'default' : 'outline'}
          onClick={() => setActiveSection('bet-types')}
        >
          Loại Cược
        </Button>
        <Button
          variant={activeSection === 'combinations' ? 'default' : 'outline'}
          onClick={() => setActiveSection('combinations')}
        >
          Tổ Hợp Số
        </Button>
      </div>

      {activeSection === 'bet-types' ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Danh sách Loại Cược</CardTitle>
            <CardDescription>
              Xem thông tin chi tiết về các loại cược được kích hoạt
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm loại cược theo tên hoặc bí danh..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {searchTerm && (
                <Button variant="ghost" onClick={resetSearch}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <Tabs
              defaultValue="all"
              value={activeTab}
              onValueChange={setActiveTab}
              className="mb-6"
            >
              <TabsList className="grid grid-cols-4">
                <TabsTrigger value="all">Tất cả</TabsTrigger>
                <TabsTrigger value="north">Miền Bắc</TabsTrigger>
                <TabsTrigger value="central">Miền Trung</TabsTrigger>
                <TabsTrigger value="south">Miền Nam</TabsTrigger>
              </TabsList>
            </Tabs>

            {isLoadingBetTypes ? (
              <div className="flex flex-col items-center justify-center py-10">
                <RefreshCw className="h-6 w-6 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">
                  Đang tải thông tin loại cược...
                </p>
              </div>
            ) : filteredBetTypes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBetTypes.map((betType) => (
                  <Card key={betType.id} className="h-full flex flex-col">
                    <CardHeader className="bg-muted/50 pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">
                          {betType.name}
                        </CardTitle>
                        {betType.custom_payout_rate ? (
                          <Badge variant="secondary">Tỷ lệ tùy chỉnh</Badge>
                        ) : (
                          <Badge variant="outline">Tỷ lệ mặc định</Badge>
                        )}
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
                        <strong>Cách đặt cược:</strong>{' '}
                        {getBetTypeExample(betType)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">
                  {searchTerm
                    ? 'Không tìm thấy loại cược nào khớp với từ khóa tìm kiếm'
                    : 'Không có loại cược nào được kích hoạt'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Danh sách Tổ hợp Số</CardTitle>
            <CardDescription>
              Thông tin về các tổ hợp số có thể sử dụng khi đặt cược
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm tổ hợp số..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {searchTerm && (
                <Button variant="ghost" onClick={resetSearch}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <CombinationList
              isLoading={isLoadingCombinations}
              combinations={filteredCombinations}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Utility functions
function formatRegionName(region) {
  const regionMap = {
    north: 'Miền Bắc',
    central: 'Miền Trung',
    south: 'Miền Nam',
  };
  return regionMap[region] || region;
}

function getBetTypeDescription(betType) {
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
}

function getBetTypeExample(betType) {
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
}

function renderPayoutRate(payoutRate) {
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
}
