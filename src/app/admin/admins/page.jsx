'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
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
    username: '',
    email: '',
    full_name: '',
    password: '',
    confirm_password: '',
    max_users: 10,
  });

  // Fetch admins list
  const {
    data: admins = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['admins', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      const { data } = await axios.get(`/api/admins?${params}`);
      return data;
    },
    enabled: isSuperAdmin,
  });

  // Tìm kiếm Admin
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  // Reset form data
  const resetFormData = () => {
    setFormData({
      username: '',
      email: '',
      full_name: '',
      password: '',
      confirm_password: '',
      max_users: 10,
    });
    setSelectedAdmin(null);
  };

  // Mở dialog tạo Admin mới
  const openCreateDialog = () => {
    resetFormData();
    setIsEditing(false);
    setIsCreateDialogOpen(true);
  };

  // Mở dialog chỉnh sửa Admin
  const openEditDialog = (admin) => {
    setSelectedAdmin(admin);
    setFormData({
      username: admin.username || '',
      email: admin.email || '',
      full_name: admin.full_name || '',
      password: '',
      confirm_password: '',
      max_users: admin.settings?.max_users || 10,
    });
    setIsEditing(true);
    setIsCreateDialogOpen(true);
  };

  // Mở dialog đổi mật khẩu
  const openPasswordDialog = (admin) => {
    setSelectedAdmin(admin);
    setFormData({
      ...formData,
      password: '',
      confirm_password: '',
    });
    setIsPasswordDialogOpen(true);
  };

  // Mở dialog cài đặt số lượng User
  const openSettingsDialog = (admin) => {
    setSelectedAdmin(admin);
    setFormData({
      ...formData,
      max_users: admin.settings?.max_users || 10,
    });
    setIsSettingsDialogOpen(true);
  };

  // Xử lý thay đổi trạng thái Admin
  const handleToggleStatus = async (admin) => {
    try {
      await axios.put(`/api/admins/${admin.id}`, {
        ...admin,
        is_active: !admin.is_active,
      });

      toast.success(
        `Đã ${admin.is_active ? 'khóa' : 'kích hoạt'} tài khoản admin`
      );
      refetch();
    } catch (error) {
      toast.error('Đã xảy ra lỗi khi cập nhật trạng thái admin');
      console.error(error);
    }
  };

  // Xử lý tạo/chỉnh sửa Admin
  const handleSaveAdmin = async () => {
    try {
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
        await axios.put(`/api/admins/${selectedAdmin.id}`, {
          username: formData.username,
          email: formData.email,
          full_name: formData.full_name,
        });

        // Update admin settings
        await axios.put(`/api/admins/${selectedAdmin.id}/settings`, {
          max_users: formData.max_users,
        });

        toast.success('Cập nhật thông tin admin thành công');
      } else {
        // Create new admin
        await axios.post('/api/admins', {
          username: formData.username,
          email: formData.email,
          full_name: formData.full_name,
          password: formData.password,
        });

        toast.success('Tạo tài khoản admin mới thành công');
      }

      setIsCreateDialogOpen(false);
      resetFormData();
      refetch();
    } catch (error) {
      toast.error(
        `Đã xảy ra lỗi: ${error.response?.data?.error || error.message}`
      );
      console.error(error);
    }
  };

  // Xử lý đổi mật khẩu
  const handleChangePassword = async () => {
    try {
      if (!formData.password || formData.password.length < 6) {
        toast.error('Mật khẩu phải có ít nhất 6 ký tự');
        return;
      }

      if (formData.password !== formData.confirm_password) {
        toast.error('Mật khẩu xác nhận không khớp');
        return;
      }

      await axios.put(`/api/admins/${selectedAdmin.id}/password`, {
        password: formData.password,
      });

      toast.success('Đổi mật khẩu thành công');
      setIsPasswordDialogOpen(false);
      resetFormData();
    } catch (error) {
      toast.error(
        `Đã xảy ra lỗi: ${error.response?.data?.error || error.message}`
      );
      console.error(error);
    }
  };

  // Xử lý cập nhật số lượng User tối đa
  const handleUpdateSettings = async () => {
    try {
      if (isNaN(formData.max_users) || formData.max_users < 0) {
        toast.error('Số lượng user tối đa phải là số dương');
        return;
      }

      await axios.put(`/api/admins/${selectedAdmin.id}/settings`, {
        max_users: formData.max_users,
      });

      toast.success('Cập nhật cài đặt thành công');
      setIsSettingsDialogOpen(false);
      refetch();
    } catch (error) {
      toast.error(
        `Đã xảy ra lỗi: ${error.response?.data?.error || error.message}`
      );
      console.error(error);
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'max_users' ? parseInt(value, 10) || 0 : value,
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
              Không tìm thấy admin nào.
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
                          variant={admin.is_active ? 'destructive' : 'success'}
                          size="icon"
                          onClick={() => handleToggleStatus(admin)}
                          title={
                            admin.is_active
                              ? 'Khóa tài khoản'
                              : 'Kích hoạt tài khoản'
                          }
                        >
                          {admin.is_active ? (
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
                placeholder="admin@example.com"
              />
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
            <Button onClick={handleSaveAdmin}>
              {isEditing ? 'Cập nhật' : 'Tạo mới'}
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
            <Button onClick={handleChangePassword}>Cập nhật mật khẩu</Button>
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
            <Button onClick={handleUpdateSettings}>Cập nhật cài đặt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
