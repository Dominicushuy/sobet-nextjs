// src/app/admin/stations/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  PlusCircle,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Filter,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/providers/AuthProvider';
import { useServerQuery, useServerMutation } from '@/hooks/useServerAction';
import {
  fetchStations,
  createStation,
  updateStation,
  deleteStation,
  toggleStationStatus,
} from '@/app/actions/station';

// Định nghĩa các miền cố định
const REGIONS = [
  { id: null, code: 'all', name: 'Tất cả miền' },
  { id: 1, code: 'north', name: 'Miền Bắc' },
  { id: 2, code: 'central', name: 'Miền Trung' },
  { id: 3, code: 'south', name: 'Miền Nam' },
];

export default function StationsManagementPage() {
  const { isSuperAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    region_id: '',
    aliases: '',
    is_active: true,
  });

  // Fetch stations
  const {
    data: stationsResponse = { data: [] },
    isLoading: isLoadingStations,
    refetch: refetchStations,
  } = useServerQuery(
    ['stations', selectedRegion],
    async () => {
      return await fetchStations(selectedRegion);
    },
    {
      defaultData: [],
      onError: (error) => {
        toast.error('Lỗi khi tải dữ liệu đài xổ số: ' + error.message);
      },
    }
  );

  const stations = stationsResponse.data || [];

  // Create station mutation
  const createStationMutation = useServerMutation(
    'createStation',
    async (data) => {
      return await createStation(data);
    },
    {
      onSuccess: () => {
        toast.success('Đài xổ số mới được tạo thành công');
        setIsCreateDialogOpen(false);
        resetFormData();
        refetchStations();
      },
      onError: (error) => {
        toast.error(`Đã xảy ra lỗi: ${error.message}`);
      },
    }
  );

  // Update station mutation
  const updateStationMutation = useServerMutation(
    'updateStation',
    async (data) => {
      const { id, ...updateData } = data;
      return await updateStation(id, updateData);
    },
    {
      onSuccess: () => {
        toast.success('Đài xổ số đã được cập nhật thành công');
        setIsCreateDialogOpen(false);
        resetFormData();
        refetchStations();
      },
      onError: (error) => {
        toast.error(`Đã xảy ra lỗi: ${error.message}`);
      },
    }
  );

  // Delete station mutation
  const deleteStationMutation = useServerMutation(
    'deleteStation',
    async (id) => {
      return await deleteStation(id);
    },
    {
      onSuccess: () => {
        toast.success('Đài xổ số đã được xóa thành công');
        setIsDeleteDialogOpen(false);
        refetchStations();
      },
      onError: (error) => {
        toast.error(`Đã xảy ra lỗi: ${error.message}`);
      },
    }
  );

  // Toggle station status mutation
  const toggleStatusMutation = useServerMutation(
    'toggleStationStatus',
    async ({ id, currentStatus }) => {
      return await toggleStationStatus(id, currentStatus);
    },
    {
      onSuccess: (data, { currentStatus }) => {
        toast.success(
          `Đã ${currentStatus ? 'tạm dừng' : 'kích hoạt'} đài xổ số`
        );
        refetchStations();
      },
      onError: (error) => {
        toast.error(`Đã xảy ra lỗi: ${error.message}`);
      },
    }
  );

  // Handle search
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  // Filter stations by search query
  const filteredStations = stations.filter((station) => {
    if (!searchQuery) return true;

    const search = searchQuery.toLowerCase();
    return (
      station.name.toLowerCase().includes(search) ||
      station.region?.name?.toLowerCase().includes(search) ||
      station.aliases?.some((alias) => alias.toLowerCase().includes(search))
    );
  });

  // Reset form data
  const resetFormData = () => {
    setFormData({
      id: '',
      name: '',
      region_id: '',
      aliases: '',
      is_active: true,
    });
    setSelectedStation(null);
  };

  // Open create dialog
  const openCreateDialog = () => {
    resetFormData();
    setIsEditing(false);
    setIsCreateDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (station) => {
    setSelectedStation(station);
    setFormData({
      id: station.id,
      name: station.name || '',
      region_id: station.region_id || '',
      aliases: station.aliases?.join(', ') || '',
      is_active: station.is_active,
    });
    setIsEditing(true);
    setIsCreateDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (station) => {
    setSelectedStation(station);
    setIsDeleteDialogOpen(true);
  };

  // Handle toggle station status
  const handleToggleStatus = async (station) => {
    toggleStatusMutation.mutate({
      id: station.id,
      currentStatus: station.is_active,
    });
  };

  // Handle save station
  const handleSaveStation = async () => {
    // Validate form
    if (!formData.name || !formData.region_id) {
      toast.error('Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }

    // Prepare aliases array
    const aliases = formData.aliases
      ? formData.aliases.split(',').map((alias) => alias.trim())
      : [];

    if (isEditing) {
      // Update existing station
      updateStationMutation.mutate({
        id: formData.id,
        name: formData.name,
        region_id: formData.region_id,
        aliases,
        is_active: formData.is_active,
      });
    } else {
      // Create new station
      createStationMutation.mutate({
        name: formData.name,
        region_id: formData.region_id,
        aliases,
        is_active: true,
      });
    }
  };

  // Handle delete station
  const handleDeleteStation = async () => {
    if (selectedStation) {
      deleteStationMutation.mutate(selectedStation.id);
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  // Handle select change
  const handleSelectChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Group stations by region
  const stationsByRegion = filteredStations.reduce((acc, station) => {
    const regionName = station.region?.name || 'Unknown';
    if (!acc[regionName]) {
      acc[regionName] = [];
    }
    acc[regionName].push(station);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Quản lý đài xổ số</h1>
        <p className="text-muted-foreground">
          Quản lý các đài xổ số theo miền và tỉnh thành
        </p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm kiếm đài..."
              className="w-full pl-8"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
          <Select
            value={selectedRegion ? selectedRegion.toString() : 'all'}
            onValueChange={(value) =>
              setSelectedRegion(value === 'all' ? null : parseInt(value))
            }
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <span className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Tất cả miền" />
              </span>
            </SelectTrigger>
            <SelectContent>
              {REGIONS.map((region) => (
                <SelectItem
                  key={region.code}
                  value={region.id ? region.id.toString() : 'all'}
                >
                  {region.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isSuperAdmin && (
          <Button onClick={openCreateDialog}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Thêm đài mới
          </Button>
        )}
      </div>

      {isLoadingStations ? (
        <div className="flex justify-center py-8">Đang tải dữ liệu...</div>
      ) : Object.keys(stationsByRegion).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <p className="text-muted-foreground mb-4">
              Không tìm thấy đài xổ số nào.
            </p>
            {isSuperAdmin && (
              <Button onClick={openCreateDialog}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Thêm đài mới
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        Object.entries(stationsByRegion).map(([regionName, regionStations]) => (
          <Card key={regionName} className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle>{regionName}</CardTitle>
              <CardDescription>
                {regionStations.length} đài xổ số
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên đài</TableHead>
                    <TableHead>Bí danh</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regionStations.map((station) => (
                    <TableRow key={station.id}>
                      <TableCell className="font-medium">
                        {station.name}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md overflow-hidden truncate">
                          {station.aliases?.length > 0
                            ? station.aliases.join(', ')
                            : '--'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {station.is_active ? (
                          <Badge
                            variant="default"
                            className="bg-green-100 text-green-800 hover:bg-green-200"
                          >
                            Hoạt động
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-red-100 text-red-800 hover:bg-red-200"
                          >
                            Tạm dừng
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {isSuperAdmin && (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => openEditDialog(station)}
                                title="Chỉnh sửa"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => openDeleteDialog(station)}
                                title="Xóa"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant={
                              station.is_active ? 'destructive' : 'default'
                            }
                            size="icon"
                            onClick={() => handleToggleStatus(station)}
                            disabled={toggleStatusMutation.isPending}
                            title={station.is_active ? 'Tạm dừng' : 'Kích hoạt'}
                          >
                            {toggleStatusMutation.isPending &&
                            toggleStatusMutation.variables?.id ===
                              station.id ? (
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : station.is_active ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}

      {/* Dialog tạo/chỉnh sửa đài */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Chỉnh sửa đài xổ số' : 'Thêm đài xổ số mới'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Cập nhật thông tin đài xổ số'
                : 'Nhập thông tin để tạo đài xổ số mới'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Tên đài <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Tên đài xổ số"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region_id">
                Miền <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.region_id.toString() || 'none'}
                onValueChange={(value) =>
                  handleSelectChange('region_id', value === 'none' ? '' : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn miền" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Chọn miền</SelectItem>
                  {REGIONS.filter((r) => r.id !== null).map((region) => (
                    <SelectItem key={region.id} value={region.id.toString()}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="aliases">Bí danh (phân cách bằng dấu phẩy)</Label>
              <Textarea
                id="aliases"
                name="aliases"
                value={formData.aliases}
                onChange={handleInputChange}
                placeholder="vd: tphcm, hcm, tp"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              onClick={handleSaveStation}
              disabled={
                createStationMutation.isPending ||
                updateStationMutation.isPending
              }
            >
              {isEditing
                ? updateStationMutation.isPending
                  ? 'Đang cập nhật...'
                  : 'Cập nhật'
                : createStationMutation.isPending
                  ? 'Đang tạo...'
                  : 'Tạo mới'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog xác nhận xóa */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa đài xổ số &quot;{selectedStation?.name}
              &quot;? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteStation}
              disabled={deleteStationMutation.isPending}
            >
              {deleteStationMutation.isPending ? 'Đang xóa...' : 'Xóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
