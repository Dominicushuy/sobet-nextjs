'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { formatDate } from '@/utils/formatters';
import { getStationName } from '@/utils/displayUtils';
import { StationEntriesGroup } from './StationEntriesGroup';

export function UserEntriesCard({
  userId,
  userData,
  entries,
  totalAmount,
  totalStake,
  totalCount,
  selectedEntryIds = [],
  onSelectEntry,
  isInitiallyExpanded = true,
}) {
  const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded);

  // Group entries by station
  const entriesByStation = {};
  const stationTotals = {};

  // Tính số mã cược draft của user này
  const userDraftEntries = entries.filter((entry) => entry.status === 'draft');
  const userDraftCount = userDraftEntries.length;

  // Kiểm tra xem đã chọn tất cả mã draft của user này chưa
  const userDraftIds = userDraftEntries.map((entry) => entry.id);
  const userDraftSelected =
    userDraftIds.length > 0 &&
    userDraftIds.every((id) => selectedEntryIds.includes(id));

  // Group entries by station
  entries.forEach((entry) => {
    const stationName = getStationName(entry);
    const stationKey = stationName.replace(/\s+/g, '-').toLowerCase();

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
    stationTotals[stationKey].totalAmount += Number(entry.amount) || 0;
    stationTotals[stationKey].totalStake += Number(entry.stake) || 0;
    stationTotals[stationKey].count += 1;
  });

  // Toggle selection for all draft entries of this user
  const handleToggleSelectAllDrafts = (e) => {
    e.stopPropagation(); // Ngăn không cho event bubbling

    if (userDraftSelected) {
      // Bỏ chọn tất cả mã của user này
      onSelectEntry(
        selectedEntryIds.filter((id) => !userDraftIds.includes(id))
      );
    } else {
      // Chọn tất cả mã draft của user này
      const newSelection = [...selectedEntryIds];
      userDraftIds.forEach((id) => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      onSelectEntry(newSelection);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader
        className="pb-3 flex flex-row items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <CardTitle className="flex items-center">
            {userData.full_name || userData.username || userData.email}
            <Badge variant="secondary" className="ml-2">
              {totalCount} mã cược
            </Badge>
            {userDraftCount > 0 && (
              <Badge variant="outline" className="ml-2 text-amber-500">
                {userDraftCount} mã nháp
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 py-2 px-3 bg-muted/50 rounded-md border">
              <div className="flex items-center">
                <span className="text-sm font-semibold mr-2">
                  Tổng số tiền cược:
                </span>
                <span className="text-sm font-bold text-primary">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-semibold mr-2">
                  Tổng số tiền đóng:
                </span>
                <span className="text-sm font-bold text-primary">
                  {formatCurrency(totalStake)}
                </span>
              </div>
            </div>
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {userDraftCount > 0 && (
            <Button
              variant={userDraftSelected ? 'secondary' : 'outline'}
              size="sm"
              onClick={handleToggleSelectAllDrafts}
            >
              {userDraftSelected
                ? `Bỏ chọn ${userDraftCount} mã`
                : `Chọn ${userDraftCount} mã nháp`}
            </Button>
          )}
          <Button variant="ghost" size="icon">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      {/* Checkbox column */}
                    </TableHead>
                    <TableHead>Đài</TableHead>
                    <TableHead>Loại cược</TableHead>
                    <TableHead>Số cược</TableHead>
                    <TableHead>Tiền cược</TableHead>
                    <TableHead>Tiền đóng</TableHead>
                    <TableHead>Tiền thắng</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày cược</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <StationEntriesGroup
                    entriesByStation={entriesByStation}
                    stationTotals={stationTotals}
                    userId={userId}
                    isSelectable={true}
                    selectedEntryIds={selectedEntryIds}
                    onSelectEntry={onSelectEntry}
                  />
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      )}

      <CardFooter className="bg-muted/30 py-2 px-6 flex justify-end">
        <div className="text-sm text-muted-foreground">
          Cập nhật:{' '}
          {entries.length > 0 ? formatDate(entries[0]?.created_at) : ''}
        </div>
      </CardFooter>
    </Card>
  );
}
