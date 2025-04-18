// src/app/(private)/admin/verifications/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/providers/AuthProvider';
import { useServerQuery } from '@/hooks/useServerAction';
import {
  fetchVerifications,
  fetchAdminsForFilter,
} from '@/app/actions/verifications';
import { FilterCard } from '@/components/shared/FilterCard';
import { VerificationTable } from '@/components/verifications/VerificationTable';
import { toast } from 'sonner';

export default function AdminVerificationsPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Format date for API calls
  const formattedDate = selectedDate
    ? format(selectedDate, 'yyyy-MM-dd')
    : null;

  // Fetch admin users for filter
  const { data: adminsData, isLoading: isLoadingAdmins } = useServerQuery(
    ['admin-users', user?.id],
    () => fetchAdminsForFilter(user?.id),
    {
      enabled: !!user?.id,
      onError: (err) => {
        toast.error(`Lỗi khi tải danh sách người dùng: ${err.message}`);
      },
    }
  );

  // Fetch verifications data
  const {
    data: verificationsData,
    isLoading,
    error,
    refetch,
  } = useServerQuery(
    ['verifications', formattedDate, JSON.stringify(selectedUserIds)],
    () =>
      fetchVerifications(
        formattedDate,
        selectedUserIds.length > 0 ? selectedUserIds : undefined
      ),
    {
      enabled: !!formattedDate && !!user?.id,
      onError: (err) => {
        toast.error(`Lỗi khi tải dữ liệu đối soát: ${err.message}`);
      },
    }
  );

  // Select all users by default on first load
  useEffect(() => {
    if (
      adminsData?.data &&
      adminsData.data.length > 0 &&
      selectedUserIds.length === 0 &&
      !isInitialized
    ) {
      setSelectedUserIds(adminsData.data.map((admin) => admin.id));
      setIsInitialized(true);
    }
  }, [adminsData?.data, selectedUserIds.length, isInitialized]);

  // Log verification data for debugging
  useEffect(() => {
    // For debugging
    if (verificationsData?.data) {
      console.log('Verification data:', verificationsData.data);
    }
  }, [verificationsData]);

  // Handle refresh
  const handleRefresh = () => {
    refetch();
  };

  // Handle reset filter
  const handleResetFilters = () => {
    if (adminsData?.data) {
      setSelectedUserIds(adminsData.data.map((admin) => admin.id));
    }
    setSelectedDate(new Date());
    // Add a small delay to ensure state is updated before refetching
    setTimeout(() => {
      refetch();
    }, 100);
  };

  // Add user ID if it's missing from selectedUserIds
  useEffect(() => {
    if (user?.id && adminsData?.data && isInitialized) {
      // Make sure the current user's ID is in the selection
      // This is important because they might be viewing their own verifications
      if (!selectedUserIds.includes(user.id)) {
        const adminExists = adminsData.data.some(
          (admin) => admin.id === user.id
        );
        if (adminExists) {
          setSelectedUserIds((prev) => [...prev, user.id]);
        }
      }
    }
  }, [user?.id, adminsData?.data, selectedUserIds, isInitialized]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Quản Lý Đối Soát</h1>
        <p className="text-muted-foreground">
          Quản lý và xem chi tiết kết quả đối soát mã cược của người dùng
        </p>
      </div>

      {/* Sử dụng FilterCard mới */}
      <FilterCard
        title="Bộ lọc đối soát"
        description="Lọc dữ liệu đối soát theo người dùng và ngày tháng"
        users={adminsData?.data || []}
        isLoadingUsers={isLoadingAdmins}
        selectedUserIds={selectedUserIds}
        setSelectedUserIds={setSelectedUserIds}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        onRefresh={handleRefresh}
        onResetFilters={handleResetFilters}
        isLoading={isLoading}
      />

      {/* Verification Table */}
      {error ? (
        <div className="p-4 bg-destructive/10 border border-destructive rounded-md text-destructive">
          Có lỗi khi tải dữ liệu: {error}
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <span className="ml-2 text-muted-foreground">
            Đang tải dữ liệu...
          </span>
        </div>
      ) : (
        <VerificationTable verifications={verificationsData?.data || []} />
      )}
    </div>
  );
}
