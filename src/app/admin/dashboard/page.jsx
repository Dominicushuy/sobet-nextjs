'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/providers/AuthProvider';
import { Users, Database, BarChart3, CircleDollarSign } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';

export default function AdminDashboard() {
  const { user, isSuperAdmin } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Truy vấn số lượng người dùng
  const { data: usersCount, isLoading: isLoadingUsers } = useSupabaseQuery(
    ['usersCount', user?.id],
    async (supabase) => {
      if (!user?.id) return 0;

      // Nếu là super_admin, lấy tất cả user
      if (isSuperAdmin) {
        const { count, error } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });

        if (error) throw error;
        return count || 0;
      } else {
        // Nếu là admin, chỉ lấy user thuộc admin đó
        const { count, error } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', user.id);

        if (error) throw error;
        return count || 0;
      }
    },
    {
      enabled: !!user?.id && mounted,
    }
  );

  // Truy vấn số lượng mã cược
  const { data: betCodesCount, isLoading: isLoadingBetCodes } =
    useSupabaseQuery(
      ['adminBetCodesCount', user?.id],
      async (supabase) => {
        if (!user?.id) return 0;

        // Nếu là super_admin, lấy tất cả bet codes
        if (isSuperAdmin) {
          const { count, error } = await supabase
            .from('bet_codes')
            .select('*', { count: 'exact', head: true });

          if (error) throw error;
          return count || 0;
        } else {
          // Nếu là admin, lấy bet codes của tất cả user thuộc quyền quản lý
          const { data: userIds, error: userIdsError } = await supabase
            .from('users')
            .select('id')
            .eq('created_by', user.id);

          if (userIdsError) throw userIdsError;

          if (userIds.length === 0) return 0;

          const { count, error } = await supabase
            .from('bet_codes')
            .select('*', { count: 'exact', head: true })
            .in(
              'user_id',
              userIds.map((u) => u.id)
            );

          if (error) throw error;
          return count || 0;
        }
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
