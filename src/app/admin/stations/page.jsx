'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  Search,
  Plus,
  MoreHorizontal,
  Filter,
  Power,
  PowerOff,
  Pencil,
  RefreshCw,
  X,
  ChevronDown,
  ChevronRight,
  Trash2,
  Info,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useServerQuery, useServerMutation } from '@/hooks/useServerAction';
import {
  fetchStations,
  fetchRegions,
  fetchSchedules,
  createStation,
  updateStation,
  toggleStationStatus,
  deleteStation,
} from '@/app/actions/stations';

// Form schema cho việc tạo/chỉnh sửa đài cược
const stationSchema = z.object({
  name: z.string().min(2, 'Tên đài phải có ít nhất 2 ký tự'),
  region_id: z.string().min(1, 'Vui lòng chọn miền'),
  aliases: z.string().min(1, 'Vui lòng nhập ít nhất một bí danh'),
  is_active: z.boolean().default(true),
});

export default function StationsPage() {
  const { user, isSuperAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState(undefined);
  const [scheduleFilter, setScheduleFilter] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [expandedRegions, setExpandedRegions] = useState({});

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);

  // Toggle region expansion
  const toggleRegionExpansion = (regionId) => {
    setExpandedRegions((prev) => ({
      ...prev,
      [regionId]: !prev[regionId],
    }));
  };

  // Forms
  const createForm = useForm({
    resolver: zodResolver(stationSchema),
    defaultValues: {
      name: '',
      region_id: '',
      aliases: '',
      is_active: true,
    },
  });

  const editForm = useForm({
    resolver: zodResolver(stationSchema),
    defaultValues: {
      name: '',
      region_id: '',
      aliases: '',
      is_active: true,
    },
  });

  // Fetch stations with filters
  const fetchStationsParams = useCallback(() => {
    return {
      isSuperAdmin,
      searchTerm,
      regionFilter,
      activeFilter,
      scheduleFilter,
    };
  }, [isSuperAdmin, searchTerm, regionFilter, activeFilter, scheduleFilter]);

  const {
    data: stationsData,
    isLoading: isLoadingStations,
    refetch: refetchStations,
  } = useServerQuery(
    ['stations', fetchStationsParams()],
    () => fetchStations(fetchStationsParams()),
    {
      enabled: !!user?.id,
      onError: (error) => {
        toast.error('Lỗi khi tải danh sách đài cược: ' + error.message);
      },
    }
  );

  // Fetch regions for filter dropdown
  const { data: regionsData, isLoading: isLoadingRegions } = useServerQuery(
    ['regions'],
    () => fetchRegions(),
    {
      enabled: !!user?.id,
      onError: (error) => {
        toast.error('Lỗi khi tải danh sách miền: ' + error.message);
      },
    }
  );

  // Fetch schedules for filter dropdown
  const { data: schedulesData, isLoading: isLoadingSchedules } = useServerQuery(
    ['schedules'],
    () => fetchSchedules(),
    {
      enabled: !!user?.id,
      onError: (error) => {
        toast.error('Lỗi khi tải danh sách lịch: ' + error.message);
      },
    }
  );

  console.log({ schedulesData });

  // Group stations by region
  const groupedStations = useMemo(() => {
    if (!stationsData?.data?.stations || !regionsData?.data) return {};

    // Tạo object regions với mỗi region là một key
    const regions = regionsData.data.reduce((acc, region) => {
      acc[region.id] = {
        id: region.id,
        name: region.name,
        code: region.code,
        aliases: region.aliases || [],
        stations: [],
      };
      return acc;
    }, {});

    // Nhóm stations theo region
    stationsData.data.stations.forEach((station) => {
      const regionId = station.region_id;
      if (regions[regionId]) {
        regions[regionId].stations.push(station);
      }
    });

    // Chuyển object thành array để dễ dàng render
    return Object.values(regions).filter(
      (region) => region.stations.length > 0
    );
  }, [stationsData, regionsData]);

  // Mutations
  const createStationMutation = useServerMutation(
    'createStation',
    (data) => createStation(data),
    {
      onSuccess: () => {
        toast.success('Đài cược đã được tạo thành công');
        setCreateDialogOpen(false);
        createForm.reset();
        refetchStations();
      },
      onError: (error) => {
        toast.error('Lỗi khi tạo đài cược: ' + error.message);
      },
    }
  );

  const updateStationMutation = useServerMutation(
    'updateStation',
    ({ id, data }) => updateStation(id, data),
    {
      onSuccess: () => {
        toast.success('Đài cược đã được cập nhật thành công');
        setEditDialogOpen(false);
        editForm.reset();
        refetchStations();
      },
      onError: (error) => {
        toast.error('Lỗi khi cập nhật đài cược: ' + error.message);
      },
    }
  );

  const toggleStatusMutation = useServerMutation(
    'toggleStationStatus',
    ({ id, isActive }) => toggleStationStatus(id, isActive),
    {
      onSuccess: (result) => {
        const status = result.data.is_active ? 'kích hoạt' : 'vô hiệu hóa';
        toast.success(`Đài cược đã được ${status} thành công`);
        refetchStations();
      },
      onError: (error) => {
        toast.error('Lỗi khi thay đổi trạng thái đài cược: ' + error.message);
      },
    }
  );

  const deleteStationMutation = useServerMutation(
    'deleteStation',
    (id) => deleteStation(id),
    {
      onSuccess: () => {
        toast.success('Đài cược đã được xóa thành công');
        setDeleteDialogOpen(false);
        refetchStations();
      },
      onError: (error) => {
        toast.error('Lỗi khi xóa đài cược: ' + error.message);
      },
    }
  );

  // Update form defaults when selected station changes
  useEffect(() => {
    if (selectedStation) {
      const aliasesString = selectedStation.aliases
        ? selectedStation.aliases.join(', ')
        : '';

      editForm.reset({
        name: selectedStation.name || '',
        region_id: selectedStation.region_id?.toString() || '',
        aliases: aliasesString,
        is_active: selectedStation.is_active || false,
      });
    }
  }, [selectedStation, editForm]);

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setRegionFilter('all');
    setActiveFilter(undefined);
    setScheduleFilter('all');
  };

  // Handle form submissions
  const onCreateStation = (data) => {
    // Chuyển đổi region_id thành số
    const region_id = parseInt(data.region_id);

    // Chuyển đổi aliases thành mảng
    const aliases = data.aliases
      .split(',')
      .map((alias) => alias.trim())
      .filter((alias) => alias.length > 0);

    createStationMutation.mutate({
      name: data.name,
      region_id,
      aliases,
      is_active: data.is_active,
    });
  };

  const onUpdateStation = (data) => {
    if (!selectedStation) return;

    // Chuyển đổi region_id thành số
    const region_id = parseInt(data.region_id);

    // Chuyển đổi aliases thành mảng
    const aliases = data.aliases
      .split(',')
      .map((alias) => alias.trim())
      .filter((alias) => alias.length > 0);

    updateStationMutation.mutate({
      id: selectedStation.id,
      data: {
        name: data.name,
        region_id,
        aliases,
        is_active: data.is_active,
      },
    });
  };

  const onToggleStatus = (station) => {
    toggleStatusMutation.mutate({
      id: station.id,
      isActive: !station.is_active,
    });
  };

  const onDeleteStation = () => {
    if (!selectedStation) return;
    deleteStationMutation.mutate(selectedStation.id);
  };

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

  // Helper function để lọc ngày
  const getScheduleFilterOptions = () => {
    const options = [
      { value: 'monday', label: 'Thứ Hai' },
      { value: 'tuesday', label: 'Thứ Ba' },
      { value: 'wednesday', label: 'Thứ Tư' },
      { value: 'thursday', label: 'Thứ Năm' },
      { value: 'friday', label: 'Thứ Sáu' },
      { value: 'saturday', label: 'Thứ Bảy' },
      { value: 'sunday', label: 'Chủ Nhật' },
      { value: 'daily', label: 'Hàng ngày' },
    ];

    // Lọc ra các ngày có trong dữ liệu
    if (schedulesData?.data?.length) {
      return options.filter((option) =>
        schedulesData.data.includes(option.value)
      );
    }

    return options;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Đài Cược</h1>
          <p className="text-muted-foreground">
            Quản lý thông tin đài cược trong hệ thống
          </p>
        </div>
        {isSuperAdmin && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Thêm Đài Cược
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Tạo đài cược mới</DialogTitle>
                <DialogDescription>
                  Nhập thông tin để tạo đài cược mới trong hệ thống
                </DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form
                  onSubmit={createForm.handleSubmit(onCreateStation)}
                  className="space-y-4"
                >
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên đài</FormLabel>
                        <FormControl>
                          <Input placeholder="Ví dụ: TP. HCM" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="region_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Miền</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn miền" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {regionsData?.data?.map((region) => (
                              <SelectItem
                                key={region.id}
                                value={region.id.toString()}
                              >
                                {region.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="aliases"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bí danh</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nhập các bí danh, cách nhau bởi dấu phẩy"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Kích hoạt</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Đài cược sẽ được hiển thị cho người dùng
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={createStationMutation.isPending}
                    >
                      {createStationMutation.isPending
                        ? 'Đang tạo...'
                        : 'Tạo Đài Cược'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
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
              <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex gap-2">
                    <Filter className="h-4 w-4" />
                    Bộ lọc
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
                          {regionsData?.data?.map((region) => (
                            <SelectItem
                              key={region.id}
                              value={region.id.toString()}
                            >
                              {region.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {isSuperAdmin && (
                      <div className="space-y-2">
                        <Label>Trạng thái</Label>
                        <Select
                          value={
                            activeFilter !== undefined
                              ? activeFilter.toString()
                              : 'all'
                          }
                          onValueChange={(value) => {
                            if (value === 'all') {
                              setActiveFilter(undefined);
                            } else {
                              setActiveFilter(value === 'true');
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn trạng thái" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="true">Đã kích hoạt</SelectItem>
                            <SelectItem value="false">
                              Chưa kích hoạt
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
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
                          <SelectItem value="all">Tất cả</SelectItem>
                          {getScheduleFilterOptions().map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
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
                activeFilter !== undefined ||
                scheduleFilter !== 'all') && (
                <Button variant="ghost" onClick={resetFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {isLoadingStations ? (
            <div className="flex flex-col items-center justify-center py-10">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Đang tải...</p>
            </div>
          ) : groupedStations.length > 0 ? (
            <div className="space-y-6">
              {groupedStations.map((region) => (
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
                        {region.stations.map((station) => (
                          <div
                            key={station.id}
                            className="rounded-md border p-4"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex gap-2 items-start">
                                <h3 className="font-semibold text-base">
                                  {station.name}
                                </h3>
                                <Badge
                                  variant={
                                    station.is_active
                                      ? 'default'
                                      : 'destructive'
                                  }
                                  className="mt-1"
                                >
                                  {station.is_active
                                    ? 'Hoạt động'
                                    : 'Ngừng hoạt động'}
                                </Badge>
                              </div>
                              {isSuperAdmin && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                    >
                                      <span className="sr-only">Mở menu</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>
                                      Tùy chọn
                                    </DropdownMenuLabel>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedStation(station);
                                        setEditDialogOpen(true);
                                      }}
                                    >
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Chỉnh sửa
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => onToggleStatus(station)}
                                    >
                                      {station.is_active ? (
                                        <>
                                          <PowerOff className="mr-2 h-4 w-4" />
                                          Ngừng hoạt động
                                        </>
                                      ) : (
                                        <>
                                          <Power className="mr-2 h-4 w-4" />
                                          Kích hoạt
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => {
                                        setSelectedStation(station);
                                        setDeleteDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Xóa
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>

                            {station.aliases?.length > 0 && (
                              <div className="mt-3">
                                <p className="text-sm text-muted-foreground break-words">
                                  {station.aliases.join(', ')}
                                </p>
                              </div>
                            )}

                            {station.schedules?.length > 0 && (
                              <div className="mt-3">
                                <div className="flex flex-wrap gap-1">
                                  {station.schedules.map((schedule, index) => (
                                    <Badge
                                      key={index}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {formatScheduleDay(schedule.day_of_week)}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">
                Không tìm thấy đài cược nào
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog chỉnh sửa đài cược */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa đài cược</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin cho đài cược
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onUpdateStation)}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên đài</FormLabel>
                    <FormControl>
                      <Input placeholder="Ví dụ: TP. HCM" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="region_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Miền</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn miền" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {regionsData?.data?.map((region) => (
                          <SelectItem
                            key={region.id}
                            value={region.id.toString()}
                          >
                            {region.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="aliases"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bí danh</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nhập các bí danh, cách nhau bởi dấu phẩy"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Kích hoạt</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Đài cược sẽ được hiển thị cho người dùng
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={updateStationMutation.isPending}
                >
                  {updateStationMutation.isPending
                    ? 'Đang lưu...'
                    : 'Lưu thay đổi'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Xác nhận xóa đài cược */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa đài cược</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa đài cược này? Hành động này không thể
              hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteStation}
              disabled={deleteStationMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteStationMutation.isPending ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
