'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  PlusCircle,
  Search,
  Edit,
  Key,
  CheckCircle,
  XCircle,
  Trash2,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/providers/AuthProvider';
import { useServerQuery, useServerMutation } from '@/hooks/useServerAction';
import {
  fetchUsers,
  getUserMaxCount,
  getCurrentUserCount,
  createUser,
  updateUser,
  resetUserPassword,
  toggleUserStatus,
  deleteUser,
  getTotalUserCount,
} from '@/app/actions/users';

export default function UsersManagementPage() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [formData, setFormData] = useState({
    id: '',
    username: '',
    email: '',
    full_name: '',
    password: '',
    confirm_password: '',
    is_active: true,
  });

  // Fetch users list
  const getUsersList = useCallback(async () => {
    if (!user?.id) return { data: [], total: 0 };

    // For super admin, we'll modify this later to fetch all users
    // instead of just the ones created by this admin
    return await fetchUsers(user.id, searchQuery, currentPage, pageSize);
  }, [user?.id, searchQuery, currentPage, pageSize]);

  const {
    data: usersData = { data: [], total: 0 },
    isLoading,
    refetch,
    error: usersError,
  } = useServerQuery(
    ['users', user?.id, searchQuery, currentPage],
    getUsersList,
    {
      enabled: !!user?.id && (isAdmin || isSuperAdmin),
      defaultData: { data: [], total: 0 },
      onError: (error) => {
        toast.error('Error fetching users: ' + error.message);
      },
    }
  );

  const users = usersData.data || [];
  const totalUsers = usersData.total || 0;
  const totalPages = Math.ceil(totalUsers / pageSize);

  // Get user limit info - super admins should see total counts
  const getUserLimit = useCallback(async () => {
    if (!user?.id) return { maxUsers: 0, currentCount: 0 };

    if (isSuperAdmin) {
      const totalUserCount = await getTotalUserCount();

      return { maxUsers: null, currentCount: totalUserCount.data || 0 };
    } else {
      // For regular admin, get their limits
      const [maxUsersResult, currentCountResult] = await Promise.all([
        getUserMaxCount(user.id),
        getCurrentUserCount(user.id),
      ]);

      console.log('maxUsersResult', maxUsersResult);
      console.log('currentCountResult', currentCountResult);

      return {
        maxUsers: maxUsersResult.data || 0,
        currentCount: currentCountResult.data || 0,
        error: maxUsersResult.error || currentCountResult.error,
      };
    }
  }, [user?.id, isSuperAdmin]);

  const {
    data: userLimit = { maxUsers: 0, currentCount: 0 },
    isLoading: isLoadingLimit,
  } = useServerQuery(['userLimit', user?.id, isSuperAdmin], getUserLimit, {
    enabled: !!user?.id,
    defaultData: { maxUsers: 0, currentCount: 0 },
    onError: (error) => {
      toast.error('Error fetching user limit: ' + error.message);
    },
  });

  // Create user mutation
  const createUserMutation = useServerMutation(
    'createUser',
    async (data) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
      });
      return await createUser(formData);
    },
    {
      onSuccess: () => {
        toast.success('Tạo tài khoản người dùng mới thành công');
        setIsCreateDialogOpen(false);
        resetFormData();
        refetch();
      },
      onError: (error) => {
        toast.error(`Đã xảy ra lỗi: ${error.message}`);
      },
    }
  );

  // Update user mutation
  const updateUserMutation = useServerMutation(
    'updateUser',
    async (data) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
      });
      return await updateUser(formData);
    },
    {
      onSuccess: () => {
        toast.success('Cập nhật thông tin người dùng thành công');
        setIsCreateDialogOpen(false);
        resetFormData();
        refetch();
      },
      onError: (error) => {
        toast.error(`Đã xảy ra lỗi: ${error.message}`);
      },
    }
  );

  // Reset user password mutation
  const resetPasswordMutation = useServerMutation(
    'resetUserPassword',
    async (data) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
      });
      return await resetUserPassword(formData);
    },
    {
      onSuccess: () => {
        toast.success('Đặt lại mật khẩu thành công');
        setIsPasswordDialogOpen(false);
        resetFormData();
      },
      onError: (error) => {
        toast.error(`Đã xảy ra lỗi: ${error.message}`);
      },
    }
  );

  // Toggle user status mutation
  const toggleStatusMutation = useServerMutation(
    'toggleUserStatus',
    async ({ id, currentStatus }) => {
      return await toggleUserStatus(id, currentStatus);
    },
    {
      onSuccess: (data, { currentStatus }) => {
        toast.success(
          `Đã ${currentStatus ? 'khóa' : 'kích hoạt'} tài khoản người dùng`
        );
        refetch();
      },
      onError: (error) => {
        toast.error(`Đã xảy ra lỗi: ${error.message}`);
      },
    }
  );

  // Delete user mutation
  const deleteUserMutation = useServerMutation(
    'deleteUser',
    async (id) => {
      return await deleteUser(id);
    },
    {
      onSuccess: () => {
        toast.success('Xóa tài khoản người dùng thành công');
        setIsDeleteDialogOpen(false);
        setSelectedUser(null);
        refetch();
      },
      onError: (error) => {
        toast.error(`Đã xảy ra lỗi: ${error.message}`);
      },
    }
  );

  // Check if user can add more users
  // Super admins can't add users, only view them
  const canAddMoreUsers =
    isAdmin &&
    !isSuperAdmin &&
    !isLoadingLimit &&
    userLimit.currentCount < userLimit.maxUsers;

  // Handle search
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
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
      is_active: true,
    });
    setSelectedUser(null);
  };

  // Open create dialog
  const openCreateDialog = () => {
    if (!canAddMoreUsers) {
      toast.error(
        `Đã đạt giới hạn số lượng người dùng (${userLimit.maxUsers}). Liên hệ Super Admin để tăng giới hạn.`
      );
      return;
    }

    resetFormData();
    setIsEditing(false);
    setIsCreateDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (userData) => {
    setSelectedUser(userData);
    setFormData({
      id: userData.id,
      username: userData.username || '',
      email: userData.email || '',
      full_name: userData.full_name || '',
      password: '',
      confirm_password: '',
      is_active: userData.is_active,
    });
    setIsEditing(true);
    setIsCreateDialogOpen(true);
  };

  // Open password dialog
  const openPasswordDialog = (userData) => {
    setSelectedUser(userData);
    setFormData({
      ...formData,
      id: userData.id,
      password: '',
      confirm_password: '',
    });
    setIsPasswordDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (userData) => {
    setSelectedUser(userData);
    setIsDeleteDialogOpen(true);
  };

  // Handle toggle user status
  const handleToggleStatus = async (userData) => {
    toggleStatusMutation.mutate({
      id: userData.id,
      currentStatus: userData.is_active,
    });
  };

  // Handle save user
  const handleSaveUser = async () => {
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
      // Update existing user
      updateUserMutation.mutate({
        id: formData.id,
        username: formData.username,
        email: formData.email,
        full_name: formData.full_name,
        is_active: formData.is_active,
      });
    } else {
      // Create new user
      createUserMutation.mutate({
        admin_id: user.id,
        username: formData.username,
        email: formData.email,
        full_name: formData.full_name,
        password: formData.password,
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

    resetPasswordMutation.mutate({
      id: selectedUser.id,
      password: formData.password,
    });
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    deleteUserMutation.mutate(selectedUser.id);
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Check if user has access
  if (!isAdmin && !isSuperAdmin) {
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
              onClick={() => router.push('/dashboard')}
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
        <h1 className="text-3xl font-bold">Quản lý Người dùng</h1>
        <p className="text-muted-foreground">
          Quản lý tài khoản người dùng trong hệ thống
        </p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Tìm kiếm người dùng..."
            className="w-full pl-8"
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
        {isSuperAdmin ? (
          <div className="flex gap-4 items-center">
            <div className="text-sm text-muted-foreground">
              {isLoadingLimit ? (
                'Đang tải...'
              ) : (
                <>
                  Tổng số người dùng: <strong>{userLimit.currentCount}</strong>
                </>
              )}
            </div>
            <div className="text-sm bg-amber-100 text-amber-800 px-3 py-2 rounded-md">
              Chế độ xem - Super Admin chỉ có thể xem danh sách người dùng
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              {isLoadingLimit ? (
                'Đang tải...'
              ) : (
                <>
                  Người dùng: <strong>{userLimit.currentCount}</strong> /{' '}
                  <strong>{userLimit.maxUsers}</strong>
                </>
              )}
            </div>
            <Button onClick={openCreateDialog} disabled={!canAddMoreUsers}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Tạo Người dùng mới
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách Người dùng</CardTitle>
          <CardDescription>
            Quản lý tất cả tài khoản người dùng trong hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">Đang tải dữ liệu...</div>
          ) : users.length === 0 ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              {usersError
                ? `Lỗi: ${usersError.message}`
                : 'Không tìm thấy người dùng nào.'}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên người dùng</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Họ tên</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((userData) => (
                    <TableRow key={userData.id}>
                      <TableCell className="font-medium">
                        {userData.username}
                      </TableCell>
                      <TableCell>{userData.email}</TableCell>
                      <TableCell>{userData.full_name || '--'}</TableCell>
                      <TableCell>
                        {userData.is_active ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
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
                        {isSuperAdmin ? (
                          <div className="text-sm text-muted-foreground italic">
                            Chỉ xem
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEditDialog(userData)}
                              title="Chỉnh sửa"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openPasswordDialog(userData)}
                              title="Đặt lại mật khẩu"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              variant={
                                userData.is_active ? 'destructive' : 'outline'
                              }
                              size="icon"
                              onClick={() => handleToggleStatus(userData)}
                              title={
                                userData.is_active
                                  ? 'Khóa tài khoản'
                                  : 'Kích hoạt tài khoản'
                              }
                            >
                              {userData.is_active ? (
                                <XCircle className="h-4 w-4" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => openDeleteDialog(userData)}
                              title="Xóa tài khoản"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="text-sm">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog for creating/editing users */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditing
                ? 'Chỉnh sửa thông tin Người dùng'
                : 'Tạo Người dùng mới'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Cập nhật thông tin tài khoản người dùng'
                : 'Nhập thông tin để tạo tài khoản người dùng mới'}
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
                placeholder="user123"
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              onClick={handleSaveUser}
              disabled={
                createUserMutation.isPending || updateUserMutation.isPending
              }
            >
              {isEditing
                ? updateUserMutation.isPending
                  ? 'Đang cập nhật...'
                  : 'Cập nhật'
                : createUserMutation.isPending
                  ? 'Đang tạo...'
                  : 'Tạo mới'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for password reset */}
      <Dialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Đặt lại mật khẩu Người dùng</DialogTitle>
            <DialogDescription>
              Cập nhật mật khẩu mới cho tài khoản người dùng
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
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending
                ? 'Đang cập nhật...'
                : 'Cập nhật mật khẩu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog for confirming user deletion */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa tài khoản</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa tài khoản người dùng này? Hành động này
              không thể phục hồi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
