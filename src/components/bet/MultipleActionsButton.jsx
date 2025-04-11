// src/components/bet/MultipleActionsButton.jsx
import { Button } from '@/components/ui/button'
import {
  MoreHorizontal,
  Trash2,
  RotateCcw,
  Download,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'
import { useBetCode } from '@/contexts/BetCodeContext'
import { toast } from 'sonner'
import { useState } from 'react'
import { formatMoney } from '@/utils/formatters'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const MultipleActionsButton = ({ selectedIds, onClearSelection }) => {
  const { removeDraftCode, getBetCode, batchDeleteCodes } = useBetCode()

  const [printing, setPrinting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 })

  // Get selected bet codes summary
  const getSelectionSummary = () => {
    const betCodes = selectedIds
      .map((id) => getBetCode(id))
      .filter((code) => code !== undefined)

    // Calculate totals
    const totalStake = betCodes.reduce(
      (sum, code) => sum + (code.stakeAmount || 0),
      0
    )

    const totalPotential = betCodes.reduce(
      (sum, code) => sum + (code.potentialWinning || 0),
      0
    )

    return { count: betCodes.length, totalStake, totalPotential }
  }

  const handleDeleteSelected = () => {
    setShowDeleteConfirm(false)
    if (selectedIds.length === 0) {
      toast.info('Chưa có mã cược nào được chọn để xóa')
      return
    }

    try {
      // Show completed status immediately
      setDeleteProgress({
        current: selectedIds.length,
        total: selectedIds.length,
      })

      // Delete all selected bet codes in a single operation
      batchDeleteCodes(selectedIds)

      toast.success(`Đã xóa ${selectedIds.length} mã cược`)
      onClearSelection()
    } catch (error) {
      console.error('Lỗi khi xóa nhiều mã cược:', error)
      toast.error('Lỗi: ' + error.message)
    } finally {
      // Reset progress state after completion
      setTimeout(() => {
        setDeleteProgress({ current: 0, total: 0 })
      }, 300)
    }
  }

  const handleExportSelected = async () => {
    if (selectedIds.length === 0) {
      toast.info('Chưa có mã cược nào được chọn để xuất')
      return
    }

    try {
      setPrinting(true)

      // Simulate export process
      await new Promise((resolve) => setTimeout(resolve, 500))

      toast.success(`Đã xuất ${selectedIds.length} mã cược`)
    } catch (error) {
      console.error('Lỗi khi xuất mã cược:', error)
      toast.error('Lỗi: ' + error.message)
    } finally {
      setPrinting(false)
    }
  }

  const summary = getSelectionSummary()

  if (selectedIds.length === 0) {
    return null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='outline' size='sm' className='h-8'>
            <MoreHorizontal className='h-3.5 w-3.5 mr-1.5' />
            <span>{selectedIds.length} đã chọn</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-64'>
          <DropdownMenuLabel className='flex justify-between items-center'>
            <span>Tác vụ hàng loạt</span>
            <Badge variant='outline' className='font-normal'>
              {selectedIds.length} mã
            </Badge>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <div className='px-2 py-1.5 text-xs'>
            <div className='grid grid-cols-2 gap-1 text-muted-foreground'>
              <div>Tiền đóng:</div>
              <div className='text-right font-medium text-blue-600'>
                {formatMoney(summary.totalStake)}đ
              </div>
              <div>Tiềm năng thắng:</div>
              <div className='text-right font-medium text-green-600'>
                {formatMoney(summary.totalPotential)}đ
              </div>
            </div>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={handleExportSelected}
              disabled={printing}>
              {printing ? (
                <>
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                  Đang xuất...
                </>
              ) : (
                <>
                  <Download className='h-4 w-4 mr-2' />
                  Xuất {selectedIds.length} mã cược
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={onClearSelection}>
            <RotateCcw className='h-4 w-4 mr-2' />
            Bỏ chọn tất cả
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setShowDeleteConfirm(true)}
            className='text-destructive focus:text-destructive'>
            <Trash2 className='h-4 w-4 mr-2' />
            Xóa {selectedIds.length} mã đã chọn
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <AlertTriangle className='h-5 w-5 text-destructive' />
              Xác nhận xóa {selectedIds.length} mã cược
            </DialogTitle>
            <DialogDescription>
              Bạn đang xóa {selectedIds.length} mã cược. Thao tác này không thể
              hoàn tác.
            </DialogDescription>
          </DialogHeader>

          {deleteProgress.total > 0 && (
            <div className='space-y-2'>
              <div className='flex justify-between text-sm'>
                <span>Đang xóa...</span>
                <span>
                  {deleteProgress.current}/{deleteProgress.total}
                </span>
              </div>
              <div className='w-full bg-muted rounded-full h-2.5'>
                <div
                  className='bg-destructive h-2.5 rounded-full'
                  style={{
                    width: `${
                      (deleteProgress.current / deleteProgress.total) * 100
                    }%`,
                  }}></div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleteProgress.total > 0}>
              Hủy
            </Button>
            <Button
              variant='destructive'
              onClick={handleDeleteSelected}
              disabled={deleteProgress.total > 0}>
              <Trash2 className='h-4 w-4 mr-1.5' />
              Xóa {selectedIds.length} mã cược
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default MultipleActionsButton
