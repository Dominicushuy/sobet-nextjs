// src/components/lottery/LotteryResultTable.jsx
'use client';

import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export function LotteryResultTable({ result }) {
  if (!result) return null;

  const renderPrize = (prize) => {
    if (!prize || !Array.isArray(prize) || prize.length === 0) return '-';
    return prize.map((number, idx) => (
      <span key={idx} className="inline-block mx-1 font-mono font-semibold">
        {number}
      </span>
    ));
  };

  const mapDayOfWeek = (day) => {
    const dayMap = {
      monday: 'Thứ hai',
      tuesday: 'Thứ ba',
      wednesday: 'Thứ tư',
      thursday: 'Thứ năm',
      friday: 'Thứ sáu',
      saturday: 'Thứ bảy',
      sunday: 'Chủ nhật',
      daily: 'Hàng ngày',
    };
    return dayMap[day.toLowerCase()] || day;
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold">
            {result.station?.name || 'Đài xổ số'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {result.draw_date
              ? format(new Date(result.draw_date), 'dd/MM/yyyy')
              : ''}
            {' - '}
            {mapDayOfWeek(result.day_of_week)}
          </p>
        </div>
        <Badge>{result.station?.region?.name || 'Miền'}</Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Giải</TableHead>
            <TableHead>Kết quả</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">Đặc biệt</TableCell>
            <TableCell className="text-primary">
              {renderPrize(result.special_prize)}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Giải nhất</TableCell>
            <TableCell>{renderPrize(result.first_prize)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Giải nhì</TableCell>
            <TableCell>{renderPrize(result.second_prize)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Giải ba</TableCell>
            <TableCell>{renderPrize(result.third_prize)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Giải tư</TableCell>
            <TableCell>{renderPrize(result.fourth_prize)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Giải năm</TableCell>
            <TableCell>{renderPrize(result.fifth_prize)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Giải sáu</TableCell>
            <TableCell>{renderPrize(result.sixth_prize)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Giải bảy</TableCell>
            <TableCell>{renderPrize(result.seventh_prize)}</TableCell>
          </TableRow>
          {result.eighth_prize && result.eighth_prize.length > 0 && (
            <TableRow>
              <TableCell className="font-medium">Giải tám</TableCell>
              <TableCell>{renderPrize(result.eighth_prize)}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
