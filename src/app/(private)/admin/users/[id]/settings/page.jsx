'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, ArrowLeft, Save, RefreshCw, Info } from 'lucide-react';

import { useAuth } from '@/providers/AuthProvider';
import { useServerQuery, useServerMutation } from '@/hooks/useServerAction';
import {
  getUserDetails,
  updateUserProfile,
  resetUserPassword,
  getUserStationAccess,
  batchUpdateUserStationAccess,
} from '@/app/actions/user-settings';

// Form schemas
const profileSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Tên đầy đủ phải có ít nhất 2 ký tự')
    .max(100, 'Tên đầy đủ không được vượt quá 100 ký tự'),
});

const passwordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .max(100, 'Mật khẩu không được vượt quá 100 ký tự'),
    confirmPassword: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

export default function UserSettingsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user: currentUser, isAdmin, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('account');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stationChanges, setStationChanges] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // If not admin or super admin, redirect to login
  useEffect(() => {
    if (!isAdmin && !isSuperAdmin) {
      router.push('/login');
    }
  }, [isAdmin, isSuperAdmin, router]);

  // Fetch user details
  const { data: userData, isLoading: isLoadingUser } = useServerQuery(
    ['user', id],
    () => getUserDetails(id),
    {
      enabled: !!id,
      onError: (error) => {
        toast.error('Lỗi khi tải thông tin người dùng: ' + error.message);
      },
    }
  );

  // Fetch user's station access
  const {
    data: stationsData,
    isLoading: isLoadingStations,
    refetch: refetchStationAccess,
  } = useServerQuery(['userStations', id], () => getUserStationAccess(id), {
    enabled: !!id,
    onError: (error) => {
      toast.error('Lỗi khi tải thông tin đài cược: ' + error.message);
    },
  });

  // User profile form
  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
    },
  });

  // Reset password form
  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Update profile form when user data loads
  useEffect(() => {
    if (userData?.data) {
      profileForm.reset({
        fullName: userData.data.full_name || '',
      });
    }
  }, [userData, profileForm]);

  // Update profile mutation
  const updateProfileMutation = useServerMutation(
    'updateUserProfile',
    (data) => updateUserProfile(id, data),
    {
      onSuccess: () => {
        toast.success('Thông tin người dùng đã được cập nhật');
      },
      onError: (error) => {
        toast.error('Lỗi khi cập nhật thông tin: ' + error.message);
      },
    }
  );

  // Reset password mutation
  const resetPasswordMutation = useServerMutation(
    'resetUserPassword',
    (data) => resetUserPassword(id, data),
    {
      onSuccess: () => {
        toast.success('Mật khẩu đã được khôi phục thành công');
        passwordForm.reset();
      },
      onError: (error) => {
        toast.error('Lỗi khi khôi phục mật khẩu: ' + error.message);
      },
    }
  );

  // Batch update station access mutation
  const batchUpdateStationAccessMutation = useServerMutation(
    'batchUpdateUserStationAccess',
    (updates) => batchUpdateUserStationAccess(id, currentUser?.id, updates),
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

  // Handle profile form submission
  const onSubmitProfile = (data) => {
    updateProfileMutation.mutate(data);
  };

  // Handle password form submission
  const onSubmitPassword = (data) => {
    resetPasswordMutation.mutate(data.newPassword);
  };

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

  // Loading state
  if (isLoadingUser) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-lg">Đang tải thông tin người dùng...</p>
      </div>
    );
  }

  // No user found
  if (!userData?.data) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription>
            Không tìm thấy thông tin người dùng hoặc bạn không có quyền truy
            cập.
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => router.push('/admin/users')}
          className="mt-4"
          variant="outline"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
      </div>
    );
  }

  const user = userData.data;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin/users')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Cài đặt tài khoản</h1>
            <p className="text-muted-foreground">
              Quản lý cài đặt cho tài khoản {user.username || user.email}
            </p>
          </div>
        </div>
        <div className="flex items-center">
          <Badge variant={user.is_active ? 'default' : 'destructive'}>
            {user.is_active ? 'Đang hoạt động' : 'Đã khóa'}
          </Badge>
        </div>
      </div>

      <Tabs
        defaultValue="account"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="account">Thông tin tài khoản</TabsTrigger>
          <TabsTrigger value="stations">Cài đặt đài xổ số</TabsTrigger>
          <TabsTrigger value="rewards" disabled>
            Hệ số tính thưởng
          </TabsTrigger>
          <TabsTrigger value="multipliers" disabled>
            Hệ số nhân
          </TabsTrigger>
        </TabsList>

        {/* Account Settings Tab */}
        <TabsContent value="account" className="space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin tài khoản</CardTitle>
              <CardDescription>
                Chỉnh sửa thông tin cơ bản của tài khoản người dùng
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form
                  onSubmit={profileForm.handleSubmit(onSubmitProfile)}
                  className="space-y-4"
                >
                  <FormField
                    control={profileForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên đầy đủ</FormLabel>
                        <FormControl>
                          <Input placeholder="Nguyễn Văn A" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid w-full items-center gap-1.5">
                    <FormLabel>Tên đăng nhập</FormLabel>
                    <Input value={user.username || ''} disabled />
                    <p className="text-sm text-muted-foreground">
                      Tên đăng nhập không thể thay đổi
                    </p>
                  </div>

                  <div className="grid w-full items-center gap-1.5">
                    <FormLabel>Email</FormLabel>
                    <Input value={user.email || ''} disabled />
                    <p className="text-sm text-muted-foreground">
                      Email được tạo tự động và không thể thay đổi
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      'Lưu thay đổi'
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Reset Password */}
          <Card>
            <CardHeader>
              <CardTitle>Khôi phục mật khẩu</CardTitle>
              <CardDescription>
                Thiết lập mật khẩu mới cho tài khoản người dùng
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form
                  onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
                  className="space-y-4"
                >
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mật khẩu mới</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Xác nhận mật khẩu</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={resetPasswordMutation.isPending}
                  >
                    {resetPasswordMutation.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Đang khôi phục...
                      </>
                    ) : (
                      'Khôi phục mật khẩu'
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Station Settings Tab */}
        <TabsContent value="stations">
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
                  <p className="text-muted-foreground">
                    Đang tải dữ liệu đài...
                  </p>
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
                    <Select
                      value={selectedRegion}
                      onValueChange={setSelectedRegion}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Chọn miền" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả các miền</SelectItem>
                        {regions.map((region) => (
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

                  {hasUnsavedChanges && (
                    <div className="mb-6">
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Thay đổi chưa được lưu</AlertTitle>
                        <AlertDescription>
                          Bạn đã thay đổi cài đặt của một số đài xổ số. Hãy nhấn
                          nút Lưu thay đổi để áp dụng.
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
                          <h3 className="text-lg font-semibold">
                            {region.name}
                          </h3>
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
                                  <div className="font-medium">
                                    {station.name}
                                  </div>
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
        </TabsContent>

        {/* Placeholder Tabs */}
        <TabsContent value="rewards">
          <Card>
            <CardHeader>
              <CardTitle>Hệ số tính thưởng</CardTitle>
              <CardDescription>
                Tính năng này sẽ được phát triển trong phiên bản tiếp theo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-10">
                <p>Chức năng đang được phát triển</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="multipliers">
          <Card>
            <CardHeader>
              <CardTitle>Hệ số nhân</CardTitle>
              <CardDescription>
                Tính năng này sẽ được phát triển trong phiên bản tiếp theo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-10">
                <p>Chức năng đang được phát triển</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
