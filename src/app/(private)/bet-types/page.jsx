// src/app/(private)/bet-types/page.jsx
'use client';

import { useState, useMemo } from 'react';
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
import { Search, X, RefreshCw } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useServerQuery } from '@/hooks/useServerAction';
import { getUserBetTypeSettings } from '@/app/actions/user-bet-types';
import { fetchAllNumberCombinations } from '@/app/actions/bet-types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Shared components
import BetTypeCard from '@/components/bet-types/BetTypeCard';
import CombinationList from '@/components/bet-types/CombinationList';
import BetTypeDetails from '@/components/bet-types/BetTypeDetails';

export default function BetTypesPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [activeSection, setActiveSection] = useState('bet-types');
  const [expandedBetType, setExpandedBetType] = useState(null);

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
  const filteredBetTypes = useMemo(() => {
    return (
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
      }) || []
    );
  }, [betTypesData, searchTerm, activeTab]);

  // Filter number combinations
  const filteredCombinations = useMemo(() => {
    return (
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
      }) || []
    );
  }, [combinationsData, searchTerm]);

  // Toggle bet type details expansion
  const toggleBetTypeExpansion = (id) => {
    setExpandedBetType(expandedBetType === id ? null : id);
  };

  // Reset search
  const resetSearch = () => {
    setSearchTerm('');
  };

  // Loading spinner
  const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center py-10">
      <RefreshCw className="h-6 w-6 animate-spin text-primary mb-4" />
      <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>
    </div>
  );

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
              <LoadingSpinner />
            ) : filteredBetTypes.length > 0 ? (
              <div className="space-y-4">
                {filteredBetTypes.map((betType) => (
                  <div key={betType.id}>
                    <BetTypeCard
                      betType={betType}
                      isSuperAdmin={false}
                      onToggleExpand={toggleBetTypeExpansion}
                      isExpanded={expandedBetType === betType.id}
                    />
                    {expandedBetType === betType.id && (
                      <Card className="mb-6 mt-0 border-t-0 rounded-t-none">
                        <CardContent className="pt-4">
                          <BetTypeDetails
                            betType={betType}
                            combinationsData={combinationsData}
                          />
                        </CardContent>
                      </Card>
                    )}
                  </div>
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

            {isLoadingCombinations ? (
              <LoadingSpinner />
            ) : (
              <CombinationList
                isLoading={isLoadingCombinations}
                combinations={filteredCombinations}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
