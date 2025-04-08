// src/app/(private)/stations/page.jsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useServerQuery } from '@/hooks/useServerAction';
import { fetchUserStationsAccess } from '@/app/actions/user-stations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  Search,
  Filter,
  RefreshCw,
  X,
  ChevronDown,
  ChevronRight,
  Calendar,
  Database,
  Info,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function StationsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [scheduleFilter, setScheduleFilter] = useState('all');
  const [expandedRegions, setExpandedRegions] = useState({});

  // Lấy danh sách đài cược của user
  const {
    data: userStationsData,
    isLoading,
    error,
  } = useServerQuery(
    ['userStations', user?.id],
    () => fetchUserStationsAccess(user?.id),
    {
      enabled: !!user?.id,
      onError: (error) => {
        toast.error('Lỗi khi tải dữ liệu: ' + error.message);
      },
    }
  );

  // Toggle region expansion
  const toggleRegionExpansion = (regionId) => {
    setExpandedRegions((prev) => ({
      ...prev,
      [regionId]: !prev[regionId],
    }));
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setRegionFilter('all');
    setScheduleFilter('all');
  };

  // Lấy danh sách các ngày trong tuần
  const daysOfWeek = useMemo(() => {
    return [
      { value: 'all', label: 'Tất cả các ngày' },
      { value: 'monday', label: 'Thứ Hai' },
      { value: 'tuesday', label: 'Thứ Ba' },
      { value: 'wednesday', label: 'Thứ Tư' },
      { value: 'thursday', label: 'Thứ Năm' },
      { value: 'friday', label: 'Thứ Sáu' },
      { value: 'saturday', label: 'Thứ Bảy' },
      { value: 'sunday', label: 'Chủ Nhật' },
      { value: 'daily', label: 'Hàng ngày' },
    ];
  }, []);

  // Lọc và nhóm các đài theo miền
  const filteredGroupedStations = useMemo(() => {
    if (!userStationsData?.data?.groupedStations) return [];

    const { groupedStations } = userStationsData.data;

    return groupedStations
      .map((region) => {
        // Lọc các đài theo điều kiện
        const filteredStations = region.stations.filter((station) => {
          // Lọc theo tên
          if (
            searchTerm &&
            !station.name.toLowerCase().includes(searchTerm.toLowerCase())
          ) {
            // Kiểm tra thêm trong aliases
            if (
              !station.aliases ||
              !station.aliases.some((alias) =>
                alias.toLowerCase().includes(searchTerm.toLowerCase())
              )
            ) {
              return false;
            }
          }

          // Lọc theo miền
          if (
            regionFilter !== 'all' &&
            station.region_id !== parseInt(regionFilter)
          ) {
            return false;
          }

          // Lọc theo lịch
          if (scheduleFilter !== 'all') {
            if (
              !station.schedules ||
              !station.schedules.some(
                (schedule) => schedule.day_of_week === scheduleFilter
              )
            ) {
              return false;
            }
          }

          return true;
        });

        return {
          ...region,
          stations: filteredStations,
        };
      })
      .filter((region) => region.stations.length > 0);
  }, [userStationsData, searchTerm, regionFilter, scheduleFilter]);

  // Helper function để hiển thị lịch xổ số
  const formatScheduleDay = (day) => {
    const dayMap = {
      monday: 'Thứ Hai',
      tuesday: 'Thứ Ba',
      wednesday: 'Thứ Tư',
      thursday: 'Thứ Năm',
      friday: 'Thứ Sáu',
      saturday: 'Thứ Bảy',
      sunday: 'Chủ Nhật',
      daily: 'Hàng ngày',
    };
    return dayMap[day] || day;
  };

  // Nhóm lịch xổ số theo ngày
  const groupSchedulesByDay = (schedules) => {
    if (!schedules || !schedules.length) return [];

    const grouped = {};

    schedules.forEach((schedule) => {
      if (!grouped[schedule.day_of_week]) {
        grouped[schedule.day_of_week] = [];
      }
      grouped[schedule.day_of_week].push(schedule);
    });

    // Sắp xếp mỗi nhóm theo order_number
    Object.keys(grouped).forEach((day) => {
      grouped[day].sort((a, b) => a.order_number - b.order_number);
    });

    // Tạo mảng kết quả đã sắp xếp theo thứ tự ngày
    const result = [];
    const orderedDays = [
      'daily',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];

    orderedDays.forEach((day) => {
      if (grouped[day]) {
        result.push({
          day,
          schedules: grouped[day],
        });
      }
    });

    return result;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Danh sách Đài Cược</h1>
          <p className="text-muted-foreground">
            Xem thông tin đài cược bạn được phép tham gia
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <Badge variant="outline" className="flex gap-1 px-3 py-1.5">
                  <Database className="h-4 w-4" />
                  <span>{userStationsData?.data?.totalStations || 0} đài</span>
                </Badge>
                <Info className="ml-2 h-4 w-4 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Số lượng đài cược bạn được phép tham gia</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Danh sách Đài Cược</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm đài cược..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex gap-2">
                    <Filter className="h-4 w-4" />
                    Bộ lọc
                    {(regionFilter !== 'all' || scheduleFilter !== 'all') && (
                      <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                        {(regionFilter !== 'all' ? 1 : 0) +
                          (scheduleFilter !== 'all' ? 1 : 0)}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <h4 className="font-medium leading-none">Bộ lọc</h4>
                    <Separator />
                    <div className="space-y-2">
                      <Label>Miền</Label>
                      <Select
                        value={regionFilter}
                        onValueChange={(value) => setRegionFilter(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn miền" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả</SelectItem>
                          {userStationsData?.data?.groupedStations?.map(
                            (region) => (
                              <SelectItem
                                key={region.id}
                                value={region.id.toString()}
                              >
                                {region.name}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Ngày mở thưởng</Label>
                      <Select
                        value={scheduleFilter}
                        onValueChange={(value) => setScheduleFilter(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn ngày" />
                        </SelectTrigger>
                        <SelectContent>
                          {daysOfWeek.map((day) => (
                            <SelectItem key={day.value} value={day.value}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={resetFilters}
                    >
                      Đặt lại bộ lọc
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              {(searchTerm ||
                regionFilter !== 'all' ||
                scheduleFilter !== 'all') && (
                <Button variant="ghost" onClick={resetFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Đang tải...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-10">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="mt-2 text-sm font-medium text-destructive">
                Đã xảy ra lỗi khi tải dữ liệu
              </p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          ) : filteredGroupedStations.length > 0 ? (
            <div className="space-y-6">
              {filteredGroupedStations.map((region) => (
                <div key={region.id} className="rounded-md border">
                  <div
                    className="flex items-center justify-between p-4 bg-muted/50 cursor-pointer"
                    onClick={() => toggleRegionExpansion(region.id)}
                  >
                    <div className="font-medium flex items-center">
                      {expandedRegions[region.id] ? (
                        <ChevronDown className="mr-2 h-4 w-4" />
                      ) : (
                        <ChevronRight className="mr-2 h-4 w-4" />
                      )}
                      <div className="flex flex-col">
                        <span className="font-semibold">{region.name}</span>
                        {region.aliases && region.aliases.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            Bí danh: {region.aliases.join(', ')}
                          </span>
                        )}
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {region.stations.length} đài
                      </Badge>
                    </div>
                  </div>

                  {expandedRegions[region.id] && (
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {region.stations.map((station) => {
                          // Sắp xếp và nhóm lịch xổ số
                          const groupedSchedules = groupSchedulesByDay(
                            station.schedules
                          );

                          return (
                            <div
                              key={station.id}
                              className="rounded-md border p-4 hover:border-primary/50 transition-colors"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex gap-2 items-start">
                                  <h3 className="font-semibold text-base">
                                    {station.name}
                                  </h3>
                                </div>
                              </div>

                              {station.aliases?.length > 0 && (
                                <div className="mt-2 mb-3">
                                  <p className="text-sm text-muted-foreground break-words">
                                    <span className="font-medium">
                                      Bí danh:
                                    </span>{' '}
                                    {station.aliases.join(', ')}
                                  </p>
                                </div>
                              )}

                              {/* Hiển thị nhóm lịch xổ số theo từng ngày */}
                              <div className="mt-3">
                                <div className="flex items-center mb-2">
                                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                                  <span className="font-medium">
                                    Lịch mở thưởng:
                                  </span>
                                </div>

                                {groupedSchedules.length > 0 ? (
                                  <div className="space-y-2">
                                    {groupedSchedules.map((group, idx) => (
                                      <div key={idx} className="flex flex-col">
                                        <div className="flex items-center">
                                          <Badge
                                            variant="outline"
                                            className="mr-2"
                                          >
                                            {formatScheduleDay(group.day)}
                                          </Badge>

                                          {/* Hiển thị thứ tự xổ trong ngày nếu có nhiều hơn 1 đài */}
                                          {group.schedules.length > 0 &&
                                            group.day !== 'daily' && (
                                              <div className="text-xs text-muted-foreground">
                                                (Thứ tự:{' '}
                                                {group.schedules
                                                  .map((s) => s.order_number)
                                                  .join(', ')}
                                                )
                                              </div>
                                            )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground">
                                    Chưa có lịch xổ số
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10">
              <Database className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                Không tìm thấy đài cược nào
              </p>
              {(searchTerm ||
                regionFilter !== 'all' ||
                scheduleFilter !== 'all') && (
                <Button variant="link" className="mt-2" onClick={resetFilters}>
                  Xóa bộ lọc
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
