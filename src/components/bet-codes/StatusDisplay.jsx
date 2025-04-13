'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function StatusDisplay({
  isLoading = false,
  selectedUserIds = [],
  entriesCount = 0,
  draftCount = 0,
  userCount = 0,
  selectedEntryIds = [],
}) {
  if (selectedUserIds.length === 0) {
    return (
      <div className="flex items-center text-amber-500">
        <AlertTriangle className="h-5 w-5 mr-2" />
        Vui lòng chọn ít nhất một người dùng
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center">
        <RefreshCw className="h-5 w-5 mr-2 animate-spin text-primary" />
        Đang tải dữ liệu...
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <span>
        Hiển thị {entriesCount} mã cược từ {userCount} người dùng
      </span>

      {draftCount > 0 && (
        <Badge
          variant="outline"
          className="bg-amber-100 text-amber-700 border-amber-200"
        >
          {draftCount} mã nháp
        </Badge>
      )}

      {selectedEntryIds.length > 0 && (
        <Badge
          variant="outline"
          className="bg-primary/10 text-primary border-primary/20"
        >
          {selectedEntryIds.length} mã được chọn
        </Badge>
      )}
    </div>
  );
}
