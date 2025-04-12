'use client';

import { format } from 'date-fns';
import {
  CalendarIcon,
  Search,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

export function DateSearchFilter({
  selectedDate,
  setSelectedDate,
  searchTerm,
  setSearchTerm,
  resetFilters,
  onRefresh,
  isExpanded = true,
  setIsExpanded,
}) {
  return (
    <Card>
      <CardHeader
        className="pb-3 flex flex-row items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Bộ lọc
            {selectedDate ? (
              <Badge variant="secondary" className="ml-2">
                Lọc theo ngày
              </Badge>
            ) : null}
          </CardTitle>
          <CardDescription>
            Lọc danh sách mã cược theo ngày và từ khóa
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>

      {isExpanded && (
        <CardContent>
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
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP') : 'Chọn ngày'}
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

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={resetFilters}>
              Xóa bộ lọc
            </Button>
            <Button onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Làm mới
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
