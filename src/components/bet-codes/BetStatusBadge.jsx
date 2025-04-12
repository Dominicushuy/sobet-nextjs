'use client';

import { Badge } from '@/components/ui/badge';

export function BetStatusBadge({ status, winningStatus }) {
  let variant = 'default';
  let label = '';

  // Determine badge style based on status and winning status
  switch (status) {
    case 'draft':
      variant = 'secondary';
      label = 'Nháp';
      break;
    case 'confirmed':
      variant = 'default';
      label = 'Đã xác nhận';
      break;
    case 'processed':
      if (winningStatus === true) {
        variant = 'success';
        label = 'Trúng thưởng';
      } else if (winningStatus === false) {
        variant = 'destructive';
        label = 'Không trúng';
      } else {
        variant = 'outline';
        label = 'Đã xử lý';
      }
      break;
    case 'deleted':
      variant = 'destructive';
      label = 'Đã xóa';
      break;
    default:
      variant = 'secondary';
      label = status || 'Unknown';
  }

  return <Badge variant={variant}>{label}</Badge>;
}
