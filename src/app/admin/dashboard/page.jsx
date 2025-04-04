// src/app/admin/dashboard/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/providers/AuthProvider';
import { Users, Database, BarChart3, CircleDollarSign } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useServerQuery } from '@/hooks/useServerAction';
import { fetchUserCount, fetchBetCodesCount } from '@/app/actions/dashboard';

export default function AdminDashboard() {
  const { user, isSuperAdmin } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Query user count
  const { data: usersCount, isLoading: isLoadingUsers } = useServerQuery(
    ['usersCount', user?.id],
    async () => {
      return await fetchUserCount(user?.id, isSuperAdmin);
    },
    {
      enabled: !!user?.id && mounted,
    }
  );

  // Query bet codes count
  const { data: betCodesCount, isLoading: isLoadingBetCodes } = useServerQuery(
    ['adminBetCodesCount', user?.id],
    async () => {
      return await fetchBetCodesCount(user?.id, isSuperAdmin);
    },
    {
      enabled: !!user?.id && mounted,
    }
  );

  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tổng quan hệ thống</h1>
        <p className="text-muted-foreground">
          Quản lý và theo dõi hoạt động của hệ thống.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Người dùng"
          value={isLoadingUsers ? 'Đang tải...' : usersCount}
          description="Tổng số người dùng"
          icon={<Users className="h-5 w-5 text-primary" />}
        />
        <DashboardCard
          title="Mã cược"
          value={isLoadingBetCodes ? 'Đang tải...' : betCodesCount}
          description="Tổng số mã cược"
          icon={<Database className="h-5 w-5 text-primary" />}
        />
        <DashboardCard
          title="Doanh thu"
          value="0đ"
          description="Tổng doanh thu"
          icon={<BarChart3 className="h-5 w-5 text-primary" />}
        />
        <DashboardCard
          title="Tiền thưởng"
          value="0đ"
          description="Tổng tiền thưởng"
          icon={<CircleDollarSign className="h-5 w-5 text-primary" />}
        />
      </div>

      <Separator />

      <div>
        <h2 className="text-2xl font-bold mb-4">Hoạt động gần đây</h2>
        <p className="text-muted-foreground">
          Chưa có hoạt động nào được ghi nhận gần đây.
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
