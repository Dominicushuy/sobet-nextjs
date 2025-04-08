// src/app/(private)/admin/bet-types/page.jsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
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
import BetTypeList from './components/BetTypeList';
import BetTypeEditor from './components/BetTypeEditor';
import CombinationList from '@/components/bet-types/CombinationList';

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

          <BetTypeList
            isLoading={isLoadingBetTypes}
            betTypes={filteredBetTypes}
            expandedBetType={expandedBetType}
            toggleBetTypeExpansion={toggleBetTypeExpansion}
            onEditBetType={handleEditBetType}
            onToggleStatus={onToggleStatus}
            isSuperAdmin={isSuperAdmin}
            combinationsData={combinationsData}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Danh sách Tổ hợp Số</CardTitle>
        </CardHeader>
        <CardContent>
          <CombinationList
            isLoading={isLoadingCombinations}
            combinations={filteredCombinations}
          />
        </CardContent>
      </Card>

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
