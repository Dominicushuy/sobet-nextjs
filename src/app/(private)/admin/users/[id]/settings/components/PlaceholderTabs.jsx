'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function RewardsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hệ số tính thưởng</CardTitle>
        <CardDescription>
          Tính năng này sẽ được phát triển trong phiên bản tiếp theo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-10">
          <p>Chức năng đang được phát triển</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function MultipliersTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hệ số nhân</CardTitle>
        <CardDescription>
          Tính năng này sẽ được phát triển trong phiên bản tiếp theo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-10">
          <p>Chức năng đang được phát triển</p>
        </div>
      </CardContent>
    </Card>
  );
}
