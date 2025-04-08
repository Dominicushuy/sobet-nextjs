'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, RefreshCw, Info, Save } from 'lucide-react';

import { useServerQuery, useServerMutation } from '@/hooks/useServerAction';
import {
  getUserStationAccess,
  batchUpdateUserStationAccess,
} from '@/app/actions/user-settings';

export default function StationsTab({ userId, currentUser }) {
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stationChanges, setStationChanges] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch user's station access
  const {
    data: stationsData,
    isLoading: isLoadingStations,
    refetch: refetchStationAccess,
  } = useServerQuery(
    ['userStations', userId],
    () => getUserStationAccess(userId),
    {
      enabled: !!userId,
      onError: (error) => {
        toast.error('Lỗi khi tải thông tin đài cược: ' + error.message);
      },
    }
  );

  // Batch update station access mutation
  const batchUpdateStationAccessMutation = useServerMutation(
    'batchUpdateUserStationAccess',
    (updates) => batchUpdateUserStationAccess(userId, currentUser?.id, updates),
    {
      onSuccess: () => {
        toast.success('Cập nhật quyền truy cập đài thành công');
        setStationChanges({});
        setHasUnsavedChanges(false);
        refetchStationAccess();
      },
      onError: (error) => {
        toast.error('Lỗi khi cập nhật quyền truy cập: ' + error.message);
      },
    }
  );

  // Handle station toggle
  const handleStationToggle = (stationId, isEnabled, accessId) => {
    setStationChanges((prev) => ({
      ...prev,
      [stationId]: { stationId, isEnabled, accessId },
    }));
    setHasUnsavedChanges(true);
  };

  // Handle save station changes
  const handleSaveStationChanges = () => {
    const updates = Object.values(stationChanges);
    if (updates.length > 0) {
      batchUpdateStationAccessMutation.mutate(updates);
    }
  };

  // Filter stations by region and search term
  const filteredStations =
    stationsData?.data?.stations?.filter((station) => {
      if (
        selectedRegion !== 'all' &&
        station.region_id !== parseInt(selectedRegion)
      ) {
        return false;
      }
      if (
        searchTerm &&
        !station.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        // Also check aliases
        if (
          !station.aliases ||
          !station.aliases.some((alias) =>
            alias.toLowerCase().includes(searchTerm.toLowerCase())
          )
        ) {
          return false;
        }
      }
      return true;
    }) || [];

  // Extract unique regions from stations
  const regions = stationsData?.data?.stations
    ? Array.from(
        new Set(stationsData.data.stations.map((station) => station.region_id))
      ).map((regionId) => {
        const regionName =
          regionId === 1
            ? 'Miền Bắc'
            : regionId === 2
              ? 'Miền Trung'
              : regionId === 3
                ? 'Miền Nam'
                : 'Khác';
        return {
          id: regionId,
          name: regionName,
        };
      })
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cài đặt đài xổ số</CardTitle>
        <CardDescription>
          Quản lý các đài xổ số mà người dùng có thể truy cập
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingStations ? (
          <div className="flex flex-col items-center justify-center py-10">
            <RefreshCw className="h-6 w-6 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Đang tải dữ liệu đài...</p>
          </div>
        ) : (
          <>
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
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Chọn miền" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả các miền</SelectItem>
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={region.id.toString()}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasUnsavedChanges && (
              <div className="mb-6">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Thay đổi chưa được lưu</AlertTitle>
                  <AlertDescription>
                    Bạn đã thay đổi cài đặt của một số đài xổ số. Hãy nhấn nút
                    Lưu thay đổi để áp dụng.
                  </AlertDescription>
                </Alert>
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={handleSaveStationChanges}
                    disabled={batchUpdateStationAccessMutation.isPending}
                  >
                    {batchUpdateStationAccessMutation.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Lưu thay đổi
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {regions.map((region) => {
                const regionStations = filteredStations.filter(
                  (station) => station.region_id === region.id
                );

                // Skip regions with no stations
                if (
                  selectedRegion !== 'all' &&
                  parseInt(selectedRegion) !== region.id
                ) {
                  return null;
                }

                if (regionStations.length === 0) {
                  return null;
                }

                return (
                  <div key={region.id} className="space-y-2">
                    <h3 className="text-lg font-semibold">{region.name}</h3>
                    <Separator />
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                      {regionStations.map((station) => {
                        // Get current state (either from changes or original data)
                        const isEnabled = stationChanges[station.id]
                          ? stationChanges[station.id].isEnabled
                          : station.is_enabled;

                        return (
                          <div
                            key={station.id}
                            className="flex items-center justify-between p-4 rounded-lg border"
                          >
                            <div className="font-medium">{station.name}</div>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) =>
                                handleStationToggle(
                                  station.id,
                                  checked,
                                  station.access_id
                                )
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {filteredStations.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">
                    {searchTerm
                      ? 'Không tìm thấy đài cược nào khớp với từ khóa tìm kiếm'
                      : 'Không có đài cược nào'}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <p className="text-sm text-muted-foreground">
          Người dùng chỉ có thể truy cập các đài được bật
        </p>
        {hasUnsavedChanges && (
          <Button
            onClick={handleSaveStationChanges}
            disabled={batchUpdateStationAccessMutation.isPending}
          >
            {batchUpdateStationAccessMutation.isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Lưu thay đổi
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
