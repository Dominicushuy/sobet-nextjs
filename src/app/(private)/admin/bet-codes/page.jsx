'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Search, X, RefreshCw } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useServerQuery } from '@/hooks/useServerAction';
import {
  fetchAdminBetEntries,
  fetchAdminUsers,
} from '@/app/actions/bet-entries';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { formatDate } from '@/utils/formatters';

export default function AdminBetCodesPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  // Query for users created by this admin
  const { data: usersData, isLoading: isLoadingUsers } = useServerQuery(
    ['adminUsers', user?.id],
    () => fetchAdminUsers(user?.id),
    {
      enabled: !!user?.id,
      onError: (error) => {
        toast.error('Error loading users: ' + error.message);
      },
    }
  );

  console.log('Selected User IDs:', usersData);

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
        date: selectedDate,
      }),
    {
      enabled: selectedUserIds.length > 0,
      onError: (error) => {
        toast.error('Error loading bet entries: ' + error.message);
      },
    }
  );

  // Handle user selection
  const handleUserToggle = (userId) => {
    setSelectedUserIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Select all users
  const handleSelectAllUsers = () => {
    if (usersData?.data) {
      if (selectedUserIds.length === usersData.data.length) {
        setSelectedUserIds([]);
      } else {
        setSelectedUserIds(usersData.data.map((user) => user.id));
      }
    }
  };

  // Reset filters
  const resetFilters = () => {
    setSelectedUserIds([]);
    setSelectedDate(null);
    setSearchTerm('');
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
          entry.users?.username
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          entry.users?.email
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          entry.stations?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      })
    : [];

  console.log('Filtered Entries:', filteredEntries);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Mã Cược</h1>
          <p className="text-muted-foreground">
            Danh sách mã cược của người dùng trong hệ thống
          </p>
        </div>
        <Button
          onClick={() => refetchEntries()}
          disabled={selectedUserIds.length === 0}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Làm mới
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Bộ lọc</CardTitle>
          <CardDescription>
            Lọc danh sách mã cược theo người dùng và ngày
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* User filter */}
            <div className="space-y-2">
              <Label>Người dùng</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                <div className="flex items-center space-x-2 p-2">
                  <Checkbox
                    id="select-all"
                    checked={
                      usersData?.data &&
                      usersData.data.length > 0 &&
                      selectedUserIds.length === usersData.data.length
                    }
                    onCheckedChange={handleSelectAllUsers}
                  />
                  <label
                    htmlFor="select-all"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Chọn tất cả
                  </label>
                </div>

                {isLoadingUsers ? (
                  <div className="flex justify-center py-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                  </div>
                ) : (
                  usersData?.data?.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center space-x-2 p-2"
                    >
                      <Checkbox
                        id={`user-${user.id}`}
                        checked={selectedUserIds.includes(user.id)}
                        onCheckedChange={() => handleUserToggle(user.id)}
                      />
                      <label
                        htmlFor={`user-${user.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {user.full_name || user.username || user.email}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Date filter */}
            <div className="space-y-2">
              <Label>Ngày</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP') : 'Chọn ngày'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Search filter */}
            <div className="space-y-2">
              <Label>Tìm kiếm</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm mã cược..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Reset filters */}
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button
                variant="outline"
                className="w-full"
                onClick={resetFilters}
              >
                Xóa bộ lọc
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Danh sách mã cược</CardTitle>
          <CardDescription>
            {selectedUserIds.length === 0
              ? 'Vui lòng chọn ít nhất một người dùng'
              : isLoadingEntries
                ? 'Đang tải dữ liệu...'
                : `Hiển thị ${filteredEntries.length} mã cược`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedUserIds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-center text-muted-foreground">
                Vui lòng chọn ít nhất một người dùng để xem mã cược
              </p>
            </div>
          ) : isLoadingEntries ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredEntries.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>Đài</TableHead>
                    <TableHead>Loại cược</TableHead>
                    <TableHead>Số cược</TableHead>
                    <TableHead>Tiền cược</TableHead>
                    <TableHead>Tiền đóng</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày cược</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {entry.user?.full_name ||
                          entry.user?.username ||
                          entry.user?.email ||
                          '-'}
                      </TableCell>
                      <TableCell>
                        {entry.station?.name || entry.station_data?.name || '-'}
                      </TableCell>
                      <TableCell>{entry.bet_type_alias || '-'}</TableCell>
                      <TableCell>
                        {Array.isArray(entry.numbers)
                          ? entry.numbers.join(', ')
                          : entry.numbers || '-'}
                      </TableCell>
                      <TableCell>{formatCurrency(entry.amount)}</TableCell>
                      <TableCell>{formatCurrency(entry.stake)}</TableCell>
                      <TableCell>
                        <BetStatusBadge
                          status={entry.status}
                          winningStatus={entry.winning_status}
                        />
                      </TableCell>
                      <TableCell>{formatDate(entry.draw_date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-center text-muted-foreground">
                Không tìm thấy mã cược nào
              </p>
              <Button variant="outline" className="mt-4" onClick={resetFilters}>
                Xóa bộ lọc
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper component for bet status badges
function BetStatusBadge({ status, winningStatus }) {
  let className =
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ';
  let label = '';

  // Determine badge style based on status and winning status
  switch (status) {
    case 'draft':
      className +=
        'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700';
      label = 'Nháp';
      break;
    case 'confirmed':
      className +=
        'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800';
      label = 'Đã xác nhận';
      break;
    case 'processed':
      if (winningStatus === true) {
        className +=
          'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800';
        label = 'Trúng thưởng';
      } else if (winningStatus === false) {
        className +=
          'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800';
        label = 'Không trúng';
      } else {
        className +=
          'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-800';
        label = 'Đã xử lý';
      }
      break;
    case 'deleted':
      className +=
        'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800';
      label = 'Đã xóa';
      break;
    default:
      className +=
        'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700';
      label = status || 'Unknown';
  }

  return <span className={className}>{label}</span>;
}
