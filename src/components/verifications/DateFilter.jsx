// src/components/verifications/DateFilter.jsx
'use client';

import { format } from 'date-fns';
import { Calendar as CalendarIcon, RefreshCw, FilterX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';

export function DateFilter({
  selectedDate,
  setSelectedDate,
  onRefresh,
  isLoading,
  onResetFilters,
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate
                    ? format(selectedDate, 'dd/MM/yyyy')
                    : 'Chọn ngày'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-2">
            {onResetFilters && (
              <Button variant="outline" onClick={onResetFilters}>
                <FilterX className="mr-2 h-4 w-4" />
                Xóa bộ lọc
              </Button>
            )}

            <Button onClick={onRefresh} disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Đang tải...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Làm mới
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
