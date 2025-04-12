// src/components/lottery/LotteryResultCard.jsx
import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export function LotteryResultCard({ result }) {
  if (!result || !result.station) return null;

  const regionCode = result.station.region?.code || '';
  const isNorth = regionCode === 'north';

  // Hàm render một giải
  const renderPrize = (
    label,
    numbers,
    largeFont = false,
    customClasses = ''
  ) => {
    if (!numbers || numbers.length === 0) return null;

    return (
      <div className="border-b py-2">
        <div className="grid grid-cols-12">
          <div className="col-span-3 flex items-center font-medium">
            {label}
          </div>
          <div
            className={`col-span-9 grid gap-2 ${numbers.length > 3 ? 'grid-cols-3' : numbers.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}
          >
            {numbers.map((num, index) => (
              <div
                key={index}
                className={`text-center ${largeFont ? 'text-2xl md:text-3xl font-bold' : 'text-base md:text-lg'} ${customClasses}`}
              >
                {num}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Hàm render giải đặc biệt
  const renderSpecialPrize = () => {
    return renderPrize(
      'Giải Đặc Biệt',
      result.special_prize,
      true,
      'text-red-800 dark:text-red-500'
    );
  };

  // Xác định thứ tự render các giải dựa trên miền
  const renderPrizes = () => {
    if (isNorth) {
      return (
        <>
          {renderSpecialPrize()}
          {renderPrize('Giải nhất', result.first_prize)}
          {renderPrize('Giải nhì', result.second_prize)}
          {renderPrize('Giải ba', result.third_prize)}
          {renderPrize('Giải tư', result.fourth_prize)}
          {renderPrize('Giải năm', result.fifth_prize)}
          {renderPrize('Giải sáu', result.sixth_prize)}
          {renderPrize('Giải bảy', result.seventh_prize)}
        </>
      );
    } else {
      return (
        <>
          {renderPrize('Giải tám', result.eighth_prize)}
          {renderPrize('Giải bảy', result.seventh_prize)}
          {renderPrize('Giải sáu', result.sixth_prize)}
          {renderPrize('Giải năm', result.fifth_prize)}
          {renderPrize('Giải tư', result.fourth_prize)}
          {renderPrize('Giải ba', result.third_prize)}
          {renderPrize('Giải nhì', result.second_prize)}
          {renderPrize('Giải nhất', result.first_prize)}
          {renderSpecialPrize()}
        </>
      );
    }
  };

  // Format ngày
  const formattedDate = result.draw_date
    ? format(new Date(result.draw_date), 'dd/MM/yyyy', { locale: vi })
    : '';

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="bg-primary/10 pb-2 pt-3">
        <div className="flex flex-col justify-between space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-primary">
              {result.station.name}
            </h3>
            <Badge variant="outline">{result.day_of_week}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm">{formattedDate}</div>
            <div className="text-xs text-muted-foreground">
              {result.station.region?.code === 'north'
                ? 'XSMB'
                : result.station.region?.code === 'central'
                  ? 'XSMT'
                  : 'XSMN'}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3">{renderPrizes()}</CardContent>
    </Card>
  );
}
