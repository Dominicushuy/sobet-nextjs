// src/app/(private)/admin/bet-types/page.jsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, RefreshCw } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useServerQuery, useServerMutation } from '@/hooks/useServerAction';
import {
  fetchAllBetTypes,
  fetchActiveBetTypes,
  fetchAllNumberCombinations,
  toggleBetTypeStatus,
  updateBetType,
} from '@/app/actions/bet-types';

// Components
import BetTypeEditor from '@/components/bet-types/BetTypeEditor';
import BetTypeCard from '@/components/bet-types/BetTypeCard';
import CombinationList from '@/components/bet-types/CombinationList';
import BetTypeDetails from '@/components/bet-types/BetTypeDetails';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Form schema for updating bet type
const betTypeSchema = z.object({
  name: z.string().min(2, 'Tên loại cược phải có ít nhất 2 ký tự'),
  aliases: z.string(),
  applicable_regions: z.array(z.string()).min(1, 'Chọn ít nhất một miền'),
  bet_rule: z.string(),
  matching_method: z.string().min(2, 'Cần nhập phương thức đối chiếu'),
  is_active: z.boolean().default(true),
  payout_rate: z.string().min(1, 'Cần nhập tỷ lệ trả thưởng'),
  multiplier: z.string().transform((val) => {
    const num = parseFloat(val);
    return isNaN(num) ? 1 : num;
  }),
});

export default function BetTypesPage() {
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [activeSection, setActiveSection] = useState('bet-types');
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
      // Filter by region if a specific region is selected
      if (
        activeTab !== 'all' &&
        !betType.applicable_regions?.includes(activeTab)
      ) {
        return false;
      }

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
  }, [betTypesData, searchTerm, activeTab]);

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

  // Cập nhật useEffect cho form khi chọn loại cược
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
        multiplier: selectedBetType.multiplier
          ? selectedBetType.multiplier.toString()
          : '1',
      });
    }
  }, [selectedBetType, editForm]);

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

    // Convert multiplier to number
    const multiplier = parseFloat(data.multiplier);

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
        multiplier: isNaN(multiplier) ? 1 : multiplier,
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

  // Reset search
  const resetSearch = () => {
    setSearchTerm('');
  };

  // Toggle bet type details expansion
  const toggleBetTypeExpansion = (id) => {
    setExpandedBetType(expandedBetType === id ? null : id);
  };

  // Handle edit button click
  const handleEditBetType = (betType) => {
    setSelectedBetType(betType);
    setEditDialogOpen(true);
  };

  // Loading spinner
  const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center py-10">
      <RefreshCw className="h-6 w-6 animate-spin text-primary mb-4" />
      <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>
    </div>
  );

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

      <div className="flex space-x-4">
        <Button
          variant={activeSection === 'bet-types' ? 'default' : 'outline'}
          onClick={() => setActiveSection('bet-types')}
        >
          Loại Cược
        </Button>
        <Button
          variant={activeSection === 'combinations' ? 'default' : 'outline'}
          onClick={() => setActiveSection('combinations')}
        >
          Tổ Hợp Số
        </Button>
      </div>

      {activeSection === 'bet-types' ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Danh sách Loại Cược</CardTitle>
            <CardDescription>
              {isSuperAdmin
                ? 'Quản lý các loại cược trong hệ thống'
                : 'Xem thông tin chi tiết về các loại cược'}
            </CardDescription>
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

            <Tabs
              defaultValue="all"
              value={activeTab}
              onValueChange={setActiveTab}
              className="mb-6"
            >
              <TabsList className="grid grid-cols-4">
                <TabsTrigger value="all">Tất cả</TabsTrigger>
                <TabsTrigger value="north">Miền Bắc</TabsTrigger>
                <TabsTrigger value="central">Miền Trung</TabsTrigger>
                <TabsTrigger value="south">Miền Nam</TabsTrigger>
              </TabsList>
            </Tabs>

            {isLoadingBetTypes ? (
              <LoadingSpinner />
            ) : filteredBetTypes.length > 0 ? (
              <div className="space-y-4">
                {filteredBetTypes.map((betType) => (
                  <div key={betType.id}>
                    <BetTypeCard
                      betType={betType}
                      isAdmin={isSuperAdmin}
                      onToggleExpand={toggleBetTypeExpansion}
                      isExpanded={expandedBetType === betType.id}
                      onEdit={handleEditBetType}
                      onToggleStatus={onToggleStatus}
                    />
                    {expandedBetType === betType.id && (
                      <Card className="mb-6 mt-0 border-t-0 rounded-t-none">
                        <CardContent className="pt-4">
                          <BetTypeDetails
                            betType={betType}
                            combinationsData={combinationsData}
                          />
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">
                  {searchTerm
                    ? 'Không tìm thấy loại cược nào khớp với từ khóa tìm kiếm'
                    : 'Không có loại cược nào'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Danh sách Tổ hợp Số</CardTitle>
            <CardDescription>
              Thông tin về các tổ hợp số có thể sử dụng khi đặt cược
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm tổ hợp số..."
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

            <CombinationList
              isLoading={isLoadingCombinations}
              combinations={filteredCombinations}
            />
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog - Only shown for Super Admin */}
      {isSuperAdmin && (
        <BetTypeEditor
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          form={editForm}
          onSubmit={onUpdateBetType}
          isPending={updateBetTypeMutation.isPending}
        />
      )}
    </div>
  );
}
