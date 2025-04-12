'use client';

import { useState, useEffect, Fragment } from 'react';
import { format } from 'date-fns';
import {
  CalendarIcon,
  Search,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Filter,
  Info,
  ChevronRight,
} from 'lucide-react';
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
  CardFooter,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { formatDate } from '@/utils/formatters';

export default function AdminBetCodesPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);
  const [expandedUsers, setExpandedUsers] = useState({});
  const [expandedStations, setExpandedStations] = useState({});

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

  // When users are loaded, select all by default
  useEffect(() => {
    if (
      usersData?.data &&
      usersData.data.length > 0 &&
      selectedUserIds.length === 0
    ) {
      setSelectedUserIds(usersData.data.map((user) => user.id));

      // Initialize all users as expanded
      const initialExpandedState = {};
      usersData.data.forEach((user) => {
        initialExpandedState[user.id] = true;
      });
      setExpandedUsers(initialExpandedState);
    }
  }, [usersData?.data, selectedUserIds.length]);

  // Toggle station group expansion
  const toggleStationExpansion = (userId, stationKey) => {
    const key = `${userId}-${stationKey}`;
    setExpandedStations((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

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

  // Toggle user card expansion
  const toggleUserExpansion = (userId) => {
    setExpandedUsers((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  // Select all users
  const handleSelectAllUsers = () => {
    if (usersData?.data) {
      const filteredUsers = usersData.data.filter(
        (user) =>
          user.full_name
            ?.toLowerCase()
            .includes(userSearchTerm.toLowerCase()) ||
          user.username?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(userSearchTerm.toLowerCase())
      );

      if (selectedUserIds.length === filteredUsers.length) {
        setSelectedUserIds([]);
      } else {
        setSelectedUserIds(filteredUsers.map((user) => user.id));
      }
    }
  };

  // Reset filters
  const resetFilters = () => {
    setSelectedDate(null);
    setSearchTerm('');
    setUserSearchTerm('');
    if (usersData?.data) {
      setSelectedUserIds(usersData.data.map((user) => user.id));
    }
  };

  // Filtered users for the selection panel
  const filteredUsers = usersData?.data
    ? usersData.data.filter((user) => {
        if (!userSearchTerm) return true;
        return (
          user.full_name
            ?.toLowerCase()
            .includes(userSearchTerm.toLowerCase()) ||
          user.username?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(userSearchTerm.toLowerCase())
        );
      })
    : [];

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

      {/* Filter Card */}
      <Card>
        <CardHeader
          className="pb-3 flex flex-row items-center justify-between cursor-pointer"
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
        >
          <div>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Bộ lọc
              {selectedDate || selectedUserIds.length > 0 ? (
                <Badge variant="secondary" className="ml-2">
                  {selectedUserIds.length} users {selectedDate ? '+ date' : ''}
                </Badge>
              ) : null}
            </CardTitle>
            <CardDescription>
              Lọc danh sách mã cược theo người dùng và ngày
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon">
            {isFilterExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CardHeader>

        {isFilterExpanded && (
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* User filter */}
              <div className="space-y-2 md:col-span-2">
                <Label>Người dùng</Label>
                <div className="border rounded-md p-2">
                  <div className="flex items-center space-x-2 p-2 mb-2">
                    <Checkbox
                      id="select-all"
                      checked={
                        filteredUsers.length > 0 &&
                        selectedUserIds.length === filteredUsers.length
                      }
                      onCheckedChange={handleSelectAllUsers}
                    />
                    <label
                      htmlFor="select-all"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Chọn tất cả ({filteredUsers.length}/
                      {usersData?.data?.length || 0})
                    </label>

                    <div className="relative flex-1 ml-4">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Tìm người dùng..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                      {userSearchTerm && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setUserSearchTerm('')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <ScrollArea className="h-32">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                      {isLoadingUsers ? (
                        <div className="flex justify-center py-2 col-span-3">
                          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                        </div>
                      ) : (
                        filteredUsers.map((user) => (
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
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 truncate"
                              title={
                                user.full_name || user.username || user.email
                              }
                            >
                              {user.full_name || user.username || user.email}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
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
                <Label>Tìm kiếm mã cược</Label>
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
            </div>

            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={resetFilters}>
                Xóa bộ lọc
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Status info */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {selectedUserIds.length === 0
            ? 'Vui lòng chọn ít nhất một người dùng'
            : isLoadingEntries
              ? 'Đang tải dữ liệu...'
              : `Hiển thị ${filteredEntries.length} mã cược từ ${Object.keys(entriesByUser).length} người dùng`}
        </h2>
        {isLoadingEntries && (
          <RefreshCw className="h-5 w-5 animate-spin text-primary" />
        )}
      </div>

      {/* User bet groups */}
      {selectedUserIds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-center text-muted-foreground">
              Vui lòng chọn ít nhất một người dùng để xem mã cược
            </p>
          </CardContent>
        </Card>
      ) : isLoadingEntries ? (
        <Card>
          <CardContent className="flex justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : Object.keys(entriesByUser).length > 0 ? (
        Object.keys(entriesByUser).map((userId) => {
          const userData = findUserById(userId);
          const userEntries = entriesByUser[userId];
          const userTotal = userTotals[userId];
          const isExpanded = expandedUsers[userId];

          return (
            <Card key={userId} className="mb-4">
              <CardHeader
                className="pb-3 flex flex-row items-center justify-between cursor-pointer"
                onClick={() => toggleUserExpansion(userId)}
              >
                <div>
                  <CardTitle className="flex items-center">
                    {userData.full_name || userData.username || userData.email}
                    <Badge variant="secondary" className="ml-2">
                      {userTotal.count} mã cược
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 py-2 px-3 bg-muted/50 rounded-md border">
                      <div className="flex items-center">
                        <span className="text-sm font-semibold mr-2">
                          Tổng số tiền cược:
                        </span>
                        <span className="text-sm font-bold text-primary">
                          {formatCurrency(userTotal.totalAmount)}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm font-semibold mr-2">
                          Tổng số tiền đóng:
                        </span>
                        <span className="text-sm font-bold text-primary">
                          {formatCurrency(userTotal.totalStake)}
                        </span>
                      </div>
                    </div>
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CardHeader>

              {isExpanded && (
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
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
                        {(() => {
                          // Group entries by station
                          const entriesByStation = {};
                          const stationTotals = {};

                          userEntries.forEach((entry) => {
                            const stationName =
                              entry.station?.name ||
                              (entry.station_data?.multiStation
                                ? `${entry.station_data.count} Đài ${entry.station_data.name}`
                                : entry.station_data?.name) ||
                              'Không xác định';

                            const stationKey = stationName
                              .replace(/\s+/g, '-')
                              .toLowerCase();

                            if (!entriesByStation[stationKey]) {
                              entriesByStation[stationKey] = {
                                name: stationName,
                                entries: [],
                              };
                              stationTotals[stationKey] = {
                                totalAmount: 0,
                                totalStake: 0,
                                count: 0,
                              };
                            }

                            entriesByStation[stationKey].entries.push(entry);
                            stationTotals[stationKey].totalAmount +=
                              Number(entry.amount) || 0;
                            stationTotals[stationKey].totalStake +=
                              Number(entry.stake) || 0;
                            stationTotals[stationKey].count += 1;
                          });

                          // Render grouped entries
                          return Object.keys(entriesByStation).map(
                            (stationKey) => {
                              const stationData = entriesByStation[stationKey];
                              const stationTotal = stationTotals[stationKey];
                              const expandedKey = `${userId}-${stationKey}`;
                              const isStationExpanded =
                                expandedStations[expandedKey] === undefined
                                  ? true
                                  : expandedStations[expandedKey];

                              return (
                                <Fragment key={stationKey}>
                                  {/* Station group header */}
                                  <TableRow
                                    className="bg-muted/40 hover:bg-muted cursor-pointer"
                                    onClick={() =>
                                      toggleStationExpansion(userId, stationKey)
                                    }
                                  >
                                    <TableCell colSpan={7} className="py-2">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          {isStationExpanded ? (
                                            <ChevronDown className="h-4 w-4" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4" />
                                          )}
                                          <span className="font-medium">
                                            {stationData.name}
                                          </span>
                                          <Badge
                                            variant="outline"
                                            className="ml-2"
                                          >
                                            {stationTotal.count} mã
                                          </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm">
                                          <span>
                                            {formatCurrency(
                                              stationTotal.totalAmount
                                            )}
                                          </span>
                                          <span>→</span>
                                          <span className="font-medium">
                                            {formatCurrency(
                                              stationTotal.totalStake
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>

                                  {/* Entries for this station */}
                                  {isStationExpanded &&
                                    stationData.entries.map((entry) => (
                                      <TableRow key={entry.id}>
                                        <TableCell className="pl-8">
                                          {entry.station?.name ||
                                            (entry.station_data?.multiStation
                                              ? `${entry.station_data.count} Đài ${entry.station_data.name}`
                                              : entry.station_data?.name) ||
                                            '-'}
                                        </TableCell>
                                        <TableCell>
                                          {entry.bet_type_alias || '-'}
                                        </TableCell>
                                        <TableCell>
                                          {Array.isArray(entry.numbers)
                                            ? entry.numbers.join(', ')
                                            : entry.numbers || '-'}
                                        </TableCell>
                                        <TableCell>
                                          {formatCurrency(entry.amount)}
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-1">
                                            {formatCurrency(entry.stake)}
                                            {entry.calculation_formula && (
                                              <TooltipProvider>
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help" />
                                                  </TooltipTrigger>
                                                  <TooltipContent className="max-w-sm">
                                                    <p className="font-mono text-xs">
                                                      {
                                                        entry.calculation_formula
                                                      }
                                                    </p>
                                                  </TooltipContent>
                                                </Tooltip>
                                              </TooltipProvider>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <BetStatusBadge
                                            status={entry.status}
                                            winningStatus={entry.winning_status}
                                          />
                                        </TableCell>
                                        <TableCell>
                                          {formatDate(entry.draw_date)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                </Fragment>
                              );
                            }
                          );
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              )}

              <CardFooter className="bg-muted/30 py-2 px-6 flex justify-end">
                <div className="text-sm text-muted-foreground">
                  Updated: {formatDate(userEntries[0]?.created_at)}
                </div>
              </CardFooter>
            </Card>
          );
        })
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-center text-muted-foreground">
              Không tìm thấy mã cược nào
            </p>
            <Button variant="outline" className="mt-4" onClick={resetFilters}>
              Xóa bộ lọc
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper component for bet status badges
function BetStatusBadge({ status, winningStatus }) {
  let variant = 'default';
  let label = '';

  // Determine badge style based on status and winning status
  switch (status) {
    case 'draft':
      variant = 'secondary';
      label = 'Nháp';
      break;
    case 'confirmed':
      variant = 'default';
      label = 'Đã xác nhận';
      break;
    case 'processed':
      if (winningStatus === true) {
        variant = 'success';
        label = 'Trúng thưởng';
      } else if (winningStatus === false) {
        variant = 'destructive';
        label = 'Không trúng';
      } else {
        variant = 'outline';
        label = 'Đã xử lý';
      }
      break;
    case 'deleted':
      variant = 'destructive';
      label = 'Đã xóa';
      break;
    default:
      variant = 'secondary';
      label = status || 'Unknown';
  }

  return <Badge variant={variant}>{label}</Badge>;
}
