'use client';

import { Users, FileX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function EmptyState({
  type = 'no-users',
  onAction,
  actionLabel = 'Chọn người dùng',
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        {type === 'no-users' ? (
          <>
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-center text-muted-foreground">
              Vui lòng chọn ít nhất một người dùng để xem mã cược
            </p>
          </>
        ) : type === 'no-entries' ? (
          <>
            <FileX className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-center text-muted-foreground">
              Không tìm thấy mã cược nào
            </p>
          </>
        ) : (
          <p className="text-center text-muted-foreground">Không có dữ liệu</p>
        )}

        <Button variant="outline" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
