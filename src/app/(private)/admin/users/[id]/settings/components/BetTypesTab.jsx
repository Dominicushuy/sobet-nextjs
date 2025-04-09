'use client';

import { useState, useEffect } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  RefreshCw,
  Info,
  Save,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Power,
  PowerOff,
} from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useServerQuery, useServerMutation } from '@/hooks/useServerAction';
import {
  getUserBetTypeSettings,
  toggleUserBetTypeStatus,
  updateUserBetTypePayoutRate,
  resetUserBetTypeSettings,
  batchUpdateUserBetTypeSettings,
} from '@/app/actions/user-bet-types';
import PayoutRateEditor from './PayoutRateEditor';

// Form schema cho việc cập nhật tỷ lệ trả thưởng
const payoutRateSchema = z.object({
  payoutRate: z.string().min(1, 'Cần nhập tỷ lệ trả thưởng'),
});

export default function BetTypesTab({ userId, currentUser }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [betTypeChanges, setBetTypeChanges] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedBetType, setSelectedBetType] = useState(null);

  // Fetch user's bet type settings
  const {
    data: betTypesData,
    isLoading: isLoadingBetTypes,
    refetch: refetchBetTypeSettings,
  } = useServerQuery(
    ['userBetTypes', userId],
    () => getUserBetTypeSettings(userId),
    {
      enabled: !!userId,
      onError: (error) => {
        toast.error('Lỗi khi tải thông tin loại cược: ' + error.message);
      },
    }
  );

  // Toggle bet type status mutation
  const toggleStatusMutation = useServerMutation(
    'toggleUserBetTypeStatus',
    ({ betTypeId, isActive }) =>
      toggleUserBetTypeStatus(userId, currentUser.id, betTypeId, isActive),
    {
      onSuccess: () => {
        toast.success('Đã cập nhật trạng thái loại cược');
        refetchBetTypeSettings();
      },
      onError: (error) => {
        toast.error(`Lỗi khi cập nhật trạng thái: ${error.message}`);
      },
    }
  );

  // Update payout rate mutation
  const updatePayoutRateMutation = useServerMutation(
    'updateUserBetTypePayoutRate',
    ({ betTypeId, payoutRate }) =>
      updateUserBetTypePayoutRate(
        userId,
        currentUser.id,
        betTypeId,
        payoutRate
      ),
    {
      onSuccess: () => {
        toast.success('Đã cập nhật tỷ lệ trả thưởng');
        setEditDialogOpen(false);
        refetchBetTypeSettings();
      },
      onError: (error) => {
        toast.error(`Lỗi khi cập nhật tỷ lệ trả thưởng: ${error.message}`);
      },
    }
  );

  // Reset settings mutation
  const resetSettingsMutation = useServerMutation(
    'resetUserBetTypeSettings',
    (betTypeId) => resetUserBetTypeSettings(userId, betTypeId),
    {
      onSuccess: () => {
        toast.success('Đã khôi phục về cài đặt mặc định');
        refetchBetTypeSettings();
      },
      onError: (error) => {
        toast.error(`Lỗi khi khôi phục cài đặt: ${error.message}`);
      },
    }
  );

  // Batch update settings mutation
  const batchUpdateMutation = useServerMutation(
    'batchUpdateUserBetTypeSettings',
    (updates) =>
      batchUpdateUserBetTypeSettings(userId, currentUser.id, updates),
    {
      onSuccess: () => {
        toast.success('Đã cập nhật cài đặt loại cược');
        setBetTypeChanges({});
        setHasUnsavedChanges(false);
        refetchBetTypeSettings();
      },
      onError: (error) => {
        toast.error(`Lỗi khi cập nhật hàng loạt: ${error.message}`);
      },
    }
  );

  // Form for editing payout rate
  const payoutRateForm = useForm({
    resolver: zodResolver(payoutRateSchema),
    defaultValues: {
      payoutRate: '',
    },
  });

  // Update form defaults when selected bet type changes
  useEffect(() => {
    if (selectedBetType) {
      // Convert JSONB for payout_rate to string for the form
      const payoutRateStr =
        selectedBetType.custom_payout_rate !== null
          ? typeof selectedBetType.custom_payout_rate === 'object'
            ? JSON.stringify(selectedBetType.custom_payout_rate, null, 2)
            : String(selectedBetType.custom_payout_rate)
          : typeof selectedBetType.payout_rate === 'object'
            ? JSON.stringify(selectedBetType.payout_rate, null, 2)
            : String(selectedBetType.payout_rate);

      payoutRateForm.reset({
        payoutRate: payoutRateStr,
      });
    }
  }, [selectedBetType, payoutRateForm]);

  // Handle bet type toggle
  const handleBetTypeToggle = (betTypeId, isActive, settingId) => {
    setBetTypeChanges((prev) => ({
      ...prev,
      [betTypeId]: {
        bet_type_id: betTypeId,
        is_active: isActive,
        setting_id: settingId,
        payout_rate: null, // Không thay đổi tỷ lệ trả thưởng
      },
    }));
    setHasUnsavedChanges(true);
  };

  // Handle save changes
  const handleSaveChanges = () => {
    const updates = Object.values(betTypeChanges);
    if (updates.length > 0) {
      batchUpdateMutation.mutate(updates);
    }
  };

  // Handle form submission for payout rate
  const onSubmitPayoutRate = (data) => {
    if (!selectedBetType) return;

    // Try to parse payout_rate as JSON, fallback to original string if it fails
    let payoutRate;
    try {
      payoutRate = JSON.parse(data.payoutRate);
    } catch (e) {
      payoutRate = data.payoutRate;
    }

    updatePayoutRateMutation.mutate({
      betTypeId: selectedBetType.id,
      payoutRate,
    });
  };

  // Handle reset to default
  const handleResetToDefault = (betTypeId) => {
    resetSettingsMutation.mutate(betTypeId);
  };

  // Filter bet types by search term
  const filteredBetTypes =
    betTypesData?.data?.betTypes?.filter((betType) => {
      if (!searchTerm) return true;

      // Search by name
      if (betType.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return true;
      }

      // Search in aliases
      if (betType.aliases && Array.isArray(betType.aliases)) {
        return betType.aliases.some((alias) =>
          alias.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      return false;
    }) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cài đặt loại cược</CardTitle>
        <CardDescription>
          Quản lý các loại cược và tỷ lệ trả thưởng cho người dùng này
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingBetTypes ? (
          <div className="flex flex-col items-center justify-center py-10">
            <RefreshCw className="h-6 w-6 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">
              Đang tải dữ liệu loại cược...
            </p>
          </div>
        ) : (
          <>
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm loại cược..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {hasUnsavedChanges && (
              <div className="mb-6">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Thay đổi chưa được lưu</AlertTitle>
                  <AlertDescription>
                    Bạn đã thay đổi trạng thái của một số loại cược. Hãy nhấn
                    nút Lưu thay đổi để áp dụng.
                  </AlertDescription>
                </Alert>
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={handleSaveChanges}
                    disabled={batchUpdateMutation.isPending}
                  >
                    {batchUpdateMutation.isPending ? (
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

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên loại cược</TableHead>
                    <TableHead>Bí danh</TableHead>
                    <TableHead>Trạng thái chung</TableHead>
                    <TableHead>Trạng thái riêng</TableHead>
                    <TableHead>Tỷ lệ trả thưởng</TableHead>
                    <TableHead className="text-right">Tùy chọn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBetTypes.length > 0 ? (
                    filteredBetTypes.map((betType) => {
                      // Get current state (either from changes or original data)
                      const isActiveForUser = betTypeChanges[betType.id]
                        ? betTypeChanges[betType.id].is_active
                        : betType.is_active_for_user;

                      const hasCustomSetting = betType.user_setting !== null;
                      const usingDefault =
                        !hasCustomSetting ||
                        betType.user_setting.payout_rate === null;

                      return (
                        <TableRow key={betType.id}>
                          <TableCell className="font-medium">
                            {betType.name}
                          </TableCell>
                          <TableCell>
                            {betType.aliases && betType.aliases.length > 0
                              ? betType.aliases.join(', ')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                betType.is_active ? 'default' : 'destructive'
                              }
                            >
                              {betType.is_active ? 'Hoạt động' : 'Vô hiệu hóa'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={isActiveForUser}
                                onCheckedChange={(checked) =>
                                  handleBetTypeToggle(
                                    betType.id,
                                    checked,
                                    betType.setting_id
                                  )
                                }
                              />
                              <span>
                                {isActiveForUser
                                  ? 'Đang kích hoạt'
                                  : 'Đã vô hiệu hóa'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {usingDefault ? (
                              <Badge variant="outline">Mặc định</Badge>
                            ) : (
                              <Badge variant="secondary">Tùy chỉnh</Badge>
                            )}
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
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedBetType(betType);
                                    setEditDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Chỉnh sửa tỷ lệ
                                </DropdownMenuItem>
                                {hasCustomSetting && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleResetToDefault(betType.id)
                                    }
                                  >
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    Khôi phục mặc định
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() =>
                                    toggleStatusMutation.mutate({
                                      betTypeId: betType.id,
                                      isActive: !isActiveForUser,
                                    })
                                  }
                                >
                                  {isActiveForUser ? (
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
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10">
                        <p className="text-muted-foreground">
                          {searchTerm
                            ? 'Không tìm thấy loại cược nào khớp với từ khóa tìm kiếm'
                            : 'Không có loại cược nào'}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <p className="text-sm text-muted-foreground">
          Người dùng chỉ có thể sử dụng các loại cược được kích hoạt
        </p>
        {hasUnsavedChanges && (
          <Button
            onClick={handleSaveChanges}
            disabled={batchUpdateMutation.isPending}
          >
            {batchUpdateMutation.isPending ? (
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

      {/* Dialog chỉnh sửa tỷ lệ trả thưởng */}
      {/* Dialog chỉnh sửa tỷ lệ trả thưởng */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa tỷ lệ trả thưởng</DialogTitle>
            <DialogDescription>
              Cài đặt tỷ lệ trả thưởng tùy chỉnh cho loại cược này
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4">
            <PayoutRateEditor
              form={payoutRateForm}
              isPending={updatePayoutRateMutation.isPending}
              onSubmitForm={onSubmitPayoutRate}
              originalPayoutRate={
                selectedBetType?.custom_payout_rate ||
                selectedBetType?.payout_rate
              }
              selectedBetType={selectedBetType}
              onCancel={() => setEditDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
