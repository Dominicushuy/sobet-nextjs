'use client';

import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function ConfirmDialogs({
  showConfirmDialog,
  setShowConfirmDialog,
  showDeleteDialog,
  setShowDeleteDialog,
  selectedCount,
  isConfirming,
  isDeleting,
  onConfirm,
}) {
  return (
    <>
      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận duyệt mã cược</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn đang thực hiện duyệt {selectedCount} mã cược. Hành động này sẽ
              chuyển trạng thái của các mã cược từ &quot;Nháp&quot; sang
              &quot;Đã xác nhận&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirm}
              className="bg-green-600 hover:bg-green-700"
              disabled={isConfirming}
            >
              {isConfirming ? 'Đang xử lý...' : 'Xác nhận duyệt'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-destructive">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Xác nhận xóa mã cược
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bạn đang thực hiện xóa {selectedCount} mã cược. Hành động này sẽ
              chuyển trạng thái của các mã cược sang &quot;Đã xóa&quot; và không
              thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirm}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Đang xử lý...' : 'Xác nhận xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
