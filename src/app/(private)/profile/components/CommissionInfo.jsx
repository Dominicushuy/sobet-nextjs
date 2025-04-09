// src/app/(private)/profile/components/CommissionInfo.jsx
'use client';

import { useServerQuery } from '@/hooks/useServerAction';
import { getUserCommissionSettings } from '@/app/actions/user-commission';
import { RefreshCw } from 'lucide-react';

export default function CommissionInfo({ userId }) {
  // Fetch commission settings
  const { data: commissionData, isLoading } = useServerQuery(
    ['userCommission', userId],
    () => getUserCommissionSettings(userId),
    {
      enabled: !!userId,
    }
  );

  // Format percentage for display
  const formatPercent = (value) => {
    if (!value) return '-';
    return `${(parseFloat(value) * 100).toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2">Đang tải cài đặt...</span>
      </div>
    );
  }

  const commission = commissionData?.data || {
    price_rate: 0.8,
    export_price_rate: 0.74,
    return_price_rate: 0.95,
  };

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
      <div className="bg-card rounded-lg border shadow-sm p-4">
        <div className="text-muted-foreground text-sm">
          Tỉ lệ nhân cho khách
        </div>
        <div className="text-3xl font-semibold mt-2">
          {formatPercent(commission.price_rate)}
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-4">
        <div className="text-muted-foreground text-sm">Tỉ lệ nhân khi thu</div>
        <div className="text-3xl font-semibold mt-2">
          {formatPercent(commission.export_price_rate)}
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-4">
        <div className="text-muted-foreground text-sm">Tỉ lệ hồi khi thu</div>
        <div className="text-3xl font-semibold mt-2">
          {formatPercent(commission.return_price_rate)}
        </div>
      </div>
    </div>
  );
}
