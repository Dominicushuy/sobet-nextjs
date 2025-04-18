// src/components/bet-types/CombinationList.jsx
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
import { Card, CardContent } from '@/components/ui/card';

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

// Phiên bản Card dành cho hiển thị trong danh sách chi tiết
export function CombinationCard({ combination }) {
  return (
    <Card className="h-full">
      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold mb-2">{combination.name}</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Bí danh:</p>
            <p className="text-sm text-muted-foreground">
              {combination.aliases && combination.aliases.length > 0
                ? combination.aliases.join(', ')
                : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Định nghĩa:</p>
            <p className="text-sm">{combination.definition}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Cú pháp:</p>
            <code className="bg-muted px-2 py-1 rounded text-sm block">
              {combination.syntax}
            </code>
          </div>
          <div>
            <p className="text-sm font-medium">Ví dụ:</p>
            <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded-md text-sm text-blue-600 dark:text-blue-400">
              {combination.examples && combination.examples.length > 0
                ? combination.examples.map((example, i) => (
                    <p key={i}>{example}</p>
                  ))
                : 'Không có ví dụ'}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">Áp dụng cho loại cược:</p>
            <p className="text-sm">
              {combination.applicable_bet_types &&
              combination.applicable_bet_types.length > 0
                ? combination.applicable_bet_types.join(', ')
                : '-'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
