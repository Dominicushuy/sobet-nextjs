// src/components/lottery/LotteryResultCard.jsx
'use client';

import { format } from 'date-fns';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function LotteryResultCard({ result }) {
  if (!result) return null;

  const renderPrize = (prize, isSpecial = false) => {
    if (!prize || !Array.isArray(prize) || prize.length === 0) return '-';
    return prize.map((number, idx) => (
      <span
        key={idx}
        className={`inline-block mx-1 font-mono font-semibold ${isSpecial ? 'text-primary text-lg' : ''}`}
      >
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
    <Card className="h-full">
      <CardHeader className="pb-2 flex flex-row justify-between items-center">
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
        <Badge variant={getBadgeVariant(result.station?.region?.code)}>
          {result.station?.region?.name || 'Miền'}
        </Badge>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-2">
          <PrizeRow
            label="Đặc biệt"
            value={renderPrize(result.special_prize, true)}
            special
          />
          <PrizeRow label="Giải nhất" value={renderPrize(result.first_prize)} />
          <PrizeRow label="Giải nhì" value={renderPrize(result.second_prize)} />
          <PrizeRow label="Giải ba" value={renderPrize(result.third_prize)} />
          <PrizeRow label="Giải tư" value={renderPrize(result.fourth_prize)} />
          <PrizeRow label="Giải năm" value={renderPrize(result.fifth_prize)} />
          <PrizeRow label="Giải sáu" value={renderPrize(result.sixth_prize)} />
          <PrizeRow
            label="Giải bảy"
            value={renderPrize(result.seventh_prize)}
          />
          {result.eighth_prize && result.eighth_prize.length > 0 && (
            <PrizeRow
              label="Giải tám"
              value={renderPrize(result.eighth_prize)}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PrizeRow({ label, value, special = false }) {
  return (
    <div
      className={`flex justify-between items-center py-1 ${special ? 'bg-primary/5 rounded-md px-2' : ''}`}
    >
      <div className="font-medium w-20">{label}</div>
      <div
        className={`flex flex-wrap justify-end ${special ? 'text-primary font-bold' : ''}`}
      >
        {value}
      </div>
    </div>
  );
}

function getBadgeVariant(regionCode) {
  switch (regionCode) {
    case 'north':
      return 'secondary';
    case 'central':
      return 'outline';
    case 'south':
      return 'default';
    default:
      return 'default';
  }
}
