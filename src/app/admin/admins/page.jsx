// src/app/admin/admins/page.jsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  PlusCircle,
  Search,
  Edit,
  Key,
  UserCog,
  CheckCircle,
  XCircle,
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
import { useAuth } from '@/providers/AuthProvider';
import { useServerQuery, useServerMutation } from '@/hooks/useServerAction';
import {
  fetchAdmins,
  createAdmin,
  updateAdmin,
  updateAdminPassword,
  updateAdminSettings,
  toggleAdminStatus,
} from '@/app/actions/admin';

export default function AdminsManagementPage() {
  const { isSuperAdmin } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    username: '',
    email: '',
    full_name: '',
    password: '',
    confirm_password: '',
    max_users: 10,
    is_active: true,
  });

  const {
    data: adminsResponse = { data: [] },
    isLoading,
    refetch,
    error: adminsError,
  } = useServerQuery(
    ['admins', searchQuery],
    async () => {
      return await fetchAdmins(searchQuery);
    },
    {
      enabled: isSuperAdmin,
      defaultData: { data: [] },
      onError: (error) => {
        toast.error('Error fetching admins: ' + error.message);
      },
    }
  );

  const admins = adminsResponse?.data || [];

  console.log('admins', admins);

  // Create admin mutation
  const createAdminMutation = useServerMutation(
    'createAdmin',
    async (data) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
      });
      return await createAdmin(formData);
    },
    {
      onSuccess: () => {
        toast.success('Tạo tài khoản admin mới thành công');
        setIsCreateDialogOpen(false);
        resetFormData();
        refetch();
      },
      onError: (error) => {
        toast.error(`Đã xảy ra lỗi: ${error.message}`);
      },
    }
  );

  // Update admin mutation
  const updateAdminMutation = useServerMutation(
    'updateAdmin',
    async (data) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
      });
      return await updateAdmin(formData);
    },
    {
      onSuccess: () => {
        toast.success('Cập nhật thông tin admin thành công');
        setIsCreateDialogOpen(false);
        resetFormData();
        refetch();
      },
      onError: (error) => {
        toast.error(`Đã xảy ra lỗi: ${error.message}`);
      },
    }
  );

  // Update admin password mutation
  const updatePasswordMutation = useServerMutation(
    'updateAdminPassword',
    async (data) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
      });
      return await updateAdminPassword(formData);
    },
    {
      onSuccess: () => {
        toast.success('Đổi mật khẩu thành công');
        setIsPasswordDialogOpen(false);
        resetFormData();
      },
      onError: (error) => {
        toast.error(`Đã xảy ra lỗi: ${error.message}`);
      },
    }
  );

  // Update admin settings mutation
  const updateSettingsMutation = useServerMutation(
    'updateAdminSettings',
    async (data) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
      });
      return await updateAdminSettings(formData);
    },
    {
      onSuccess: () => {
        toast.success('Cập nhật cài đặt thành công');
        setIsSettingsDialogOpen(false);
        refetch();
      },
      onError: (error) => {
        toast.error(`Đã xảy ra lỗi: ${error.message}`);
      },
    }
  );

  // Toggle admin status mutation
  const toggleStatusMutation = useServerMutation(
    'toggleAdminStatus',
    async ({ id, currentStatus }) => {
      return await toggleAdminStatus(id, currentStatus);
    },
    {
      onSuccess: (data, { currentStatus }) => {
        toast.success(
          `Đã ${currentStatus ? 'khóa' : 'kích hoạt'} tài khoản admin`
        );
        refetch();
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

  // Reset form data
  const resetFormData = () => {
    setFormData({
      id: '',
      username: '',
      email: '',
      full_name: '',
      password: '',
      confirm_password: '',
      max_users: 10,
      is_active: true,
    });
    setSelectedAdmin(null);
  };

  // Open create dialog
  const openCreateDialog = () => {
    resetFormData();
    setIsEditing(false);
    setIsCreateDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (admin) => {
    setSelectedAdmin(admin);
    setFormData({
      id: admin.id,
      username: admin.username || '',
      email: admin.email || '',
      full_name: admin.full_name || '',
      password: '',
      confirm_password: '',
      max_users: admin.settings?.max_users || 10,
      is_active: admin.is_active,
    });
    setIsEditing(true);
    setIsCreateDialogOpen(true);
  };

  // Open password dialog
  const openPasswordDialog = (admin) => {
    setSelectedAdmin(admin);
    setFormData({
      ...formData,
      id: admin.id,
      password: '',
      confirm_password: '',
    });
    setIsPasswordDialogOpen(true);
  };

  // Open settings dialog
  const openSettingsDialog = (admin) => {
    setSelectedAdmin(admin);
    setFormData({
      ...formData,
      id: admin.id,
      max_users: admin.settings?.max_users || 10,
    });
    setIsSettingsDialogOpen(true);
  };

  // Handle toggle admin status
  const handleToggleStatus = async (admin) => {
    toggleStatusMutation.mutate({
      id: admin.id,
      currentStatus: admin.is_active,
    });
  };

  // Handle save admin
  const handleSaveAdmin = async () => {
    // Validate form
    if (!formData.username || !formData.email) {
      toast.error('Vui lòng nhập đầy đủ thông tin tài khoản');
      return;
    }

    if (!isEditing && (!formData.password || formData.password.length < 6)) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (!isEditing && formData.password !== formData.confirm_password) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    if (isEditing) {
      // Update existing admin
      updateAdminMutation.mutate({
        id: formData.id,
        username: formData.username,
        email: formData.email,
        full_name: formData.full_name,
        is_active: formData.is_active,
        max_users: formData.max_users,
      });
    } else {
      // Create new admin
      createAdminMutation.mutate({
        username: formData.username,
        email: formData.email,
        full_name: formData.full_name,
        password: formData.password,
        max_users: formData.max_users,
      });
    }
  };

  // Handle change password
  const handleChangePassword = async () => {
    if (!formData.password || formData.password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    updatePasswordMutation.mutate({
      id: selectedAdmin.id,
      password: formData.password,
    });
  };

  // Handle update settings
  const handleUpdateSettings = async () => {
    if (isNaN(formData.max_users) || formData.max_users < 0) {
      toast.error('Số lượng user tối đa phải là số dương');
      return;
    }

    updateSettingsMutation.mutate({
      id: selectedAdmin.id,
      max_users: formData.max_users,
    });
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]:
        type === 'checkbox'
          ? checked
          : name === 'max_users'
            ? parseInt(value, 10) || 0
            : value,
    });
  };

  // Check if user has super admin role
  if (!isSuperAdmin) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Quyền truy cập bị từ chối</CardTitle>
            <CardDescription>
              Bạn không có quyền truy cập trang này.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push('/admin/dashboard')}
              className="w-full"
            >
              Quay lại Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Quản lý Admin</h1>
        <p className="text-muted-foreground">
          Quản lý tài khoản admin trong hệ thống
        </p>
      </div>

      <div className="flex justify-between items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Tìm kiếm admin..."
            className="w-full pl-8"
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
        <Button onClick={openCreateDialog}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Tạo Admin mới
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách Admin</CardTitle>
          <CardDescription>
            Quản lý tất cả tài khoản admin trong hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">Đang tải dữ liệu...</div>
          ) : admins.length === 0 ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              {adminsError
                ? `Lỗi: ${adminsError.message}`
                : 'Không tìm thấy admin nào.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên người dùng</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Họ tên</TableHead>
                  <TableHead>Số user tối đa</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">
                      {admin.username}
                    </TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>{admin.full_name || '--'}</TableCell>
                    <TableCell>{admin.settings?.max_users || '--'}</TableCell>
                    <TableCell>
                      {admin.is_active ? (
                        <Badge
                          variant="success"
                          className="bg-green-100 text-green-800 hover:bg-green-200"
                        >
                          Hoạt động
                        </Badge>
                      ) : (
                        <Badge
                          variant="destructive"
                          className="bg-red-100 text-red-800 hover:bg-red-200"
                        >
                          Bị khóa
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {admin.role_id !== 1 && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openEditDialog(admin)}
                            title="Chỉnh sửa"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openPasswordDialog(admin)}
                            title="Đổi mật khẩu"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openSettingsDialog(admin)}
                            title="Cài đặt"
                          >
                            <UserCog className="h-4 w-4" />
                          </Button>
                          <Button
                            variant={
                              admin.is_active ? 'destructive' : 'success'
                            }
                            size="icon"
                            onClick={() => handleToggleStatus(admin)}
                            disabled={toggleStatusMutation.isPending}
                            title={
                              admin.is_active
                                ? 'Khóa tài khoản'
                                : 'Kích hoạt tài khoản'
                            }
                          >
                            {toggleStatusMutation.isPending &&
                            toggleStatusMutation.variables?.id === admin.id ? (
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : admin.is_active ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog tạo/chỉnh sửa Admin */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Chỉnh sửa thông tin Admin' : 'Tạo Admin mới'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Cập nhật thông tin tài khoản admin'
                : 'Nhập thông tin để tạo tài khoản admin mới'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Tên người dùng <span className="text-destructive">*</span>
              </label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="admin123"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email <span className="text-destructive">*</span>
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="user@example.com"
                disabled={isEditing}
                className={isEditing ? 'opacity-70 cursor-not-allowed' : ''}
              />
              {isEditing && (
                <p className="text-xs text-muted-foreground mt-1">
                  Email không thể thay đổi sau khi tạo tài khoản
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="full_name" className="text-sm font-medium">
                Họ tên
              </label>
              <Input
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                placeholder="Nguyễn Văn A"
              />
            </div>

            {!isEditing && (
              <>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    Mật khẩu <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="confirm_password"
                    className="text-sm font-medium"
                  >
                    Xác nhận mật khẩu{' '}
                    <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    value={formData.confirm_password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <label htmlFor="max_users" className="text-sm font-medium">
                Số lượng User tối đa
              </label>
              <Input
                id="max_users"
                name="max_users"
                type="number"
                min="0"
                value={formData.max_users}
                onChange={handleInputChange}
                placeholder="10"
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
              onClick={handleSaveAdmin}
              disabled={
                createAdminMutation.isPending || updateAdminMutation.isPending
              }
            >
              {isEditing
                ? updateAdminMutation.isPending
                  ? 'Đang cập nhật...'
                  : 'Cập nhật'
                : createAdminMutation.isPending
                  ? 'Đang tạo...'
                  : 'Tạo mới'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog đổi mật khẩu */}
      <Dialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Đổi mật khẩu Admin</DialogTitle>
            <DialogDescription>
              Cập nhật mật khẩu mới cho tài khoản admin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Mật khẩu mới <span className="text-destructive">*</span>
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm_password" className="text-sm font-medium">
                Xác nhận mật khẩu <span className="text-destructive">*</span>
              </label>
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                value={formData.confirm_password}
                onChange={handleInputChange}
                placeholder="••••••••"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPasswordDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={updatePasswordMutation.isPending}
            >
              {updatePasswordMutation.isPending
                ? 'Đang cập nhật...'
                : 'Cập nhật mật khẩu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog cài đặt số lượng User tối đa */}
      <Dialog
        open={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cài đặt Admin</DialogTitle>
            <DialogDescription>
              Cập nhật cài đặt cho tài khoản admin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label
                htmlFor="settings_max_users"
                className="text-sm font-medium"
              >
                Số lượng User tối đa
              </label>
              <Input
                id="settings_max_users"
                name="max_users"
                type="number"
                min="0"
                value={formData.max_users}
                onChange={handleInputChange}
                placeholder="10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSettingsDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              onClick={handleUpdateSettings}
              disabled={updateSettingsMutation.isPending}
            >
              {updateSettingsMutation.isPending
                ? 'Đang cập nhật...'
                : 'Cập nhật cài đặt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
