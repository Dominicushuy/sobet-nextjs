// src/app/(private)/admin/admins/page.jsx

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
  Users,
  KeyRound,
  RefreshCw,
  X,
  Filter,
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
import {
  fetchAdmins,
  createAdmin,
  updateAdmin,
  toggleAdminStatus,
  updateAdminMaxUsers,
  resetAdminPassword,
} from '@/app/actions/admin';

// Form schema cho việc tạo admin
const createAdminSchema = z.object({
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

// Form schema cho việc cập nhật admin
const updateAdminSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Tên đầy đủ phải có ít nhất 2 ký tự')
    .max(100, 'Tên đầy đủ không được vượt quá 100 ký tự'),
});

// Form schema cho việc cài đặt số lượng user tối đa
const maxUsersSchema = z.object({
  maxUsers: z
    .number()
    .min(1, 'Số lượng user tối thiểu là 1')
    .max(1000, 'Số lượng user tối đa là 1000'),
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

export default function AdminsPage() {
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
  const [maxUsersDialogOpen, setMaxUsersDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);

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

  // Fetch admins with filters
  const fetchAdminsParams = useCallback(() => {
    return {
      searchTerm,
      activeFilter,
      dateFrom: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
      dateTo: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
      page,
      pageSize,
    };
  }, [searchTerm, activeFilter, dateFrom, dateTo, page, pageSize]);

  const {
    data: adminsData,
    isLoading,
    refetch,
  } = useServerQuery(
    ['admins', fetchAdminsParams()],
    () => fetchAdmins(fetchAdminsParams()),
    {
      onError: (error) => {
        toast.error('Lỗi khi tải danh sách admin: ' + error.message);
      },
    }
  );

  // Forms
  const createForm = useForm({
    resolver: zodResolver(createAdminSchema),
    defaultValues: {
      username: '',
      password: '',
      fullName: '',
    },
  });

  const editForm = useForm({
    resolver: zodResolver(updateAdminSchema),
    defaultValues: {
      fullName: '',
    },
  });

  const maxUsersForm = useForm({
    resolver: zodResolver(maxUsersSchema),
    defaultValues: {
      maxUsers: 10,
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
  const createAdminMutation = useServerMutation(
    'createAdmin',
    (data) => createAdmin(data),
    {
      onSuccess: () => {
        toast.success('Admin đã được tạo thành công');
        setCreateDialogOpen(false);
        createForm.reset();
        refetch();
      },
      onError: (error) => {
        toast.error('Lỗi khi tạo admin: ' + error.message);
      },
    }
  );

  const updateAdminMutation = useServerMutation(
    'updateAdmin',
    (data) => updateAdmin(data),
    {
      onSuccess: () => {
        toast.success('Thông tin admin đã được cập nhật');
        setEditDialogOpen(false);
        editForm.reset();
        refetch();
      },
      onError: (error) => {
        toast.error('Lỗi khi cập nhật admin: ' + error.message);
      },
    }
  );

  const toggleStatusMutation = useServerMutation(
    'toggleAdminStatus',
    (data) => toggleAdminStatus(data),
    {
      onSuccess: (data) => {
        const status = data.data.is_active ? 'kích hoạt' : 'vô hiệu hóa';
        toast.success(`Admin đã được ${status}`);
        refetch();
      },
      onError: (error) => {
        toast.error('Lỗi khi thay đổi trạng thái admin: ' + error.message);
      },
    }
  );

  const updateMaxUsersMutation = useServerMutation(
    'updateAdminMaxUsers',
    (data) => updateAdminMaxUsers(data),
    {
      onSuccess: () => {
        toast.success('Đã cập nhật số lượng user tối đa');
        setMaxUsersDialogOpen(false);
        maxUsersForm.reset();
        refetch();
      },
      onError: (error) => {
        toast.error('Lỗi khi cập nhật số lượng user tối đa: ' + error.message);
      },
    }
  );

  const resetPasswordMutation = useServerMutation(
    'resetAdminPassword',
    (data) => resetAdminPassword(data),
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

  // Update form defaults when selected admin changes
  useEffect(() => {
    if (selectedAdmin) {
      editForm.reset({
        fullName: selectedAdmin.full_name || '',
      });

      maxUsersForm.reset({
        maxUsers: selectedAdmin.max_users || 10,
      });
    }
  }, [selectedAdmin, editForm, maxUsersForm]);

  // Handle form submissions
  const onCreateAdmin = (data) => {
    createAdminMutation.mutate(data);
  };

  const onUpdateAdmin = (data) => {
    if (!selectedAdmin) return;
    updateAdminMutation.mutate({
      id: selectedAdmin.id,
      ...data,
    });
  };

  const onToggleStatus = (admin) => {
    toggleStatusMutation.mutate({
      id: admin.id,
      isActive: !admin.is_active,
    });
  };

  const onUpdateMaxUsers = (data) => {
    if (!selectedAdmin) return;
    updateMaxUsersMutation.mutate({
      adminId: selectedAdmin.id,
      maxUsers: data.maxUsers,
    });
  };

  const onResetPassword = (data) => {
    if (!selectedAdmin) return;
    resetPasswordMutation.mutate({
      id: selectedAdmin.id,
      newPassword: data.newPassword,
    });
  };

  // Render
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Admin</h1>
          <p className="text-muted-foreground">
            Quản lý tài khoản admin trong hệ thống
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Thêm Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Tạo tài khoản Admin mới</DialogTitle>
              <DialogDescription>
                Nhập thông tin để tạo tài khoản admin mới trong hệ thống.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form
                onSubmit={createForm.handleSubmit(onCreateAdmin)}
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
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createAdminMutation.isPending}
                  >
                    {createAdminMutation.isPending
                      ? 'Đang tạo...'
                      : 'Tạo Admin'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Danh sách Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm admin..."
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

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tên đầy đủ</TableHead>
                  <TableHead>Người dùng tối đa</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      <div className="flex justify-center">
                        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Đang tải...
                      </p>
                    </TableCell>
                  </TableRow>
                ) : adminsData?.data?.admins?.length ? (
                  adminsData.data.admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">
                        {admin.username}
                      </TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>{admin.full_name || '-'}</TableCell>
                      <TableCell>{admin.max_users || 10}</TableCell>
                      <TableCell>
                        <Badge
                          variant={admin.is_active ? 'default' : 'destructive'}
                        >
                          {admin.is_active ? 'Đã kích hoạt' : 'Chưa kích hoạt'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {admin.created_at
                          ? format(new Date(admin.created_at), 'dd/MM/yyyy')
                          : '-'}
                      </TableCell>
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
                                setSelectedAdmin(admin);
                                setEditDialogOpen(true);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Chỉnh sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setMaxUsersDialogOpen(true);
                              }}
                            >
                              <Users className="mr-2 h-4 w-4" />
                              Cài đặt số lượng user
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setResetPasswordDialogOpen(true);
                              }}
                            >
                              <KeyRound className="mr-2 h-4 w-4" />
                              Khôi phục mật khẩu
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onToggleStatus(admin)}
                            >
                              {admin.is_active ? (
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
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      <p className="text-muted-foreground">
                        Không tìm thấy admin nào
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Phân trang */}
          {adminsData?.data?.total > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Hiển thị {Math.min(pageSize, adminsData.data.admins.length)} /{' '}
                {adminsData.data.total} kết quả
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
                  disabled={page >= adminsData.data.totalPages}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog chỉnh sửa Admin */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa thông tin Admin</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin cho tài khoản admin
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onUpdateAdmin)}
              className="space-y-4"
            >
              <div className="grid w-full items-center gap-1.5">
                <Label>Tên đăng nhập</Label>
                <Input value={selectedAdmin?.username || ''} disabled />
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
                <Button type="submit" disabled={updateAdminMutation.isPending}>
                  {updateAdminMutation.isPending
                    ? 'Đang lưu...'
                    : 'Lưu thay đổi'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog cài đặt số lượng user tối đa */}
      <Dialog open={maxUsersDialogOpen} onOpenChange={setMaxUsersDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cài đặt số lượng user tối đa</DialogTitle>
            <DialogDescription>
              Điều chỉnh số lượng tài khoản user tối đa mà admin có thể tạo
            </DialogDescription>
          </DialogHeader>
          <Form {...maxUsersForm}>
            <form
              onSubmit={maxUsersForm.handleSubmit(onUpdateMaxUsers)}
              className="space-y-4"
            >
              <div className="grid w-full items-center gap-1.5">
                <Label>Admin</Label>
                <Input value={selectedAdmin?.username || ''} disabled />
              </div>
              <FormField
                control={maxUsersForm.control}
                name="maxUsers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số lượng user tối đa</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="10"
                        {...field}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10);
                          field.onChange(isNaN(value) ? 0 : value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMaxUsersDialogOpen(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={updateMaxUsersMutation.isPending}
                >
                  {updateMaxUsersMutation.isPending
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
              Đặt mật khẩu mới cho tài khoản admin này
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Form {...resetPasswordForm}>
            <form
              onSubmit={resetPasswordForm.handleSubmit(onResetPassword)}
              className="space-y-4"
            >
              <div className="grid w-full items-center gap-1.5">
                <Label>Admin</Label>
                <Input value={selectedAdmin?.username || ''} disabled />
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
