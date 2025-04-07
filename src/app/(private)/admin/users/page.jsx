// src/app/(private)/admin/users/page.jsx

'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  Pencil,
  MoreHorizontal,
  Power,
  PowerOff,
  KeyRound,
  RefreshCw,
  X,
  Filter,
  Info,
} from 'lucide-react';
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
import { Calendar } from '@/components/ui/calendar';
import { useServerQuery, useServerMutation } from '@/hooks/useServerAction';
import { useAuth } from '@/providers/AuthProvider';
import {
  fetchUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  resetUserPassword,
  checkUserLimit,
} from '@/app/actions/users';

// Form schema cho việc tạo user
const createUserSchema = z.object({
  username: z
    .string()
    .min(4, 'Username phải có ít nhất 4 ký tự')
    .max(50, 'Username không được vượt quá 50 ký tự')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Username chỉ được chứa chữ cái, số và dấu gạch dưới'
    ),
  password: z
    .string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .max(100, 'Mật khẩu không được vượt quá 100 ký tự'),
  fullName: z
    .string()
    .min(2, 'Tên đầy đủ phải có ít nhất 2 ký tự')
    .max(100, 'Tên đầy đủ không được vượt quá 100 ký tự'),
});

// Form schema cho việc cập nhật user
const updateUserSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Tên đầy đủ phải có ít nhất 2 ký tự')
    .max(100, 'Tên đầy đủ không được vượt quá 100 ký tự'),
});

// Form schema cho việc khôi phục mật khẩu
const resetPasswordSchema = z
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

export default function UsersPage() {
  const { user, isSuperAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState(undefined);
  const [dateFrom, setDateFrom] = useState(undefined);
  const [dateTo, setDateTo] = useState(undefined);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Temporary filter states (before applying)
  const [tempActiveFilter, setTempActiveFilter] = useState(undefined);
  const [tempDateFrom, setTempDateFrom] = useState(undefined);
  const [tempDateTo, setTempDateTo] = useState(undefined);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Initialize temp filters when popover opens
  useEffect(() => {
    if (isFilterOpen) {
      setTempActiveFilter(activeFilter);
      setTempDateFrom(dateFrom);
      setTempDateTo(dateTo);
    }
  }, [isFilterOpen, activeFilter, dateFrom, dateTo]);

  // Apply filters
  const applyFilters = () => {
    setActiveFilter(tempActiveFilter);
    setDateFrom(tempDateFrom);
    setDateTo(tempDateTo);
    setPage(1);
    setIsFilterOpen(false);
  };

  // Reset temp filters
  const resetTempFilters = () => {
    setTempActiveFilter(undefined);
    setTempDateFrom(undefined);
    setTempDateTo(undefined);
  };

  // Reset all filters
  const resetAllFilters = () => {
    resetFilters();
    resetTempFilters();
  };

  // Reset search and filters
  const resetFilters = () => {
    setSearchTerm('');
    setActiveFilter(undefined);
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(1);
  };

  // Fetch users with filters
  const fetchUsersParams = useCallback(() => {
    return {
      currentUserId: user?.id,
      isSuperAdmin,
      searchTerm,
      activeFilter,
      dateFrom: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
      dateTo: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
      page,
      pageSize,
    };
  }, [
    user?.id,
    isSuperAdmin,
    searchTerm,
    activeFilter,
    dateFrom,
    dateTo,
    page,
    pageSize,
  ]);

  const {
    data: usersData,
    isLoading,
    refetch,
  } = useServerQuery(
    ['users', fetchUsersParams()],
    () => fetchUsers(fetchUsersParams()),
    {
      enabled: !!user?.id,
      onError: (error) => {
        toast.error('Lỗi khi tải danh sách người dùng: ' + error.message);
      },
    }
  );

  // Forms
  const createForm = useForm({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: '',
      password: '',
      fullName: '',
    },
  });

  const editForm = useForm({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      fullName: '',
    },
  });

  const resetPasswordForm = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Mutations
  const createUserMutation = useServerMutation(
    'createUser',
    (data) => createUser({ ...data, createdBy: user.id }),
    {
      onSuccess: () => {
        toast.success('Người dùng đã được tạo thành công');
        setCreateDialogOpen(false);
        createForm.reset();
        refetch();
      },
      onError: (error) => {
        toast.error('Lỗi khi tạo người dùng: ' + error.message);
      },
    }
  );

  const updateUserMutation = useServerMutation(
    'updateUser',
    (data) => updateUser({ ...data, currentUserId: user.id, isSuperAdmin }),
    {
      onSuccess: () => {
        toast.success('Thông tin người dùng đã được cập nhật');
        setEditDialogOpen(false);
        editForm.reset();
        refetch();
      },
      onError: (error) => {
        toast.error('Lỗi khi cập nhật người dùng: ' + error.message);
      },
    }
  );

  const toggleStatusMutation = useServerMutation(
    'toggleUserStatus',
    (data) =>
      toggleUserStatus({ ...data, currentUserId: user.id, isSuperAdmin }),
    {
      onSuccess: (data) => {
        const status = data.data.is_active ? 'kích hoạt' : 'vô hiệu hóa';
        toast.success(`Người dùng đã được ${status}`);
        refetch();
      },
      onError: (error) => {
        toast.error('Lỗi khi thay đổi trạng thái người dùng: ' + error.message);
      },
    }
  );

  const resetPasswordMutation = useServerMutation(
    'resetUserPassword',
    (data) =>
      resetUserPassword({ ...data, currentUserId: user.id, isSuperAdmin }),
    {
      onSuccess: () => {
        toast.success('Đã khôi phục mật khẩu thành công');
        setResetPasswordDialogOpen(false);
        resetPasswordForm.reset();
      },
      onError: (error) => {
        toast.error('Lỗi khi khôi phục mật khẩu: ' + error.message);
      },
    }
  );

  // Check user limit
  const { data: userLimitData, isLoading: isLoadingUserLimit } = useServerQuery(
    ['userLimit', user?.id],
    () => checkUserLimit(user?.id),
    {
      enabled: !!user?.id && !isSuperAdmin,
      onError: (error) => {
        toast.error('Lỗi khi kiểm tra giới hạn người dùng: ' + error.message);
      },
    }
  );

  // Update form defaults when selected user changes
  useEffect(() => {
    if (selectedUser) {
      editForm.reset({
        fullName: selectedUser.full_name || '',
      });
    }
  }, [selectedUser, editForm]);

  // Handle form submissions
  const onCreateUser = (data) => {
    createUserMutation.mutate(data);
  };

  const onUpdateUser = (data) => {
    if (!selectedUser) return;
    updateUserMutation.mutate({
      id: selectedUser.id,
      ...data,
    });
  };

  const onToggleStatus = (user) => {
    toggleStatusMutation.mutate({
      id: user.id,
      isActive: !user.is_active,
    });
  };

  const onResetPassword = (data) => {
    if (!selectedUser) return;
    resetPasswordMutation.mutate({
      id: selectedUser.id,
      newPassword: data.newPassword,
    });
  };

  // Lấy thông tin giới hạn người dùng
  const userLimitInfo = userLimitData?.data || {
    currentCount: 0,
    maxUsers: 0,
    canCreateMore: false,
  };

  // Render
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Người dùng</h1>
          <p className="text-muted-foreground">
            Quản lý tài khoản người dùng trong hệ thống
          </p>
        </div>
        {!isSuperAdmin && (
          <div className="flex flex-col items-end gap-2">
            {!isLoadingUserLimit && !isSuperAdmin && (
              <div className="text-sm text-muted-foreground">
                Số lượng người dùng: {userLimitInfo.currentCount}/
                {userLimitInfo.maxUsers}
              </div>
            )}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  disabled={!userLimitInfo.canCreateMore && !isSuperAdmin}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm Người dùng
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Tạo tài khoản Người dùng mới</DialogTitle>
                  <DialogDescription>
                    Nhập thông tin để tạo tài khoản người dùng mới trong hệ
                    thống.
                  </DialogDescription>
                </DialogHeader>
                <Form {...createForm}>
                  <form
                    onSubmit={createForm.handleSubmit(onCreateUser)}
                    className="space-y-4"
                  >
                    <FormField
                      control={createForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tên đăng nhập</FormLabel>
                          <FormControl>
                            <Input placeholder="username" {...field} />
                          </FormControl>
                          <p className="text-sm text-amber-500 mt-1">
                            <Info className="h-3 w-3 inline mr-1" />
                            Lưu ý: Username không thể thay đổi sau khi tạo
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mật khẩu</FormLabel>
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
                      control={createForm.control}
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
                    <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                      <p className="font-semibold flex items-center">
                        <Info className="h-4 w-4 mr-2" />
                        Lưu ý quan trọng
                      </p>
                      <ul className="list-disc ml-6 mt-1 space-y-1">
                        <li>Tài khoản người dùng sau khi tạo không thể xóa</li>
                        <li>
                          Email sẽ được tạo tự động dựa trên username:
                          username@gmail.com
                        </li>
                        <li>
                          Hãy kiểm tra kỹ thông tin trước khi tạo tài khoản
                        </li>
                      </ul>
                    </div>
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={createUserMutation.isPending}
                      >
                        {createUserMutation.isPending
                          ? 'Đang tạo...'
                          : 'Tạo Người dùng'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Danh sách Người dùng</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm người dùng..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
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
                      <Label>Trạng thái</Label>
                      <Select
                        value={
                          tempActiveFilter !== undefined
                            ? tempActiveFilter.toString()
                            : 'all'
                        }
                        onValueChange={(value) => {
                          if (value === 'all') {
                            setTempActiveFilter(undefined);
                          } else {
                            setTempActiveFilter(value === 'true');
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn trạng thái" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả</SelectItem>
                          <SelectItem value="true">Đã kích hoạt</SelectItem>
                          <SelectItem value="false">Chưa kích hoạt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Từ ngày</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            {tempDateFrom
                              ? format(tempDateFrom, 'dd/MM/yyyy')
                              : 'Chọn ngày'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={tempDateFrom}
                            onSelect={(date) => {
                              setTempDateFrom(date);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Đến ngày</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            {tempDateTo
                              ? format(tempDateTo, 'dd/MM/yyyy')
                              : 'Chọn ngày'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={tempDateTo}
                            onSelect={(date) => {
                              setTempDateTo(date);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={resetTempFilters}>
                        Đặt lại
                      </Button>
                      <Button onClick={applyFilters}>Áp dụng</Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              {(searchTerm ||
                activeFilter !== undefined ||
                dateFrom ||
                dateTo) && (
                <Button variant="ghost" onClick={resetAllFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tên đầy đủ</TableHead>
                  {isSuperAdmin && <TableHead>Admin</TableHead>}
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  {!isSuperAdmin && (
                    <TableHead className="text-right">Hành động</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={isSuperAdmin ? 7 : 6}
                      className="text-center py-10"
                    >
                      <div className="flex justify-center">
                        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Đang tải...
                      </p>
                    </TableCell>
                  </TableRow>
                ) : usersData?.data?.users?.length ? (
                  usersData.data.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.username}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.full_name || '-'}</TableCell>
                      {isSuperAdmin && (
                        <TableCell>
                          {user.creator ? (
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {user.creator.username}
                              </span>
                              {user.creator.full_name && (
                                <span className="text-xs text-muted-foreground">
                                  {user.creator.full_name}
                                </span>
                              )}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge
                          variant={user.is_active ? 'default' : 'destructive'}
                        >
                          {user.is_active ? 'Đã kích hoạt' : 'Chưa kích hoạt'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.created_at
                          ? format(new Date(user.created_at), 'dd/MM/yyyy')
                          : '-'}
                      </TableCell>
                      {!isSuperAdmin && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Mở menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Tùy chọn</DropdownMenuLabel>

                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setEditDialogOpen(true);
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Chỉnh sửa
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setResetPasswordDialogOpen(true);
                                }}
                              >
                                <KeyRound className="mr-2 h-4 w-4" />
                                Khôi phục mật khẩu
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onToggleStatus(user)}
                              >
                                {user.is_active ? (
                                  <>
                                    <PowerOff className="mr-2 h-4 w-4" />
                                    Vô hiệu hóa
                                  </>
                                ) : (
                                  <>
                                    <Power className="mr-2 h-4 w-4" />
                                    Kích hoạt
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={isSuperAdmin ? 7 : 6}
                      className="text-center py-10"
                    >
                      <p className="text-muted-foreground">
                        Không tìm thấy người dùng nào
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Phân trang */}
          {usersData?.data?.total > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Hiển thị {Math.min(pageSize, usersData.data.users.length)} /{' '}
                {usersData.data.total} kết quả
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= usersData.data.totalPages}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog chỉnh sửa User */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa thông tin Người dùng</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin cho tài khoản người dùng
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onUpdateUser)}
              className="space-y-4"
            >
              <div className="grid w-full items-center gap-1.5">
                <Label>Tên đăng nhập</Label>
                <Input value={selectedUser?.username || ''} disabled />
                <p className="text-sm text-muted-foreground">
                  Tên đăng nhập không thể thay đổi
                </p>
              </div>
              <FormField
                control={editForm.control}
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
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending
                    ? 'Đang lưu...'
                    : 'Lưu thay đổi'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog khôi phục mật khẩu */}
      <AlertDialog
        open={resetPasswordDialogOpen}
        onOpenChange={setResetPasswordDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Khôi phục mật khẩu</AlertDialogTitle>
            <AlertDialogDescription>
              Đặt mật khẩu mới cho tài khoản người dùng này
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Form {...resetPasswordForm}>
            <form
              onSubmit={resetPasswordForm.handleSubmit(onResetPassword)}
              className="space-y-4"
            >
              <div className="grid w-full items-center gap-1.5">
                <Label>Người dùng</Label>
                <Input value={selectedUser?.username || ''} disabled />
              </div>
              <FormField
                control={resetPasswordForm.control}
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
                control={resetPasswordForm.control}
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
              <AlertDialogFooter>
                <AlertDialogCancel asChild>
                  <Button type="button" variant="outline">
                    Hủy
                  </Button>
                </AlertDialogCancel>
                <Button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending
                    ? 'Đang lưu...'
                    : 'Đặt lại mật khẩu'}
                </Button>
              </AlertDialogFooter>
            </form>
          </Form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
