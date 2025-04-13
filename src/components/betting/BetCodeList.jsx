import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useBetCode } from '@/contexts/BetCodeContext';
import {
  Filter,
  CircleSlash,
  Loader2,
  PanelTopClose,
  PanelTopOpen,
  CheckCircle2,
} from 'lucide-react';
import BetCodeCard from './BetCodeCard';
import BetCodeFilter from './BetCodeFilter';
import MultipleActionsButton from './MultipleActionsButton';
import { formatMoney } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const BetCodeList = () => {
  const {
    draftCodes,
    getFilteredCodes,
    confirmDraftCodes,
    isInitialized,
    getStatistics,
    filterCodes,
    getFilteredStatistics,
    isSavingDraftCodes,
  } = useBetCode();

  // State for selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectMode, setSelectMode] = useState(false);
  const [filterOpen, setFilterOpen] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [saveProgress, setSaveProgress] = useState({
    current: 0,
    total: 0,
  });

  // Get filtered draft codes
  const filteredDraftCodes = getFilteredCodes('draft');

  // Get statistics for all codes
  const stats = getStatistics();

  // Get statistics for filtered draft codes
  const filteredDraftStats = getFilteredStatistics(filteredDraftCodes);

  // Toggle select mode
  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    setSelectedIds([]);
  };

  // Toggle select bet code
  const toggleSelectBetCode = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  // Select all
  const selectAll = () => {
    const allIds = filteredDraftCodes.map((code) => code.id);
    setSelectedIds(allIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds([]);
  };

  // Handle confirm button click
  const handleConfirmClick = () => {
    if (draftCodes.length === 0) {
      return;
    }
    setShowConfirmDialog(true);
  };

  // Handle save all bet codes
  const handleSaveAll = () => {
    setShowConfirmDialog(false);
    setSaveProgress({ current: 0, total: draftCodes.length });
    confirmDraftCodes();
  };

  // Show loading message
  if (!isInitialized) {
    return (
      <div className="flex flex-col h-full bg-background rounded-md shadow-sm">
        <div className="p-4 border-b dark:border-gray-800">
          <h2 className="text-lg font-bold">Mã cược</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Đang tải dữ liệu...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background rounded-md shadow-sm">
      <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">Mã cược</h2>
          <div className="flex space-x-1">
            <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full">
              {draftCodes.length} mã cược
            </span>
          </div>
        </div>

        <div className="flex gap-1.5">
          {selectMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                className="h-8"
              >
                <span className="h-3.5 w-3.5 mr-1">✓</span>
                Chọn tất cả
              </Button>

              <MultipleActionsButton
                selectedIds={selectedIds}
                onClearSelection={clearSelection}
              />

              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectMode}
                className="h-8"
              >
                <CircleSlash className="h-3.5 w-3.5 mr-1" />
                Hủy
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectMode}
                className="h-8"
              >
                Chọn nhiều
              </Button>

              <Button
                onClick={handleConfirmClick}
                disabled={draftCodes.length === 0 || isSavingDraftCodes}
                className="flex items-center gap-1.5 h-8"
              >
                {isSavingDraftCodes ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    {draftCodes.length > 0 && `Xử lý (${draftCodes.length})`}
                    {draftCodes.length === 0 && 'Xử lý'}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="px-4 py-3 border-b dark:border-gray-800 bg-muted/20">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Tìm kiếm
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5"
              onClick={() => setFilterOpen(!filterOpen)}
            >
              {filterOpen ? (
                <PanelTopClose className="h-4 w-4" />
              ) : (
                <PanelTopOpen className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Tổng tiền thu:</span>{' '}
              <span className="font-medium text-orange-600 dark:text-orange-400">
                {formatMoney(
                  filteredDraftCodes.length > 0
                    ? filteredDraftStats.totalStake
                    : stats.totalDraftStake
                )}
                đ
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Tiềm năng thắng:</span>{' '}
              <span className="font-medium text-green-600 dark:text-green-400">
                {formatMoney(
                  filteredDraftCodes.length > 0
                    ? filteredDraftStats.totalPotential
                    : stats.totalDraftPotential
                )}
                đ
              </span>
            </div>
          </div>
        </div>

        <div
          className={cn(
            'transition-all duration-200',
            filterOpen
              ? 'max-h-96 opacity-100'
              : 'max-h-0 opacity-0 overflow-hidden'
          )}
        >
          <BetCodeFilter />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {draftCodes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="flex justify-center mb-4">
              <CircleSlash className="h-12 w-12 text-muted-foreground/50" />
            </div>
            <p className="text-lg font-medium mb-1">Chưa có mã cược nào</p>
            <p className="text-sm">
              Nhập mã cược trong chat để thêm mã cược mới
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Display draft codes */}
            {filteredDraftCodes.length > 0 && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  {filteredDraftCodes.map((code) => (
                    <BetCodeCard
                      key={code.id}
                      betCode={code}
                      isDraft={true}
                      selectable={selectMode}
                      selected={selectedIds.includes(code.id)}
                      onSelectChange={() => toggleSelectBetCode(code.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {draftCodes.length > 0 && filteredDraftCodes.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <div className="flex justify-center mb-4">
                  <Filter className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <p className="text-lg font-medium mb-1">
                  Không tìm thấy mã cược
                </p>
                <p className="text-sm">
                  Không có mã cược nào phù hợp với từ khóa tìm kiếm
                </p>
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Clear filter
                      const searchInput = document.querySelector(
                        'input[placeholder*="Tìm"]'
                      );
                      if (searchInput) {
                        searchInput.value = '';
                        searchInput.dispatchEvent(
                          new Event('change', { bubbles: true })
                        );
                      }
                      filterCodes(null);
                    }}
                  >
                    Xóa bộ lọc
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setFilterOpen(true)}
                  >
                    Điều chỉnh tìm kiếm
                  </Button>
                </div>
                <div className="mt-4 bg-muted p-3 rounded-md text-xs max-w-sm mx-auto">
                  <p className="text-muted-foreground font-medium mb-1">
                    Gợi ý tìm kiếm:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground/80">
                    <li>Tìm theo số cược (ví dụ: 23, 45, 78)</li>
                    <li>Tìm theo đài (mb, vl, ct...)</li>
                    <li>Tìm theo kiểu cược (dd, b, da...)</li>
                    <li>Tìm theo nội dung mã cược gốc</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Xác nhận lưu {draftCodes.length} mã cược
            </DialogTitle>
            <DialogDescription>
              Bạn đang lưu {draftCodes.length} mã cược vào hệ thống. Mã cược sau
              khi lưu sẽ được xóa khỏi danh sách nháp.
            </DialogDescription>
          </DialogHeader>

          {saveProgress.total > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Đang lưu...</span>
                <span>
                  {saveProgress.current}/{saveProgress.total}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div
                  className="bg-primary h-2.5 rounded-full"
                  style={{
                    width: `${
                      (saveProgress.current / saveProgress.total) * 100
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isSavingDraftCodes}
            >
              Hủy
            </Button>
            <Button
              variant="default"
              onClick={handleSaveAll}
              disabled={isSavingDraftCodes}
            >
              {isSavingDraftCodes ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Lưu {draftCodes.length} mã cược
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BetCodeList;
