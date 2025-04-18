'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useServerQuery } from '@/hooks/useServerAction';
import { fetchAdminUsers } from '@/app/actions/bet-entries';
import { fetchUserReconciliationData } from '@/app/actions/reconciliation';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import moment from 'moment';

// Import components
import { FilterCard } from '@/components/shared/FilterCard';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownRight, User, Users } from 'lucide-react';

export default function ReconciliationPage() {
  const { user } = useAuth();
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isInitialized, setIsInitialized] = useState(false);

  // Query for users created by this admin
  const { data: usersData, isLoading: isLoadingUsers } = useServerQuery(
    ['adminUsers', user?.id],
    () => fetchAdminUsers(user?.id),
    {
      enabled: !!user?.id,
      onError: (error) => {
        toast.error('Lỗi khi tải danh sách người dùng: ' + error.message);
      },
    }
  );

  // When users are loaded, select all by default (but only once)
  useEffect(() => {
    if (!isInitialized && usersData?.data && usersData.data.length > 0) {
      setSelectedUserIds(usersData.data.map((user) => user.id));
      setIsInitialized(true);
    }
  }, [usersData?.data, isInitialized]);

  // Query for reconciliation data
  const {
    data: reconciliationData,
    isLoading: isLoadingReconciliation,
    refetch: refetchReconciliation,
  } = useServerQuery(
    ['reconciliationData', JSON.stringify(selectedUserIds), selectedDate],
    () =>
      fetchUserReconciliationData({
        userIds: selectedUserIds,
        date: moment(selectedDate).format('YYYY-MM-DD'),
      }),
    {
      enabled: selectedUserIds.length > 0,
      onError: (error) => {
        toast.error('Lỗi khi tải dữ liệu đối soát: ' + error.message);
      },
    }
  );

  // Reset filters
  const resetFilters = () => {
    setSelectedDate(new Date());
    if (usersData?.data) {
      setSelectedUserIds(usersData.data.map((user) => user.id));
    }
  };

  // Calculate totals across all users
  const calculateTotals = () => {
    if (!reconciliationData?.data || reconciliationData.data.length === 0) {
      return {
        north: createEmptyRegionStats(),
        central: createEmptyRegionStats(),
        south: createEmptyRegionStats(),
        total: createEmptyRegionStats(),
      };
    }

    const totals = {
      north: createEmptyRegionStats(),
      central: createEmptyRegionStats(),
      south: createEmptyRegionStats(),
      total: createEmptyRegionStats(),
    };

    // Sum up all user statistics
    reconciliationData.data.forEach((userData) => {
      ['north', 'central', 'south'].forEach((region) => {
        const regionStats = userData[region];

        totals[region].total_stake_amount += regionStats.total_stake_amount;
        totals[region].total_winning_amount += regionStats.total_winning_amount;
        totals[region].total_profit_amount += regionStats.total_profit_amount;
        totals[region].total_cost_amount += regionStats.total_cost_amount;
        totals[region].total_bet_codes += regionStats.total_bet_codes;
        totals[region].total_bet_codes_winning +=
          regionStats.total_bet_codes_winning;
        totals[region].total_bet_codes_losing +=
          regionStats.total_bet_codes_losing;

        // Also add to totals across all regions
        totals.total.total_stake_amount += regionStats.total_stake_amount;
        totals.total.total_winning_amount += regionStats.total_winning_amount;
        totals.total.total_profit_amount += regionStats.total_profit_amount;
        totals.total.total_cost_amount += regionStats.total_cost_amount;
        totals.total.total_bet_codes += regionStats.total_bet_codes;
        totals.total.total_bet_codes_winning +=
          regionStats.total_bet_codes_winning;
        totals.total.total_bet_codes_losing +=
          regionStats.total_bet_codes_losing;
      });
    });

    return totals;
  };

  function createEmptyRegionStats() {
    return {
      total_stake_amount: 0,
      total_winning_amount: 0,
      total_profit_amount: 0,
      total_cost_amount: 0,
      total_bet_codes: 0,
      total_bet_codes_winning: 0,
      total_bet_codes_losing: 0,
    };
  }

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold">Báo Cáo Đối Soát</h1>
          <p className="text-muted-foreground">
            Báo cáo chi tiết kết quả đối soát của người dùng theo ngày
          </p>
        </div>
      </div>

      {/* Filter Card */}
      <FilterCard
        title="Bộ lọc đối soát"
        description="Lọc báo cáo đối soát theo người dùng và ngày tháng"
        users={usersData?.data || []}
        isLoadingUsers={isLoadingUsers}
        selectedUserIds={selectedUserIds}
        setSelectedUserIds={setSelectedUserIds}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        onRefresh={refetchReconciliation}
        onResetFilters={resetFilters}
        isLoading={isLoadingReconciliation}
      />

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Tổng hợp đối soát
          </CardTitle>
          <CardDescription>
            Tổng kết báo cáo đối soát của tất cả người dùng được chọn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">Tất cả</TabsTrigger>
              <TabsTrigger value="north">Miền Bắc</TabsTrigger>
              <TabsTrigger value="central">Miền Trung</TabsTrigger>
              <TabsTrigger value="south">Miền Nam</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <RegionSummary region={totals.total} title="Tất cả các miền" />
            </TabsContent>

            <TabsContent value="north">
              <RegionSummary region={totals.north} title="Miền Bắc" />
            </TabsContent>

            <TabsContent value="central">
              <RegionSummary region={totals.central} title="Miền Trung" />
            </TabsContent>

            <TabsContent value="south">
              <RegionSummary region={totals.south} title="Miền Nam" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* User Reconciliation Cards */}
      {isLoadingReconciliation ? (
        <div className="flex justify-center py-12">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
            <p className="text-muted-foreground">Đang tải dữ liệu...</p>
          </div>
        </div>
      ) : reconciliationData?.data && reconciliationData.data.length > 0 ? (
        reconciliationData.data.map((userData) => (
          <UserReconciliationCard key={userData.user.id} userData={userData} />
        ))
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-center text-muted-foreground">
              Không có dữ liệu đối soát cho các người dùng đã chọn vào ngày này
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Region Summary Component
function RegionSummary({ region, title }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Tổng tiền đóng</div>
            <div className="text-2xl font-bold mt-1">
              {formatCurrency(region.total_stake_amount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Tổng tiền trúng</div>
            <div className="text-2xl font-bold mt-1">
              {formatCurrency(region.total_winning_amount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Tổng lãi/lỗ</div>
            <div
              className={`text-2xl font-bold mt-1 flex items-center ${region.total_profit_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {region.total_profit_amount >= 0 ? (
                <ArrowUpRight className="mr-1 h-5 w-5" />
              ) : (
                <ArrowDownRight className="mr-1 h-5 w-5" />
              )}
              {formatCurrency(Math.abs(region.total_profit_amount))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">
              Tổng thu/chi phí
            </div>
            <div className="text-2xl font-bold mt-1">
              {formatCurrency(region.total_cost_amount)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Tổng số mã cược</div>
            <div className="text-2xl font-bold mt-1">
              {region.total_bet_codes}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Mã trúng thưởng</div>
            <div className="text-2xl font-bold mt-1 text-green-600">
              {region.total_bet_codes_winning}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Mã không trúng</div>
            <div className="text-2xl font-bold mt-1 text-amber-600">
              {region.total_bet_codes_losing}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// User Reconciliation Card Component
function UserReconciliationCard({ userData }) {
  const hasAnyData = ['north', 'central', 'south'].some(
    (region) => userData[region].total_bet_codes > 0
  );

  if (!hasAnyData) return null;

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>
          {userData.user.full_name || userData.user.username || 'Unknown User'}
        </CardTitle>
        <CardDescription>
          {userData.user.email && (
            <span className="text-sm text-muted-foreground">
              {userData.user.email}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger
              value="north"
              disabled={userData.north.total_bet_codes === 0}
            >
              Miền Bắc
              {userData.north.total_bet_codes > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {userData.north.total_bet_codes}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="central"
              disabled={userData.central.total_bet_codes === 0}
            >
              Miền Trung
              {userData.central.total_bet_codes > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {userData.central.total_bet_codes}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="south"
              disabled={userData.south.total_bet_codes === 0}
            >
              Miền Nam
              {userData.south.total_bet_codes > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {userData.south.total_bet_codes}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <UserRegionSummary
              northStats={userData.north}
              centralStats={userData.central}
              southStats={userData.south}
              commissionSettings={userData.commissionSettings}
            />
          </TabsContent>

          <TabsContent value="north">
            <RegionSummary region={userData.north} title="Miền Bắc" />
            <RegionCommissionInfo
              stats={userData.north}
              commissionSettings={userData.commissionSettings}
            />
          </TabsContent>

          <TabsContent value="central">
            <RegionSummary region={userData.central} title="Miền Trung" />
            <RegionCommissionInfo
              stats={userData.central}
              commissionSettings={userData.commissionSettings}
            />
          </TabsContent>

          <TabsContent value="south">
            <RegionSummary region={userData.south} title="Miền Nam" />
            <RegionCommissionInfo
              stats={userData.south}
              commissionSettings={userData.commissionSettings}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="bg-muted/30 py-2 px-6 flex justify-between">
        <div className="text-sm text-muted-foreground">
          Tỉ lệ nhân cho khách:{' '}
          {(userData.commissionSettings.price_rate * 100).toFixed(1)}%
        </div>
        <div className="text-sm text-muted-foreground">
          Tỉ lệ thu/chi:{' '}
          {userData.north.total_profit_amount +
            userData.central.total_profit_amount +
            userData.south.total_profit_amount >=
          0
            ? (userData.commissionSettings.export_price_rate * 100).toFixed(1) +
              '%'
            : (userData.commissionSettings.return_price_rate * 100).toFixed(1) +
              '%'}
        </div>
      </CardFooter>
    </Card>
  );
}

// User Region Summary Component (combining all regions)
function UserRegionSummary({
  northStats,
  centralStats,
  southStats,
  commissionSettings,
}) {
  // Calculate totals
  const totalStake =
    northStats.total_stake_amount +
    centralStats.total_stake_amount +
    southStats.total_stake_amount;
  const totalWinning =
    northStats.total_winning_amount +
    centralStats.total_winning_amount +
    southStats.total_winning_amount;
  const totalProfit =
    northStats.total_profit_amount +
    centralStats.total_profit_amount +
    southStats.total_profit_amount;
  const totalCost =
    northStats.total_cost_amount +
    centralStats.total_cost_amount +
    southStats.total_cost_amount;
  const totalBets =
    northStats.total_bet_codes +
    centralStats.total_bet_codes +
    southStats.total_bet_codes;
  const totalWinners =
    northStats.total_bet_codes_winning +
    centralStats.total_bet_codes_winning +
    southStats.total_bet_codes_winning;
  const totalLosers =
    northStats.total_bet_codes_losing +
    centralStats.total_bet_codes_losing +
    southStats.total_bet_codes_losing;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Tổng tiền đóng</div>
            <div className="text-2xl font-bold mt-1">
              {formatCurrency(totalStake)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Tổng tiền trúng</div>
            <div className="text-2xl font-bold mt-1">
              {formatCurrency(totalWinning)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Tổng lãi/lỗ</div>
            <div
              className={`text-2xl font-bold mt-1 flex items-center ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {totalProfit >= 0 ? (
                <ArrowUpRight className="mr-1 h-5 w-5" />
              ) : (
                <ArrowDownRight className="mr-1 h-5 w-5" />
              )}
              {formatCurrency(Math.abs(totalProfit))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">
              Tổng thu/chi phí
            </div>
            <div className="text-2xl font-bold mt-1">
              {formatCurrency(totalCost)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Tổng số mã cược</div>
            <div className="text-2xl font-bold mt-1">{totalBets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Mã trúng thưởng</div>
            <div className="text-2xl font-bold mt-1 text-green-600">
              {totalWinners}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Mã không trúng</div>
            <div className="text-2xl font-bold mt-1 text-amber-600">
              {totalLosers}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Chi tiết theo miền</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RegionCard
            title="Miền Bắc"
            stats={northStats}
            commissionSettings={commissionSettings}
          />
          <RegionCard
            title="Miền Trung"
            stats={centralStats}
            commissionSettings={commissionSettings}
          />
          <RegionCard
            title="Miền Nam"
            stats={southStats}
            commissionSettings={commissionSettings}
          />
        </div>
      </div>
    </div>
  );
}

// Region Card Component
function RegionCard({ title, stats, commissionSettings }) {
  const hasData = stats.total_bet_codes > 0;

  if (!hasData) {
    return (
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Không có dữ liệu
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-muted-foreground">Tiền đóng</div>
            <div className="text-sm font-semibold">
              {formatCurrency(stats.total_stake_amount)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Tiền trúng</div>
            <div className="text-sm font-semibold">
              {formatCurrency(stats.total_winning_amount)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-muted-foreground">Lãi/Lỗ</div>
            <div
              className={`text-sm font-semibold ${stats.total_profit_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {formatCurrency(stats.total_profit_amount)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Thu/Chi phí</div>
            <div className="text-sm font-semibold">
              {formatCurrency(stats.total_cost_amount)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1">
          <div>
            <div className="text-xs text-muted-foreground">Mã cược</div>
            <div className="text-sm font-semibold">{stats.total_bet_codes}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Trúng</div>
            <div className="text-sm font-semibold text-green-600">
              {stats.total_bet_codes_winning}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Không trúng</div>
            <div className="text-sm font-semibold text-amber-600">
              {stats.total_bet_codes_losing}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Region Commission Info Component
function RegionCommissionInfo({ stats, commissionSettings }) {
  const isProfit = stats.total_profit_amount >= 0;
  const rateToUse = isProfit
    ? commissionSettings.export_price_rate
    : commissionSettings.return_price_rate;

  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {isProfit
              ? 'Thông tin tỉ lệ nhân khi thu'
              : 'Thông tin tỉ lệ hồi khi thu'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Tỉ lệ</div>
              <div className="text-lg font-semibold">
                {(rateToUse * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">
                Công thức tính
              </div>
              <div className="text-lg font-semibold">
                {isProfit ? 'Lãi × tỉ lệ thu' : 'Lỗ × tỉ lệ hồi'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Kết quả tính toán</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">
                {isProfit ? 'Lãi thực tế' : 'Lỗ thực tế'}
              </div>
              <div
                className={`text-lg font-semibold ${isProfit ? 'text-green-600' : 'text-red-600'}`}
              >
                {formatCurrency(Math.abs(stats.total_profit_amount))}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">
                {isProfit ? 'Số tiền thu' : 'Số tiền chi'}
              </div>
              <div className="text-lg font-semibold">
                {formatCurrency(Math.abs(stats.total_cost_amount))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
