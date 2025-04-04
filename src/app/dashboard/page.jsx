// src/app/dashboard/page.jsx
'use client';

import { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/providers/AuthProvider';
import { FileText, BarChart3, CircleDollarSign, Percent } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useServerQuery } from '@/hooks/useServerAction';
import { fetchBetCodesCount } from '@/app/actions/dashboard';

export default function Dashboard() {
  const { user } = useAuth();

  // Wrapped in useCallback
  const getBetCodesCount = useCallback(async () => {
    if (!user?.id) return { data: 0 };
    return await fetchBetCodesCount(user?.id, false, true);
  }, [user?.id]);

  // Query bet codes count
  const { data: betCodesCount = 0, isLoading: isLoadingBetCodes } =
    useServerQuery(['betCodesCount', user?.id], getBetCodesCount, {
      enabled: !!user?.id,
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Xin chào! Dưới đây là tổng quan tài khoản của bạn.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Mã cược"
          value={isLoadingBetCodes ? 'Đang tải...' : betCodesCount}
          description="Tổng số mã cược"
          icon={<FileText className="h-5 w-5 text-primary" />}
        />
        <DashboardCard
          title="Đã thắng"
          value="0"
          description="Mã cược thắng"
          icon={<BarChart3 className="h-5 w-5 text-primary" />}
        />
        <DashboardCard
          title="Tổng tiền cược"
          value="0đ"
          description="Giá trị cược"
          icon={<CircleDollarSign className="h-5 w-5 text-primary" />}
        />
        <DashboardCard
          title="Tỉ lệ thắng"
          value="0%"
          description="Hiệu suất"
          icon={<Percent className="h-5 w-5 text-primary" />}
        />
      </div>

      <Separator />

      <div>
        <h2 className="text-2xl font-bold mb-4">Mã cược gần đây</h2>
        <p className="text-muted-foreground">
          Bạn chưa có mã cược nào. Tạo mã cược mới để bắt đầu.
        </p>
      </div>
    </div>
  );
}

function DashboardCard({ title, value, description, icon }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
