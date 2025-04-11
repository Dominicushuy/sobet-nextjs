// src/components/bet/BetCodeList.jsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useBetCode } from '@/contexts/BetCodeContext';
import {
  Filter,
  CircleSlash,
  Loader2,
  PanelTopClose,
  PanelTopOpen,
} from 'lucide-react';
import BetCodeCard from './BetCodeCard';
import BetCodeFilter from './BetCodeFilter';
import MultipleActionsButton from './MultipleActionsButton';
import { formatMoney } from '@/utils/formatters';
import { cn } from '@/lib/utils';

const BetCodeList = () => {
  const {
    draftCodes,
    getFilteredCodes,
    confirmDraftCodes,
    isInitialized,
    getStatistics,
    filterCodes,
    getFilteredStatistics,
  } = useBetCode();

  // State for selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectMode, setSelectMode] = useState(false);
  const [filterOpen, setFilterOpen] = useState(true);

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

  // Show loading message
  if (!isInitialized) {
    return (
      <div className="flex flex-col h-full bg-white rounded-md shadow-sm">
        <div className="p-4 border-b">
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
    <div className="flex flex-col h-full bg-white rounded-md shadow-sm">
      <div className="p-4 border-b flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">Mã cược</h2>
          <div className="flex space-x-1">
            <span className="text-xs text-yellow-800 bg-yellow-100 px-2 py-0.5 rounded-full">
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
                onClick={confirmDraftCodes}
                disabled={draftCodes.length === 0}
                className="flex items-center gap-1.5 h-8 bg-primary-600 hover:bg-primary-700"
              >
                {draftCodes.length > 0 && `Xử lý (${draftCodes.length})`}
                {draftCodes.length === 0 && 'Xử lý'}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="px-4 py-3 border-b bg-muted/20">
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
              <span className="text-muted-foreground">Tổng tiền đóng:</span>
              <span className="font-medium text-blue-600">
                {formatMoney(
                  filteredDraftCodes.length > 0
                    ? filteredDraftStats.totalStake
                    : stats.totalDraftStake
                )}
                đ
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Tiềm năng thắng:</span>
              <span className="font-medium text-green-600">
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
                <div className="mt-4 bg-muted/40 p-3 rounded-md text-xs max-w-sm mx-auto">
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
    </div>
  );
};

export default BetCodeList;
