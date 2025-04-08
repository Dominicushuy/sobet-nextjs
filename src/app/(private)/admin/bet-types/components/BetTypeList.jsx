// src/app/(private)/admin/bet-types/components/BetTypeList.jsx
import React, { Fragment } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronDown,
  ChevronRight,
  Edit,
  MoreHorizontal,
  Power,
  PowerOff,
  RefreshCw,
} from 'lucide-react';
import BetTypeDetails from './BetTypeDetails';
import { formatRegions } from './utils';

export default function BetTypeList({
  isLoading,
  betTypes,
  expandedBetType,
  toggleBetTypeExpansion,
  onEditBetType,
  onToggleStatus,
  isSuperAdmin,
  combinationsData,
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Đang tải...</p>
      </div>
    );
  }

  if (!betTypes?.length) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">Không tìm thấy loại cược nào</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Tên loại cược</TableHead>
            <TableHead>Bí danh</TableHead>
            <TableHead>Áp dụng miền</TableHead>
            <TableHead>Quy tắc cược</TableHead>
            {isSuperAdmin && <TableHead>Trạng thái</TableHead>}
            {isSuperAdmin && (
              <TableHead className="text-right">Hành động</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {betTypes.map((betType) => (
            <Fragment key={betType.id}>
              <TableRow
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => toggleBetTypeExpansion(betType.id)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    {expandedBetType === betType.id ? (
                      <ChevronDown className="h-4 w-4 mr-2 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mr-2 shrink-0" />
                    )}
                    {betType.name}
                  </div>
                </TableCell>
                <TableCell>
                  {betType.aliases && betType.aliases.length > 0
                    ? betType.aliases.join(', ')
                    : '-'}
                </TableCell>
                <TableCell>
                  {formatRegions(betType.applicable_regions)}
                </TableCell>
                <TableCell>
                  {betType.bet_rule && betType.bet_rule.length > 0
                    ? betType.bet_rule.join(', ')
                    : '-'}
                </TableCell>
                {isSuperAdmin && (
                  <TableCell>
                    <Badge
                      variant={betType.is_active ? 'default' : 'destructive'}
                    >
                      {betType.is_active ? 'Hoạt động' : 'Vô hiệu hóa'}
                    </Badge>
                  </TableCell>
                )}
                {isSuperAdmin && (
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="sr-only">Mở menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Tùy chọn</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditBetType(betType);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleStatus(betType);
                          }}
                        >
                          {betType.is_active ? (
                            <>
                              <PowerOff className="mr-2 h-4 w-4" />
                              Vô hiệu hóa
                            </>
                          ) : (
                            <>
                              <Power className="mr-2 h-4 w-4" />
                              Kích hoạt
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
              {expandedBetType === betType.id && (
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={isSuperAdmin ? 6 : 4} className="p-4">
                    <BetTypeDetails
                      betType={betType}
                      combinationsData={combinationsData}
                    />
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
