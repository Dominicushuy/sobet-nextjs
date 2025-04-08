// src/app/(private)/admin/bet-types/page.jsx
'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Edit,
  MoreHorizontal,
  Power,
  PowerOff,
  RefreshCw,
  X,
  Info,
  ChevronDown,
  ChevronRight,
  List,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useServerQuery, useServerMutation } from '@/hooks/useServerAction';
import {
  fetchAllBetTypes,
  fetchActiveBetTypes,
  fetchAllNumberCombinations,
  toggleBetTypeStatus,
  updateBetType,
} from '@/app/actions/bet-types';

// Form schema for updating bet type
const betTypeSchema = z.object({
  name: z.string().min(2, 'Tên loại cược phải có ít nhất 2 ký tự'),
  aliases: z.string(),
  applicable_regions: z.array(z.string()).min(1, 'Chọn ít nhất một miền'),
  bet_rule: z.string(),
  matching_method: z.string().min(2, 'Cần nhập phương thức đối chiếu'),
  is_active: z.boolean().default(true),
  payout_rate: z.string().min(1, 'Cần nhập tỷ lệ trả thưởng'),
});

export default function BetTypesPage() {
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedBetType, setSelectedBetType] = useState(null);
  const [expandedBetType, setExpandedBetType] = useState(null);

  // Fetch bet types based on role
  const {
    data: betTypesData,
    isLoading: isLoadingBetTypes,
    refetch: refetchBetTypes,
  } = useServerQuery(
    ['betTypes', isSuperAdmin],
    () => (isSuperAdmin ? fetchAllBetTypes() : fetchActiveBetTypes()),
    {
      enabled: !!user?.id,
      onError: (error) => {
        toast.error('Lỗi khi tải danh sách loại cược: ' + error.message);
      },
    }
  );

  // Fetch number combinations
  const { data: combinationsData, isLoading: isLoadingCombinations } =
    useServerQuery(['numberCombinations'], () => fetchAllNumberCombinations(), {
      enabled: !!user?.id,
      onError: (error) => {
        toast.error('Lỗi khi tải danh sách tổ hợp số: ' + error.message);
      },
    });

  // Edit form
  const editForm = useForm({
    resolver: zodResolver(betTypeSchema),
    defaultValues: {
      name: '',
      aliases: '',
      applicable_regions: [],
      bet_rule: '',
      matching_method: '',
      is_active: true,
      payout_rate: '',
    },
  });

  // Toggle bet type status mutation
  const toggleStatusMutation = useServerMutation(
    'toggleBetTypeStatus',
    ({ id, isActive }) => toggleBetTypeStatus(id, isActive),
    {
      onSuccess: (result) => {
        const status = result.data.is_active ? 'kích hoạt' : 'vô hiệu hóa';
        toast.success(`Loại cược đã được ${status}`);
        refetchBetTypes();
      },
      onError: (error) => {
        toast.error(`Lỗi khi thay đổi trạng thái loại cược: ${error.message}`);
      },
    }
  );

  // Update bet type mutation
  const updateBetTypeMutation = useServerMutation(
    'updateBetType',
    ({ id, data }) => updateBetType(id, data),
    {
      onSuccess: () => {
        toast.success('Đã cập nhật loại cược thành công');
        setEditDialogOpen(false);
        editForm.reset();
        refetchBetTypes();
      },
      onError: (error) => {
        toast.error(`Lỗi khi cập nhật loại cược: ${error.message}`);
      },
    }
  );

  // Filter bet types
  const filteredBetTypes = useMemo(() => {
    if (!betTypesData?.data) return [];

    return betTypesData.data.filter((betType) => {
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
    });
  }, [betTypesData, searchTerm]);

  // Filter number combinations
  const filteredCombinations = useMemo(() => {
    if (!combinationsData?.data) return [];

    return combinationsData.data.filter((combination) => {
      if (!searchTerm) return true;

      // Search by name
      if (combination.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return true;
      }

      // Search in aliases
      if (combination.aliases && Array.isArray(combination.aliases)) {
        return combination.aliases.some((alias) =>
          alias.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      return false;
    });
  }, [combinationsData, searchTerm]);

  // Update form when selected bet type changes
  useEffect(() => {
    if (selectedBetType) {
      // Convert JSONB for payout_rate to string for the form
      const payoutRateStr =
        typeof selectedBetType.payout_rate === 'object'
          ? JSON.stringify(selectedBetType.payout_rate, null, 2)
          : String(selectedBetType.payout_rate);

      // Convert bet_rule array to string
      const betRuleStr = Array.isArray(selectedBetType.bet_rule)
        ? selectedBetType.bet_rule.join('\n')
        : String(selectedBetType.bet_rule);

      // Convert aliases array to string
      const aliasesStr = Array.isArray(selectedBetType.aliases)
        ? selectedBetType.aliases.join(', ')
        : String(selectedBetType.aliases);

      editForm.reset({
        name: selectedBetType.name || '',
        aliases: aliasesStr,
        applicable_regions: selectedBetType.applicable_regions || [],
        bet_rule: betRuleStr,
        matching_method: selectedBetType.matching_method || '',
        is_active: selectedBetType.is_active,
        payout_rate: payoutRateStr,
      });
    }
  }, [selectedBetType, editForm]);

  // Handle form submission
  const onUpdateBetType = (data) => {
    if (!selectedBetType) return;

    // Convert aliases string to array
    const aliases = data.aliases
      .split(',')
      .map((alias) => alias.trim())
      .filter((alias) => alias.length > 0);

    // Convert bet_rule string to array
    const betRule = data.bet_rule
      .split('\n')
      .map((rule) => rule.trim())
      .filter((rule) => rule.length > 0);

    // Try to parse payout_rate as JSON, fallback to original string if it fails
    let payoutRate;
    try {
      payoutRate = JSON.parse(data.payout_rate);
    } catch (e) {
      payoutRate = data.payout_rate;
    }

    updateBetTypeMutation.mutate({
      id: selectedBetType.id,
      data: {
        name: data.name,
        aliases,
        applicable_regions: data.applicable_regions,
        bet_rule: betRule,
        matching_method: data.matching_method,
        is_active: data.is_active,
        payout_rate: payoutRate,
      },
    });
  };

  // Toggle bet type status
  const onToggleStatus = (betType) => {
    toggleStatusMutation.mutate({
      id: betType.id,
      isActive: !betType.is_active,
    });
  };

  // Format applicable regions
  const formatRegions = (regions) => {
    if (!regions || !Array.isArray(regions)) return '-';

    const regionMap = {
      north: 'Miền Bắc',
      central: 'Miền Trung',
      south: 'Miền Nam',
    };

    return regions.map((r) => regionMap[r] || r).join(', ');
  };

  // Reset search
  const resetSearch = () => {
    setSearchTerm('');
  };

  // Toggle bet type details expansion
  const toggleBetTypeExpansion = (id) => {
    setExpandedBetType(expandedBetType === id ? null : id);
  };

  // Format jsonb data for display
  const formatJsonDisplay = (jsonData) => {
    if (!jsonData) return '-';
    try {
      if (typeof jsonData === 'string') {
        return jsonData;
      }
      return JSON.stringify(jsonData, null, 2);
    } catch (e) {
      return String(jsonData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {isSuperAdmin ? 'Quản lý Loại Cược' : 'Loại Cược'}
          </h1>
          <p className="text-muted-foreground">
            {isSuperAdmin
              ? 'Xem và quản lý các loại cược trong hệ thống'
              : 'Thông tin về các loại cược có sẵn trong hệ thống'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Danh sách Loại Cược</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm loại cược theo tên hoặc bí danh..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {searchTerm && (
              <Button variant="ghost" onClick={resetSearch}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {isLoadingBetTypes ? (
            <div className="flex flex-col items-center justify-center py-10">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Đang tải...</p>
            </div>
          ) : filteredBetTypes.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Tên loại cược</TableHead>
                    <TableHead>Bí danh</TableHead>
                    <TableHead>Áp dụng miền</TableHead>
                    <TableHead>Quy tắc cược</TableHead>
                    {isSuperAdmin && <TableHead>Trạng thái</TableHead>}
                    {isSuperAdmin && (
                      <TableHead className="text-right">Hành động</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBetTypes.map((betType) => (
                    <Fragment key={betType.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleBetTypeExpansion(betType.id)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            {expandedBetType === betType.id ? (
                              <ChevronDown className="h-4 w-4 mr-2 shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 mr-2 shrink-0" />
                            )}
                            {betType.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {betType.aliases && betType.aliases.length > 0
                            ? betType.aliases.join(', ')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {formatRegions(betType.applicable_regions)}
                        </TableCell>
                        <TableCell>
                          {betType.bet_rule && betType.bet_rule.length > 0
                            ? betType.bet_rule.join(', ')
                            : '-'}
                        </TableCell>
                        {isSuperAdmin && (
                          <TableCell>
                            <Badge
                              variant={
                                betType.is_active ? 'default' : 'destructive'
                              }
                            >
                              {betType.is_active ? 'Hoạt động' : 'Vô hiệu hóa'}
                            </Badge>
                          </TableCell>
                        )}
                        {isSuperAdmin && (
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span className="sr-only">Mở menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Tùy chọn</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBetType(betType);
                                    setEditDialogOpen(true);
                                  }}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Chỉnh sửa
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleStatus(betType);
                                  }}
                                >
                                  {betType.is_active ? (
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
                      {expandedBetType === betType.id && (
                        <TableRow className="bg-muted/30">
                          <TableCell
                            colSpan={isSuperAdmin ? 6 : 4}
                            className="p-4"
                          >
                            <div className="space-y-4">
                              <div>
                                <h3 className="text-sm font-semibold mb-2">
                                  Chi tiết loại cược
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-md border p-4 bg-background">
                                  <div>
                                    <p className="text-sm font-medium">
                                      Phương thức đối chiếu:
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {betType.matching_method || '-'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">
                                      Số kết hợp:
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {formatJsonDisplay(
                                        betType.combinations
                                      ) || '-'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">
                                      Tỷ lệ trả thưởng:
                                    </p>
                                    <pre className="text-sm font-mono bg-muted p-2 rounded-md overflow-x-auto">
                                      {formatJsonDisplay(betType.payout_rate) ||
                                        '-'}
                                    </pre>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">
                                      Hoán vị:
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {betType.is_permutation ? 'Có' : 'Không'}
                                    </p>
                                  </div>
                                  {betType.special_calc && (
                                    <div>
                                      <p className="text-sm font-medium">
                                        Tính toán đặc biệt:
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        {betType.special_calc}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* Related Number Combinations */}
                              <div>
                                <h3 className="text-sm font-semibold mb-2">
                                  Các tổ hợp số áp dụng
                                </h3>
                                <div className="rounded-md border bg-background">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Tên tổ hợp</TableHead>
                                        <TableHead>Bí danh</TableHead>
                                        <TableHead>Định nghĩa</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {(combinationsData?.data || [])
                                        .filter(
                                          (combo) =>
                                            combo.applicable_bet_types &&
                                            Array.isArray(
                                              combo.applicable_bet_types
                                            ) &&
                                            (combo.applicable_bet_types.includes(
                                              betType.name.toLowerCase()
                                            ) ||
                                              (betType.aliases &&
                                                betType.aliases.some((alias) =>
                                                  combo.applicable_bet_types.includes(
                                                    alias.toLowerCase()
                                                  )
                                                )))
                                        )
                                        .map((combo) => (
                                          <TableRow key={combo.id}>
                                            <TableCell className="font-medium">
                                              {combo.name}
                                            </TableCell>
                                            <TableCell>
                                              {combo.aliases &&
                                              combo.aliases.length > 0
                                                ? combo.aliases.join(', ')
                                                : '-'}
                                            </TableCell>
                                            <TableCell>
                                              {combo.definition}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">
                Không tìm thấy loại cược nào
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Danh sách Tổ hợp Số</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingCombinations ? (
            <div className="flex flex-col items-center justify-center py-10">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Đang tải...</p>
            </div>
          ) : filteredCombinations.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Tên tổ hợp</TableHead>
                    <TableHead>Bí danh</TableHead>
                    <TableHead>Định nghĩa</TableHead>
                    <TableHead>Cú pháp</TableHead>
                    <TableHead>Áp dụng loại cược</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCombinations.map((combination) => (
                    <TableRow
                      key={combination.id}
                      className="hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">
                        {combination.name}
                      </TableCell>
                      <TableCell>
                        {combination.aliases && combination.aliases.length > 0
                          ? combination.aliases.join(', ')
                          : '-'}
                      </TableCell>
                      <TableCell>{combination.definition}</TableCell>
                      <TableCell>{combination.syntax}</TableCell>
                      <TableCell>
                        {combination.applicable_bet_types &&
                        combination.applicable_bet_types.length > 0
                          ? combination.applicable_bet_types.join(', ')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">
                Không tìm thấy tổ hợp số nào
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog - Only shown for Super Admin */}
      {isSuperAdmin && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Chỉnh sửa loại cược</DialogTitle>
              <DialogDescription>
                Cập nhật thông tin cho loại cược
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form
                onSubmit={editForm.handleSubmit(onUpdateBetType)}
                className="space-y-4"
              >
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tên loại cược</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="aliases"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bí danh</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Nhập các bí danh, cách nhau bằng dấu phẩy"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="applicable_regions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Áp dụng cho miền</FormLabel>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="north"
                            checked={field.value?.includes('north')}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...field.value, 'north']);
                              } else {
                                field.onChange(
                                  field.value?.filter(
                                    (region) => region !== 'north'
                                  )
                                );
                              }
                            }}
                          />
                          <label
                            htmlFor="north"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Miền Bắc
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="central"
                            checked={field.value?.includes('central')}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...field.value, 'central']);
                              } else {
                                field.onChange(
                                  field.value?.filter(
                                    (region) => region !== 'central'
                                  )
                                );
                              }
                            }}
                          />
                          <label
                            htmlFor="central"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Miền Trung
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="south"
                            checked={field.value?.includes('south')}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...field.value, 'south']);
                              } else {
                                field.onChange(
                                  field.value?.filter(
                                    (region) => region !== 'south'
                                  )
                                );
                              }
                            }}
                          />
                          <label
                            htmlFor="south"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Miền Nam
                          </label>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="bet_rule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quy tắc cược</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Mỗi quy tắc trên một dòng"
                          className="h-20"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="matching_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phương thức đối chiếu</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="payout_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tỷ lệ trả thưởng</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder='{
  "2 digits": 75,
  "3 digits": 650,
  "4 digits": 5500
}'
                          className="h-40 font-mono"
                        />
                      </FormControl>
                      <div className="text-xs text-amber-500 mt-1 flex items-start">
                        <Info className="h-3 w-3 mt-0.5 mr-1" />
                        <span>
                          Tỷ lệ trả thưởng cần nhập theo định dạng JSON. Có thể
                          là một giá trị đơn (VD: 75) hoặc một đối tượng phức
                          tạp với nhiều trường.
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Kích hoạt</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Loại cược sẽ được hiển thị cho người dùng
                        </p>
                      </div>
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
                  <Button
                    type="submit"
                    disabled={updateBetTypeMutation.isPending}
                  >
                    {updateBetTypeMutation.isPending
                      ? 'Đang lưu...'
                      : 'Lưu thay đổi'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
