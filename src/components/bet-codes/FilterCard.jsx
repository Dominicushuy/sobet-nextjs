'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown, Filter, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserFilter } from './UserFilter';
import { SearchFilter } from './SearchFilter';
import { ActionButtons } from './ActionButtons';

export function FilterCard({
  users = [],
  isLoadingUsers = false,
  selectedUserIds = [],
  setSelectedUserIds,
  searchTerm = '',
  setSearchTerm,
  selectedDate = null,
  setSelectedDate,
  selectedEntryIds = [],
  draftCount = 0,
  isConfirming = false,
  isDeleting = false,
  isLoadingEntries = false,
  onConfirmEntries,
  onDeleteEntries,
  onRefresh,
  onResetFilters,
  isInitiallyExpanded = true,
  onSelectAllDrafts,
}) {
  const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded);
  const [activeTab, setActiveTab] = useState('users');

  // Check if all draft entries are selected
  const isAllDraftsSelected =
    draftCount > 0 && selectedEntryIds.length === draftCount;

  // Handle select all drafts
  const handleSelectAllDrafts = () => {
    // Truyền lệnh lên component cha
    if (typeof onSelectAllDrafts === 'function') {
      onSelectAllDrafts();
    }
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
            Bộ lọc và Người dùng
            {selectedUserIds.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedUserIds.length} người dùng
              </Badge>
            )}
            {selectedDate && (
              <Badge variant="secondary" className="ml-2">
                {format(selectedDate, 'dd/MM/yyyy')}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Chọn người dùng và áp dụng bộ lọc để xem mã cược
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
          <Tabs
            defaultValue="users"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="users" className="flex-1">
                <Users className="mr-2 h-4 w-4" />
                Người dùng
              </TabsTrigger>
              <TabsTrigger value="filters" className="flex-1">
                <Filter className="mr-2 h-4 w-4" />
                Bộ lọc tìm kiếm
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="mt-2">
              <UserFilter
                users={users}
                isLoading={isLoadingUsers}
                selectedUserIds={selectedUserIds}
                setSelectedUserIds={setSelectedUserIds}
                onApplyFilter={() => onRefresh()}
              />
            </TabsContent>

            {/* Filters Tab */}
            <TabsContent value="filters" className="mt-2">
              <SearchFilter
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                onResetFilters={onResetFilters}
                onApplyFilters={() => onRefresh()}
              />
            </TabsContent>
          </Tabs>

          {/* Action Buttons - Always visible regardless of tab */}
          <div className="mt-6 border-t pt-4">
            <ActionButtons
              selectedEntryIds={selectedEntryIds}
              draftCount={draftCount}
              isConfirming={isConfirming}
              isDeleting={isDeleting}
              isLoading={isLoadingEntries}
              onSelectAllDrafts={handleSelectAllDrafts}
              onConfirmEntries={onConfirmEntries}
              onDeleteEntries={onDeleteEntries}
              onRefresh={onRefresh}
              isAllDraftsSelected={isAllDraftsSelected}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
