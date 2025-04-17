'use client';

import { RefreshCw, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function ActionButtons({
  selectedEntryIds = [],
  draftCount = 0,
  isConfirming = false,
  isDeleting = false,
  isLoading = false,
  onSelectAllDrafts,
  onConfirmEntries,
  onDeleteEntries,
  onRefresh,
  isAllDraftsSelected = false,
}) {
  return (
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

      {selectedEntryIds.length > 0 && (
        <Badge className="ml-2 self-center bg-primary text-primary-foreground">
          {selectedEntryIds.length} mã được chọn
        </Badge>
      )}
    </div>
  );
}
