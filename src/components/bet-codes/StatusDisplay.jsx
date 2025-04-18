'use client';

import {
  AlertTriangle,
  RefreshCw,
  Check,
  Trash2,
  CheckSquare,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function StatusDisplay({
  isLoading = false,
  selectedUserIds = [],
  entriesCount = 0,
  draftCount = 0,
  userCount = 0,
  selectedEntryIds = [],
  confirmedCount = 0,
  // Actions props
  onSelectAllDrafts,
  onConfirmEntries,
  onDeleteEntries,
  onRefresh,
  onOpenReconciliation,
  isAllDraftsSelected = false,
  isConfirming = false,
  isDeleting = false,
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
    <div className="flex flex-col w-full gap-3">
      <div className="flex items-center justify-between w-full">
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

        {confirmedCount > 0 && !isLoading && (
          <Button
            onClick={onOpenReconciliation}
            className="ml-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 h-10 font-medium shadow-sm"
          >
            <CheckSquare className="mr-2 h-5 w-5" />
            Đối soát {confirmedCount} mã cược
          </Button>
        )}
      </div>

      {/* Action buttons row */}
      {entriesCount > 0 && (
        <div className="flex flex-wrap gap-2 justify-end">
          {draftCount > 0 && (
            <Button variant="outline" onClick={onSelectAllDrafts}>
              {isAllDraftsSelected
                ? `Bỏ chọn tất cả (${draftCount})`
                : `Chọn tất cả (${draftCount})`}
            </Button>
          )}

          {selectedEntryIds.length > 0 && (
            <>
              <Button
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={onConfirmEntries}
                disabled={isConfirming || isDeleting}
              >
                <Check className="mr-2 h-4 w-4" />
                Duyệt ({selectedEntryIds.length})
              </Button>

              <Button
                variant="destructive"
                onClick={onDeleteEntries}
                disabled={isConfirming || isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa ({selectedEntryIds.length})
              </Button>
            </>
          )}

          <Button
            variant={selectedEntryIds.length > 0 ? 'outline' : 'default'}
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            Làm mới
          </Button>
        </div>
      )}
    </div>
  );
}
