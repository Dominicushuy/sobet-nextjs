'use client';

import { useState } from 'react';
import { Search, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

export function UserFilter({
  users = [],
  isLoading = false,
  selectedUserIds = [],
  setSelectedUserIds,
  onApplyFilter,
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtered users based on search term
  const filteredUsers = users.filter((user) => {
    if (!searchTerm) return true;
    return (
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Handle user selection
  const handleUserToggle = (userId) => {
    setSelectedUserIds((prev) => {
      // Kiểm tra xem ID này đã tồn tại trong mảng chưa
      const exists = prev.includes(userId);

      if (exists) {
        // Nếu đã tồn tại, bỏ chọn bằng cách loại bỏ khỏi mảng
        return prev.filter((id) => id !== userId);
      } else {
        // Nếu chưa tồn tại, thêm vào mảng
        return [...prev, userId];
      }
    });
  };

  // Select all or none
  const handleSelectAllUsers = () => {
    // Lấy danh sách ID của các user đang hiển thị sau khi lọc
    const filteredUserIds = filteredUsers.map((user) => user.id);

    // Kiểm tra xem tất cả các user đang hiển thị đã được chọn chưa
    const allFilteredUsersSelected = filteredUserIds.every((id) =>
      selectedUserIds.includes(id)
    );

    if (allFilteredUsersSelected) {
      // Nếu tất cả đã được chọn, bỏ chọn các user đang hiển thị
      setSelectedUserIds((prevSelected) =>
        prevSelected.filter((id) => !filteredUserIds.includes(id))
      );
    } else {
      // Nếu chưa tất cả được chọn, chọn thêm các user chưa được chọn
      setSelectedUserIds((prevSelected) => {
        const newSelection = [...prevSelected];

        // Thêm các ID chưa có trong selection
        filteredUserIds.forEach((id) => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });

        return newSelection;
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="select-all"
            checked={
              filteredUsers.length > 0 &&
              filteredUsers.every((user) => selectedUserIds.includes(user.id))
            }
            onCheckedChange={handleSelectAllUsers}
          />
          <label
            htmlFor="select-all"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Chọn tất cả ({filteredUsers.length}/{users.length || 0})
          </label>
        </div>
        <div className="flex-1 max-w-xs ml-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm người dùng..."
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

      <div className="border rounded-md p-2">
        <ScrollArea className="h-48">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-1">
            {isLoading ? (
              <div className="flex justify-center py-4 col-span-3">
                <RefreshCw className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center p-2 border rounded-md hover:bg-muted/50"
                >
                  <Checkbox
                    id={`user-${user.id}`}
                    checked={selectedUserIds.includes(user.id)}
                    onCheckedChange={() => handleUserToggle(user.id)}
                    className="mr-2"
                  />
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor={`user-${user.id}`}
                      className="text-sm font-medium cursor-pointer truncate block"
                      title={user.full_name || user.username || user.email}
                    >
                      {user.full_name || user.username}
                    </label>
                    {user.email && (
                      <span className="text-xs text-muted-foreground truncate block">
                        {user.email}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-4 text-muted-foreground">
                Không tìm thấy người dùng
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex justify-start space-x-2">
        <Button
          variant="outline"
          onClick={() => {
            // Hãy đảm bảo rõ ràng về hành động này
            if (users.length > 0) {
              // Nếu tất cả các user đang được chọn, bỏ chọn tất cả
              if (users.every((user) => selectedUserIds.includes(user.id))) {
                setSelectedUserIds([]);
              } else {
                // Ngược lại, chọn tất cả
                setSelectedUserIds(users.map((user) => user.id));
              }
            }
            setSearchTerm('');
          }}
        >
          {users.every((user) => selectedUserIds.includes(user.id))
            ? 'Bỏ chọn tất cả'
            : 'Chọn tất cả'}
        </Button>
        <Button onClick={onApplyFilter}>
          Áp dụng
          {selectedUserIds.length > 0 && (
            <Badge className="ml-2 bg-white text-primary">
              {selectedUserIds.length}
            </Badge>
          )}
        </Button>
      </div>
    </div>
  );
}
