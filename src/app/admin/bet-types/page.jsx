// src/app/admin/bet-types/page.jsx
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
  Settings,
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/providers/AuthProvider';
import { useServerQuery, useServerMutation } from '@/hooks/useServerAction';
import {
  fetchBetTypes,
  createBetType,
  updateBetType,
  deleteBetType,
  toggleBetTypeStatus,
  updateBetTypePayoutRates,
} from '@/app/actions/bet-type';
import { useForm } from 'react-hook-form';

export default function BetTypesManagementPage() {
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPayoutRateDialogOpen, setIsPayoutRateDialogOpen] = useState(false);
  const [selectedBetType, setSelectedBetType] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [filteredBetTypes, setFilteredBetTypes] = useState([]);

  // Fetch bet types
  const {
    data: betTypesResponse = { data: [] },
    isLoading: isLoadingBetTypes,
    refetch: refetchBetTypes,
  } = useServerQuery(['betTypes'], fetchBetTypes, {
    defaultData: { data: [] },
    onError: (error) => {
      toast.error('Lỗi khi tải dữ liệu loại cược: ' + error.message);
    },
  });

  const betTypes = betTypesResponse.data || [];

  // Create bet type mutation
  const createBetTypeMutation = useServerMutation(
    'createBetType',
    async (data) => {
      return await createBetType(data);
    },
    {
      onSuccess: () => {
        toast.success('Loại cược mới được tạo thành công');
        setIsCreateDialogOpen(false);
        form.reset();
        refetchBetTypes();
      },
      onError: (error) => {
        toast.error(`Đã xảy ra lỗi: ${error.message}`);
      },
    }
  );

  // Update bet type mutation
  const updateBetTypeMutation = useServerMutation(
    'updateBetType',
    async (data) => {
      const { id, ...updateData } = data;
      return await updateBetType(id, updateData);
    },
    {
      onSuccess: () => {
        toast.success('Loại cược đã được cập nhật thành công');
        setIsCreateDialogOpen(false);
        form.reset();
        refetchBetTypes();
      },
      onError: (error) => {
        toast.error(`Đã xảy ra lỗi: ${error.message}`);
      },
    }
  );

  // Delete bet type mutation
  const deleteBetTypeMutation = useServerMutation(
    'deleteBetType',
    async (id) => {
      return await deleteBetType(id);
    },
    {
      onSuccess: () => {
        toast.success('Loại cược đã được xóa thành công');
        setIsDeleteDialogOpen(false);
        refetchBetTypes();
      },
      onError: (error) => {
        toast.error(`Đã xảy ra lỗi: ${error.message}`);
      },
    }
  );

  // Toggle bet type status mutation
  const toggleStatusMutation = useServerMutation(
    'toggleBetTypeStatus',
    async ({ id, currentStatus }) => {
      return await toggleBetTypeStatus(id, currentStatus);
    },
    {
      onSuccess: (data, { currentStatus }) => {
        toast.success(
          `Đã ${currentStatus ? 'tạm dừng' : 'kích hoạt'} loại cược`
        );
        refetchBetTypes();
      },
      onError: (error) => {
        toast.error(`Đã xảy ra lỗi: ${error.message}`);
      },
    }
  );

  // Update payout rates mutation
  const updatePayoutRatesMutation = useServerMutation(
    'updateBetTypePayoutRates',
    async (data) => {
      return await updateBetTypePayoutRates(
        data.betTypeId,
        data.payoutRateData
      );
    },
    {
      onSuccess: () => {
        toast.success('Tỷ lệ trả thưởng đã được cập nhật thành công');
        setIsPayoutRateDialogOpen(false);
        refetchBetTypes();
      },
      onError: (error) => {
        toast.error(`Đã xảy ra lỗi: ${error.message}`);
      },
    }
  );

  // Filter bet types by search query
  useEffect(() => {
    if (!searchQuery) {
      setFilteredBetTypes(betTypes);
      return;
    }

    const filtered = betTypes.filter(
      (betType) =>
        betType.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (betType.aliases &&
          betType.aliases.some((alias) =>
            alias.toLowerCase().includes(searchQuery.toLowerCase())
          ))
    );
    setFilteredBetTypes(filtered);
  }, [searchQuery, betTypes]);

  // Initialize form
  const form = useForm({
    defaultValues: {
      id: '',
      name: '',
      aliases: [],
      applicable_regions: [],
      bet_rule: [],
      matching_method: '',
      payout_rate: {},
      combinations: {},
      is_permutation: false,
      special_calc: '',
      is_active: true,
    },
  });

  const payoutRateForm = useForm({
    defaultValues: {
      payoutRates: {},
    },
  });

  // Open create dialog
  const openCreateDialog = () => {
    form.reset({
      id: '',
      name: '',
      aliases: [],
      applicable_regions: [],
      bet_rule: [],
      matching_method: '',
      payout_rate: {},
      combinations: {},
      is_permutation: false,
      special_calc: '',
      is_active: true,
    });
    setIsEditing(false);
    setSelectedBetType(null);
    setIsCreateDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (betType) => {
    // Format the data for the form
    const formData = {
      id: betType.id,
      name: betType.name,
      aliases: betType.aliases?.join(', ') || '',
      applicable_regions: betType.applicable_regions,
      bet_rule: betType.bet_rule,
      matching_method: betType.matching_method,
      payout_rate: betType.payout_rate,
      combinations: betType.combinations,
      is_permutation: betType.is_permutation,
      special_calc: betType.special_calc || '',
      is_active: betType.is_active,
    };

    form.reset(formData);
    setSelectedBetType(betType);
    setIsEditing(true);
    setIsCreateDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (betType) => {
    setSelectedBetType(betType);
    setIsDeleteDialogOpen(true);
  };

  // Open payout rates dialog
  const openPayoutRateDialog = (betType) => {
    setSelectedBetType(betType);

    // Initialize form with current payout rates
    const adminSettings = betType.admin_settings?.find(
      (setting) =>
        setting.admin_id === (isAdmin ? user?.id : null) &&
        setting.user_id === null
    );

    const currentRates =
      adminSettings?.payout_rate || betType.payout_rate || {};

    payoutRateForm.reset({
      payoutRates: currentRates,
    });

    setIsPayoutRateDialogOpen(true);
  };

  // Handle toggle bet type status
  const handleToggleStatus = (betType) => {
    toggleStatusMutation.mutate({
      id: betType.id,
      currentStatus: betType.is_active,
    });
  };

  // Handle form submission
  const onSubmit = (data) => {
    // Format the data for the server
    const formattedData = {
      ...data,
      aliases: data.aliases ? data.aliases.split(',').map((a) => a.trim()) : [],
    };

    if (isEditing) {
      updateBetTypeMutation.mutate(formattedData);
    } else {
      createBetTypeMutation.mutate(formattedData);
    }
  };

  // Handle payout rate form submission
  const onPayoutRateSubmit = (data) => {
    updatePayoutRatesMutation.mutate({
      betTypeId: selectedBetType.id,
      payoutRateData: data.payoutRates,
    });
  };

  // Handle delete bet type
  const handleDeleteBetType = () => {
    if (selectedBetType) {
      deleteBetTypeMutation.mutate(selectedBetType.id);
    }
  };

  // Handle search
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Quản lý loại cược</h1>
        <p className="text-muted-foreground">
          Quản lý các loại cược trong hệ thống
        </p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Tìm kiếm loại cược..."
            className="w-full pl-8"
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
        {isSuperAdmin && (
          <Button onClick={openCreateDialog}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Thêm loại cược mới
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách loại cược</CardTitle>
          <CardDescription>
            Quản lý các loại cược và tỷ lệ trả thưởng
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingBetTypes ? (
            <div className="flex justify-center py-8">Đang tải dữ liệu...</div>
          ) : filteredBetTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6">
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? 'Không tìm thấy loại cược phù hợp với tìm kiếm.'
                  : 'Không có loại cược nào.'}
              </p>
              {isSuperAdmin && (
                <Button onClick={openCreateDialog}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Thêm loại cược mới
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên loại cược</TableHead>
                  <TableHead>Bí danh</TableHead>
                  <TableHead>Áp dụng cho</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBetTypes.map((betType) => (
                  <TableRow key={betType.id}>
                    <TableCell className="font-medium">
                      {betType.name}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-md overflow-hidden truncate">
                        {betType.aliases?.length > 0
                          ? betType.aliases.join(', ')
                          : '--'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {betType.applicable_regions?.map((region) => (
                          <Badge
                            key={region}
                            variant="outline"
                            className="capitalize"
                          >
                            {region === 'north'
                              ? 'Miền Bắc'
                              : region === 'central'
                                ? 'Miền Trung'
                                : region === 'south'
                                  ? 'Miền Nam'
                                  : region}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {betType.is_active ? (
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
                              onClick={() => openEditDialog(betType)}
                              title="Chỉnh sửa"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openDeleteDialog(betType)}
                              title="Xóa"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {(isSuperAdmin || isAdmin) && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openPayoutRateDialog(betType)}
                            title="Tỷ lệ trả thưởng"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant={
                            betType.is_active ? 'destructive' : 'default'
                          }
                          size="icon"
                          onClick={() => handleToggleStatus(betType)}
                          disabled={toggleStatusMutation.isPending}
                          title={betType.is_active ? 'Tạm dừng' : 'Kích hoạt'}
                        >
                          {toggleStatusMutation.isPending &&
                          toggleStatusMutation.variables?.id === betType.id ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : betType.is_active ? (
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

      {/* Dialog tạo/chỉnh sửa loại cược */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Chỉnh sửa loại cược' : 'Thêm loại cược mới'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Cập nhật thông tin loại cược'
                : 'Nhập thông tin để tạo loại cược mới'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Tên loại cược <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ví dụ: Đầu Đuôi" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="aliases"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bí danh (phân cách bằng dấu phẩy)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="dd, dau duoi, đầu đuôi"
                        rows={2}
                      />
                    </FormControl>
                    <FormDescription>
                      Các tên gọi khác của loại cược này
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="applicable_regions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Áp dụng cho miền{' '}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange([value])}
                        defaultValue={field.value?.[0] || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn miền" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="north">Miền Bắc</SelectItem>
                          <SelectItem value="central">Miền Trung</SelectItem>
                          <SelectItem value="south">Miền Nam</SelectItem>
                          <SelectItem value="all">Tất cả các miền</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bet_rule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Quy tắc cược <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange([value])}
                        defaultValue={field.value?.[0] || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn quy tắc" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="2 digits">2 chữ số</SelectItem>
                          <SelectItem value="3 digits">3 chữ số</SelectItem>
                          <SelectItem value="4 digits">4 chữ số</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="matching_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Phương thức ghép{' '}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ví dụ: Match the last 2 digits of the draw"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_permutation"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Đảo số</FormLabel>
                      <FormDescription>
                        Loại cược này cho phép đảo số
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  type="button"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createBetTypeMutation.isPending ||
                    updateBetTypeMutation.isPending
                  }
                >
                  {isEditing
                    ? updateBetTypeMutation.isPending
                      ? 'Đang cập nhật...'
                      : 'Cập nhật'
                    : createBetTypeMutation.isPending
                      ? 'Đang tạo...'
                      : 'Tạo mới'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog xác nhận xóa */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa loại cược &quot;{selectedBetType?.name}
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
              onClick={handleDeleteBetType}
              disabled={deleteBetTypeMutation.isPending}
            >
              {deleteBetTypeMutation.isPending ? 'Đang xóa...' : 'Xóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog cài đặt tỷ lệ trả thưởng */}
      <Dialog
        open={isPayoutRateDialogOpen}
        onOpenChange={setIsPayoutRateDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cài đặt tỷ lệ trả thưởng</DialogTitle>
            <DialogDescription>
              Cập nhật tỷ lệ trả thưởng cho loại cược &quot;
              {selectedBetType?.name}&quot;
            </DialogDescription>
          </DialogHeader>
          <Form {...payoutRateForm}>
            <form
              onSubmit={payoutRateForm.handleSubmit(onPayoutRateSubmit)}
              className="space-y-4"
            >
              {/* This would be a dynamic form based on the bet type structure */}
              {selectedBetType?.bet_rule?.map((rule) => (
                <FormField
                  key={rule}
                  control={payoutRateForm.control}
                  name={`payoutRates.${rule}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tỷ lệ cho {rule}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value))
                          }
                          placeholder="Ví dụ: 70"
                        />
                      </FormControl>
                      <FormDescription>
                        Tỷ lệ trả thưởng cho {rule}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsPayoutRateDialogOpen(false)}
                  type="button"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={updatePayoutRatesMutation.isPending}
                >
                  {updatePayoutRatesMutation.isPending
                    ? 'Đang cập nhật...'
                    : 'Cập nhật'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
