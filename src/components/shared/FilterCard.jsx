// src/components/shared/FilterCard.jsx
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw,
  ChevronsUpDown,
  Users,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

export function FilterCard({
  title = 'Bộ lọc',
  description = 'Lọc dữ liệu theo người dùng và ngày tháng',
  users = [],
  isLoadingUsers = false,
  selectedUserIds = [],
  setSelectedUserIds = () => {},
  selectedDate = null,
  setSelectedDate = () => {},
  onRefresh = () => {},
  onResetFilters = () => {},
  isLoading = false,
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Lọc users theo từ khóa tìm kiếm
  const filteredUsers = users.filter((user) => {
    if (!searchTerm) return true;
    return (
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Kiểm tra xem tất cả users đã được chọn chưa
  const allUsersSelected =
    users.length > 0 &&
    users.every((user) => selectedUserIds.includes(user.id));

  // Số lượng users đã chọn
  const selectedCount = selectedUserIds.length;

  // Chọn/bỏ chọn tất cả users
  const toggleSelectAll = () => {
    if (allUsersSelected) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(users.map((user) => user.id));
    }
  };

  // Chọn/bỏ chọn một user
  const toggleUser = (userId) => {
    setSelectedUserIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Lấy tên hiển thị của user
  const getUserDisplayName = (user) => {
    return user.full_name || user.username || user.email || 'Unknown User';
  };

  return (
    <Card>
      <CardHeader
        className="pb-3 flex flex-row items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            {title}
            {selectedDate && (
              <Badge variant="secondary" className="ml-2">
                {format(selectedDate, 'dd/MM/yyyy')}
              </Badge>
            )}
            {selectedCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedCount} người dùng
              </Badge>
            )}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
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
        <>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Date Picker */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Ngày</span>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      {selectedDate ? (
                        format(selectedDate, 'dd/MM/yyyy')
                      ) : (
                        <span className="text-muted-foreground">Chọn ngày</span>
                      )}
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

              {/* User Select */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Người dùng</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="h-6 text-xs px-2"
                  >
                    {allUsersSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </Button>
                </div>
                <Popover
                  open={userDropdownOpen}
                  onOpenChange={setUserDropdownOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={userDropdownOpen}
                      className="w-full justify-between"
                    >
                      {selectedCount > 0
                        ? `${selectedCount} người dùng được chọn`
                        : 'Chọn người dùng'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput
                        placeholder="Tìm người dùng..."
                        onValueChange={setSearchTerm}
                      />
                      {isLoadingUsers ? (
                        <div className="flex items-center justify-center py-6">
                          <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                        </div>
                      ) : (
                        <>
                          <CommandEmpty>Không tìm thấy người dùng</CommandEmpty>
                          <CommandGroup>
                            <CommandList className="max-h-[200px]">
                              {filteredUsers.map((user) => (
                                <CommandItem
                                  key={user.id}
                                  value={user.id}
                                  onSelect={() => toggleUser(user.id)}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      selectedUserIds.includes(user.id)
                                        ? 'opacity-100'
                                        : 'opacity-0'
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span>{getUserDisplayName(user)}</span>
                                    {user.email && (
                                      <span className="text-xs text-muted-foreground">
                                        {user.email}
                                      </span>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandList>
                          </CommandGroup>
                        </>
                      )}
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end space-x-2 pt-0">
            <Button
              variant="outline"
              onClick={onResetFilters}
              disabled={isLoading}
            >
              Xóa bộ lọc
            </Button>
            <Button onClick={onRefresh} disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Đang tải...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Áp dụng
                </>
              )}
            </Button>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
