// src/app/(private)/admin/bet-codes/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useServerQuery, useServerMutation } from '@/hooks/useServerAction';
import {
  fetchAdminBetEntries,
  fetchAdminUsers,
  confirmBetEntries,
  deleteBetEntries,
} from '@/app/actions/bet-entries';
import {
  fetchBetsForReconciliation,
  reconcileBets,
} from '@/app/actions/bet-reconciliation';
import { toast } from 'sonner';

// Import components
import { FilterCard } from '@/components/bet-codes/FilterCard';
import { StatusDisplay } from '@/components/bet-codes/StatusDisplay';
import { UserEntriesCard } from '@/components/bet-codes/UserEntriesCard';
import { EmptyState } from '@/components/bet-codes/EmptyState';
import { ConfirmDialogs } from '@/components/bet-codes/ConfirmDialogs';
import { ReconciliationDialog } from '@/components/bet-codes/ReconciliationDialog';
import { Button } from '@/components/ui/button';
import { CheckSquare } from 'lucide-react';
import moment from 'moment/moment';

export default function AdminBetCodesPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedUsers, setExpandedUsers] = useState({});

  // State for reconciliation dialog
  const [showReconciliationDialog, setShowReconciliationDialog] =
    useState(false);
  const [reconciliationResults, setReconciliationResults] = useState(null);

  // State for selection and confirmation dialogs
  const [selectedEntryIds, setSelectedEntryIds] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dialogAction, setDialogAction] = useState(null);

  // Query for users created by this admin
  const { data: usersData, isLoading: isLoadingUsers } = useServerQuery(
    ['adminUsers', user?.id],
    () => fetchAdminUsers(user?.id),
    {
      enabled: !!user?.id,
      onError: (error) => {
        toast.error('Lỗi khi tải danh sách người dùng: ' + error.message);
      },
    }
  );

  // State to track initialization
  const [isInitialized, setIsInitialized] = useState(false);

  // When users are loaded, select all by default (but only once)
  useEffect(() => {
    if (!isInitialized && usersData?.data && usersData.data.length > 0) {
      setSelectedUserIds(usersData.data.map((user) => user.id));

      // Initialize all users as expanded
      const initialExpandedState = {};
      usersData.data.forEach((user) => {
        initialExpandedState[user.id] = true;
      });
      setExpandedUsers(initialExpandedState);

      setIsInitialized(true);
    }
  }, [usersData?.data, isInitialized]);

  // Query for bet entries
  const {
    data: betEntriesData,
    isLoading: isLoadingEntries,
    refetch: refetchEntries,
  } = useServerQuery(
    ['adminBetEntries', JSON.stringify(selectedUserIds), selectedDate],
    () =>
      fetchAdminBetEntries({
        userIds: selectedUserIds,
        date: moment(selectedDate).format('YYYY-MM-DD'),
      }),
    {
      enabled: selectedUserIds.length > 0,
      onError: (error) => {
        toast.error('Lỗi khi tải mã cược: ' + error.message);
      },
    }
  );

  // Query for reconciliation data
  const {
    data: reconciliationData,
    isLoading: isLoadingReconciliation,
    refetch: refetchReconciliation,
  } = useServerQuery(
    ['reconciliationData', selectedDate],
    () => fetchBetsForReconciliation(moment(selectedDate).format('YYYY-MM-DD')),
    {
      enabled: showReconciliationDialog,
      onError: (error) => {
        toast.error('Lỗi khi tải dữ liệu đối soát: ' + error.message);
      },
    }
  );

  // Mutation to confirm (approve) bet entries
  const { mutate: confirmEntries, isPending: isConfirming } = useServerMutation(
    'confirmBetEntries',
    (entryIds) => confirmBetEntries(entryIds, user?.id),
    {
      onSuccess: (result) => {
        if (result.error) {
          toast.error('Lỗi khi duyệt mã cược: ' + result.error);
        } else {
          toast.success(
            `Đã duyệt ${result.data.updatedCount} mã cược thành công`
          );
          setSelectedEntryIds([]);
          refetchEntries();
        }
      },
      onError: (error) => {
        toast.error('Lỗi hệ thống: ' + error.message);
      },
    }
  );

  // Mutation to delete bet entries
  const { mutate: deleteEntries, isPending: isDeleting } = useServerMutation(
    'deleteBetEntries',
    (entryIds) => deleteBetEntries(entryIds, user?.id),
    {
      onSuccess: (result) => {
        if (result.error) {
          toast.error('Lỗi khi xóa mã cược: ' + result.error);
        } else {
          toast.success(
            `Đã xóa ${result.data.updatedCount} mã cược thành công`
          );
          setSelectedEntryIds([]);
          refetchEntries();
        }
      },
      onError: (error) => {
        toast.error('Lỗi hệ thống: ' + error.message);
      },
    }
  );

  // Mutation to reconcile bet entries
  const { mutate: reconcileEntries, isPending: isReconciling } =
    useServerMutation(
      'reconcileBets',
      ({ betIds, date }) => reconcileBets(betIds, user?.id, date),
      {
        onSuccess: (result) => {
          if (result.error) {
            toast.error('Lỗi khi đối soát mã cược: ' + result.error);
            setShowReconciliationDialog(false);
          } else {
            toast.success('Đối soát mã cược thành công');
            setReconciliationResults(result.data.results);
            refetchEntries();
          }
        },
        onError: (error) => {
          toast.error('Lỗi hệ thống: ' + error.message);
          setShowReconciliationDialog(false);
        },
      }
    );

  // Reset filters
  const resetFilters = () => {
    setSelectedDate(null);
    setSearchTerm('');
    if (usersData?.data) {
      setSelectedUserIds(usersData.data.map((user) => user.id));
    }
    setSelectedEntryIds([]);
  };

  // Handle confirmation dialog
  const handleConfirmAction = () => {
    if (dialogAction === 'confirm') {
      confirmEntries(selectedEntryIds);
    } else if (dialogAction === 'delete') {
      deleteEntries(selectedEntryIds);
    }
    setShowConfirmDialog(false);
    setShowDeleteDialog(false);
  };

  // Handle opening reconciliation dialog
  const handleOpenReconciliation = () => {
    setReconciliationResults(null);
    setShowReconciliationDialog(true);
    refetchReconciliation();
  };

  // Handle closing reconciliation dialog
  const handleCloseReconciliation = () => {
    setShowReconciliationDialog(false);
    setReconciliationResults(null);
  };

  // Handle reconciliation confirmation
  const handleConfirmReconciliation = (betIds) => {
    reconcileEntries({
      betIds,
      date: moment(selectedDate).format('YYYY-MM-DD'),
    });
  };

  // Handle select all draft entries
  const handleSelectAllDrafts = () => {
    if (!filteredEntries || filteredEntries.length === 0) return;

    // Get all draft entry IDs
    const allDraftIds = filteredEntries
      .filter((entry) => entry.status === 'draft')
      .map((entry) => entry.id);

    // Check if all draft entries are already selected
    const allSelected = allDraftIds.every((id) =>
      selectedEntryIds.includes(id)
    );

    if (allSelected) {
      // Unselect all draft entries
      setSelectedEntryIds(
        selectedEntryIds.filter((id) => !allDraftIds.includes(id))
      );
    } else {
      // Select all draft entries
      const newSelection = [...selectedEntryIds];
      allDraftIds.forEach((id) => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      setSelectedEntryIds(newSelection);
    }
  };

  // Filter bet entries by search term
  const filteredEntries = betEntriesData?.data
    ? betEntriesData.data.filter((entry) => {
        if (!searchTerm) return true;

        // Search in bet entry properties
        return (
          entry.original_text
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          entry.formatted_text
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          entry.bet_type_alias
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          entry.user?.username
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          entry.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.station?.name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (Array.isArray(entry.numbers) &&
            entry.numbers.some((num) =>
              num.toLowerCase().includes(searchTerm.toLowerCase())
            ))
        );
      })
    : [];

  // Count drafts in filtered entries for action buttons
  const draftCount = filteredEntries.filter(
    (entry) => entry.status === 'draft'
  ).length;

  // Count confirmed entries for reconciliation button
  const confirmedCount = filteredEntries.filter(
    (entry) => entry.status === 'confirmed'
  ).length;

  // Group entries by user
  const entriesByUser = {};
  const userTotals = {};

  if (filteredEntries.length > 0) {
    filteredEntries.forEach((entry) => {
      const userId = entry.user_id;

      if (!entriesByUser[userId]) {
        entriesByUser[userId] = [];
        userTotals[userId] = { totalAmount: 0, totalStake: 0, count: 0 };
      }

      entriesByUser[userId].push(entry);
      userTotals[userId].totalAmount += Number(entry.amount) || 0;
      userTotals[userId].totalStake += Number(entry.stake) || 0;
      userTotals[userId].count += 1;
    });
  }

  // Find user by ID
  const findUserById = (userId) => {
    return (
      usersData?.data?.find((u) => u.id === userId) || {
        full_name: 'Unknown User',
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold">Quản Lý Mã Cược</h1>
          <p className="text-muted-foreground">
            Quản lý và xử lý mã cược của người dùng
          </p>
        </div>
      </div>

      {/* Unified Filter Card with Tabs and Action Buttons */}
      <FilterCard
        users={usersData?.data || []}
        isLoadingUsers={isLoadingUsers}
        selectedUserIds={selectedUserIds}
        setSelectedUserIds={setSelectedUserIds}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        selectedEntryIds={selectedEntryIds}
        draftCount={draftCount}
        isConfirming={isConfirming}
        isDeleting={isDeleting}
        isLoadingEntries={isLoadingEntries}
        onConfirmEntries={() => {
          setDialogAction('confirm');
          setShowConfirmDialog(true);
        }}
        onDeleteEntries={() => {
          setDialogAction('delete');
          setShowDeleteDialog(true);
        }}
        onRefresh={refetchEntries}
        onResetFilters={resetFilters}
        onSelectAllDrafts={handleSelectAllDrafts}
        isAllDraftsSelected={
          draftCount > 0 &&
          filteredEntries.filter((e) => e.status === 'draft').length ===
            filteredEntries.filter(
              (e) => e.status === 'draft' && selectedEntryIds.includes(e.id)
            ).length
        }
      />

      {/* Status info */}
      <div className="flex items-center justify-between bg-card p-4 rounded-lg shadow-sm border">
        <StatusDisplay
          isLoading={isLoadingEntries}
          selectedUserIds={selectedUserIds}
          entriesCount={filteredEntries.length}
          draftCount={draftCount}
          userCount={Object.keys(entriesByUser).length}
          selectedEntryIds={selectedEntryIds}
        />

        {confirmedCount > 0 && !isLoadingEntries && (
          <Button
            size="sm"
            onClick={handleOpenReconciliation}
            variant="outline"
            className="ml-2 bg-green-50 text-green-600 border-green-200 hover:bg-green-100 hover:text-green-700"
          >
            <CheckSquare className="mr-2 h-4 w-4" />
            Đối soát {confirmedCount} mã xác nhận
          </Button>
        )}
      </div>

      {/* User bet groups */}
      {selectedUserIds.length === 0 ? (
        <EmptyState
          type="no-users"
          onAction={() => {
            // Open the filter card if it's not already open
            document.querySelector('[data-state="inactive"]')?.click();
          }}
          actionLabel="Chọn người dùng"
        />
      ) : isLoadingEntries ? (
        <div className="flex justify-center py-12">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
            <p className="text-muted-foreground">Đang tải dữ liệu...</p>
          </div>
        </div>
      ) : Object.keys(entriesByUser).length > 0 ? (
        Object.keys(entriesByUser).map((userId) => {
          const userData = findUserById(userId);
          const userEntries = entriesByUser[userId];
          const userTotal = userTotals[userId];

          return (
            <UserEntriesCard
              key={userId}
              userId={userId}
              userData={userData}
              entries={userEntries}
              totalAmount={userTotal.totalAmount}
              totalStake={userTotal.totalStake}
              totalCount={userTotal.count}
              selectedEntryIds={selectedEntryIds}
              onSelectEntry={setSelectedEntryIds}
              isInitiallyExpanded={!!expandedUsers[userId]}
            />
          );
        })
      ) : (
        <EmptyState
          type="no-entries"
          onAction={resetFilters}
          actionLabel="Xóa bộ lọc"
        />
      )}

      {/* Confirm Dialogs */}
      <ConfirmDialogs
        showConfirmDialog={showConfirmDialog}
        setShowConfirmDialog={setShowConfirmDialog}
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        selectedCount={selectedEntryIds.length}
        isConfirming={isConfirming}
        isDeleting={isDeleting}
        onConfirm={handleConfirmAction}
      />

      {/* Reconciliation Dialog */}
      <ReconciliationDialog
        isOpen={showReconciliationDialog}
        onClose={handleCloseReconciliation}
        date={selectedDate}
        reconciliationData={reconciliationData?.data}
        isLoading={isLoadingReconciliation}
        onConfirmReconciliation={handleConfirmReconciliation}
        isProcessing={isReconciling}
        results={reconciliationResults}
      />
    </div>
  );
}
