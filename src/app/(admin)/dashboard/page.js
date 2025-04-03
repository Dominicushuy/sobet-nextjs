import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart4, Users, Database, CreditCard } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Tổng quan hệ thống</h1>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Tổng người dùng"
          value="1,235"
          description="+12% so với tháng trước"
          icon={<Users className="h-8 w-8 text-primary" />}
        />
        <StatsCard
          title="Mã cược hôm nay"
          value="435"
          description="+5% so với hôm qua"
          icon={<Database className="h-8 w-8 text-primary" />}
        />
        <StatsCard
          title="Doanh thu tuần"
          value="52.5M VND"
          description="+8% so với tuần trước"
          icon={<CreditCard className="h-8 w-8 text-primary" />}
        />
        <StatsCard
          title="Tỉ lệ thắng"
          value="24.3%"
          description="-2% so với trung bình"
          icon={<BarChart4 className="h-8 w-8 text-primary" />}
        />
      </div>

      {/* Thêm nội dung dashboard khác ở đây */}
    </div>
  );
}

const StatsCard = ({ title, value, description, icon }) => {
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
};
