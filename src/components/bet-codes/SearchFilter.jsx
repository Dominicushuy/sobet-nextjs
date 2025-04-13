'use client';

import { format } from 'date-fns';
import { Search, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function SearchFilter({
  searchTerm,
  setSearchTerm,
  selectedDate,
  setSelectedDate,
  onResetFilters,
  onApplyFilters,
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Date filter */}
        <div className="space-y-2">
          <Label>Ngày</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {selectedDate
                  ? format(selectedDate, 'dd/MM/yyyy')
                  : 'Chọn ngày'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Search filter */}
        <div className="space-y-2">
          <Label>Tìm kiếm mã cược</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm mã cược..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-start space-x-2">
        <Button variant="outline" onClick={onResetFilters}>
          Đặt lại bộ lọc
        </Button>
        <Button onClick={onApplyFilters}>Áp dụng bộ lọc</Button>
      </div>
    </div>
  );
}
