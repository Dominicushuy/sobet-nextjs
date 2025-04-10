'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

const BetResultMessage = ({ betCode }) => {
  // Format station names for display
  const formatStationDisplay = (stationData) => {
    if (!stationData) return 'Không xác định';

    if (
      stationData.specificStations &&
      stationData.specificStations.length > 0
    ) {
      return stationData.specificStations.map((s) => s.name).join(', ');
    }

    if (stationData.regionName && stationData.count) {
      return `${stationData.count} đài ${stationData.regionName}`;
    }

    return 'Không xác định';
  };

  return (
    <div className="ml-10 mr-auto max-w-[90%]">
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex justify-between items-center">
            <span>Mã cược</span>
            <Badge>{betCode.status || 'Đã xác nhận'}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="text-sm">
            <div className="font-semibold mb-2">
              Đài: {formatStationDisplay(betCode.stationData)}
            </div>

            <div className="space-y-2">
              {betCode.betData.lines.map((line, index) => (
                <div key={index} className="border-b pb-1 last:border-0">
                  <div className="flex justify-between">
                    <div>
                      <span className="font-medium">
                        {line.numbers.join(', ')}
                      </span>
                      <span className="ml-1 text-muted-foreground">
                        {line.betTypeAlias}
                      </span>
                    </div>
                    <span>{formatCurrency(line.amount)}/số</span>
                  </div>
                  {line.error && (
                    <div className="text-destructive text-xs mt-1">
                      {line.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-2 pb-2">
          <div className="text-sm">
            <div className="font-semibold">Tổng tiền đặt:</div>
            <div className="text-muted-foreground">
              {formatCurrency(betCode.stakeAmount)}
            </div>
          </div>
          <div className="text-sm text-right">
            <div className="font-semibold">Tiềm năng thắng:</div>
            <div className="text-green-600">
              {formatCurrency(betCode.potentialWinning)}
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default BetResultMessage;
