// src/app/(private)/admin/bet-types/components/CombinationList.jsx
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RefreshCw } from 'lucide-react';

export default function CombinationList({ isLoading, combinations }) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Đang tải...</p>
      </div>
    );
  }

  if (!combinations?.length) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">Không tìm thấy tổ hợp số nào</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Tên tổ hợp</TableHead>
            <TableHead>Bí danh</TableHead>
            <TableHead>Định nghĩa</TableHead>
            <TableHead>Cú pháp</TableHead>
            <TableHead>Áp dụng loại cược</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {combinations.map((combination) => (
            <TableRow key={combination.id} className="hover:bg-muted/50">
              <TableCell className="font-medium">{combination.name}</TableCell>
              <TableCell>
                {combination.aliases && combination.aliases.length > 0
                  ? combination.aliases.join(', ')
                  : '-'}
              </TableCell>
              <TableCell>{combination.definition}</TableCell>
              <TableCell>
                <code className="bg-muted px-1.5 py-0.5 rounded text-sm">
                  {combination.syntax}
                </code>
              </TableCell>
              <TableCell>
                {combination.applicable_bet_types &&
                combination.applicable_bet_types.length > 0
                  ? combination.applicable_bet_types.join(', ')
                  : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
