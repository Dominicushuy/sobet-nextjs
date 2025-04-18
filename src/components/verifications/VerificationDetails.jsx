// src/components/verifications/VerificationDetails.jsx
'use client';

import { formatCurrency } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function VerificationDetails({ verification }) {
  // Extract commission settings
  const commissionSettings = verification.commissionSettings || {
    priceRate: 0.8,
    exportPriceRate: 0.74,
    returnPriceRate: 0.95,
  };

  // North region stats
  const northStats = {
    total_stake_amount: verification.total_stake_amount_north || 0,
    total_winning_amount: verification.total_winning_amount_north || 0,
    total_profit_amount: verification.total_profit_amount_north || 0,
    total_cost_amount: verification.total_cost_amount_north || 0,
  };

  // Central region stats
  const centralStats = {
    total_stake_amount: verification.total_stake_amount_central || 0,
    total_winning_amount: verification.total_winning_amount_central || 0,
    total_profit_amount: verification.total_profit_amount_central || 0,
    total_cost_amount: verification.total_cost_amount_central || 0,
  };

  // South region stats
  const southStats = {
    total_stake_amount: verification.total_stake_amount_south || 0,
    total_winning_amount: verification.total_winning_amount_south || 0,
    total_profit_amount: verification.total_profit_amount_south || 0,
    total_cost_amount: verification.total_cost_amount_south || 0,
  };

  return (
    <div className="p-4 bg-muted/20">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-2">
          <TabsTrigger value="general">Tổng quát</TabsTrigger>
          <TabsTrigger value="north">Miền Bắc</TabsTrigger>
          <TabsTrigger value="central">Miền Trung</TabsTrigger>
          <TabsTrigger value="south">Miền Nam</TabsTrigger>
        </TabsList>

        {/* General statistics tab */}
        <TabsContent value="general" className="pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Tỉ lệ nhân cho khách"
              value={`${(commissionSettings.priceRate * 100).toFixed(1)}%`}
            />
            <StatCard
              title="Tỉ lệ nhân khi thu"
              value={`${(commissionSettings.exportPriceRate * 100).toFixed(1)}%`}
            />
            <StatCard
              title="Tỉ lệ hồi khi thu"
              value={`${(commissionSettings.returnPriceRate * 100).toFixed(1)}%`}
            />
            <StatCard
              title="Tổng lãi/lỗ"
              value={formatCurrency(verification.total_profit_amount || 0)}
              isProfit={verification.total_profit_amount >= 0}
            />
          </div>
        </TabsContent>

        {/* North region tab */}
        <TabsContent value="north" className="pt-2">
          <RegionStatistics
            title="Thống kê Miền Bắc"
            stats={northStats}
            commissionSettings={commissionSettings}
          />
        </TabsContent>

        {/* Central region tab */}
        <TabsContent value="central" className="pt-2">
          <RegionStatistics
            title="Thống kê Miền Trung"
            stats={centralStats}
            commissionSettings={commissionSettings}
          />
        </TabsContent>

        {/* South region tab */}
        <TabsContent value="south" className="pt-2">
          <RegionStatistics
            title="Thống kê Miền Nam"
            stats={southStats}
            commissionSettings={commissionSettings}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Statistic Card Component
function StatCard({ title, value, isProfit }) {
  return (
    <div className="bg-card border rounded-lg p-4 shadow-sm">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div
        className={`text-lg font-semibold ${isProfit !== undefined ? (isProfit ? 'text-green-600' : 'text-red-600') : ''}`}
      >
        {value}
      </div>
    </div>
  );
}

// Region Statistics Component
function RegionStatistics({ title, stats, commissionSettings }) {
  const isProfit = stats.total_profit_amount >= 0;
  const profitTitle = isProfit ? 'Lãi' : 'Lỗ';
  const rateTitle = isProfit ? 'Tỉ lệ nhân khi thu' : 'Tỉ lệ hồi khi thu';
  const rateValue = isProfit
    ? commissionSettings.exportPriceRate
    : commissionSettings.returnPriceRate;

  return (
    <div className="space-y-4">
      <h3 className="text-md font-medium">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tổng tiền đóng"
          value={formatCurrency(stats.total_stake_amount || 0)}
        />
        <StatCard
          title="Tổng tiền trúng"
          value={formatCurrency(stats.total_winning_amount || 0)}
        />
        <StatCard
          title={`Tổng ${profitTitle}`}
          value={formatCurrency(Math.abs(stats.total_profit_amount) || 0)}
          isProfit={isProfit}
        />
        <StatCard
          title="Tổng thu/chi phí"
          value={formatCurrency(stats.total_cost_amount || 0)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mt-4">
        <StatCard
          title={rateTitle}
          value={`${(rateValue * 100).toFixed(1)}%`}
        />
        <StatCard
          title="Giá trị thực thu/chi"
          value={formatCurrency(stats.total_cost_amount || 0)}
        />
      </div>
    </div>
  );
}
