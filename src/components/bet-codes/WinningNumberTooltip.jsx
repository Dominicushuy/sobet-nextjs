import { useState, useEffect } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { LotteryResultCard } from '@/components/lottery/LotteryResultCard';
import { useServerQuery } from '@/hooks/useServerAction';
import { fetchLotteryResults } from '@/app/actions/lottery-results';
import { Loader2 } from 'lucide-react';

export function WinningNumberTooltip({
  number,
  matchedNumbers,
  entryId,
  station,
  drawDate,
}) {
  const [result, setResult] = useState(null);

  // Fetch the lottery result for this station and date
  const { data: resultsData, isLoading } = useServerQuery(
    ['lotteryResult', station?.id, drawDate, entryId],
    () => fetchLotteryResults({ stationId: station?.id, date: drawDate }),
    {
      enabled: !!station?.id && !!drawDate,
    }
  );

  useEffect(() => {
    if (resultsData?.data && resultsData.data.length > 0) {
      // Find the result for this station
      const stationResult = resultsData.data.find(
        (result) => result.station_id === station.id
      );
      setResult(stationResult);
    }
  }, [resultsData, station]);

  // Check if this number is matched
  const isMatched = matchedNumbers && matchedNumbers.includes(number);

  if (!isMatched) {
    return <span className="text-inherit">{number}</span>;
  }

  return (
    <Popover>
      <PopoverTrigger>
        <span className="px-1.5 py-0.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 font-medium rounded cursor-pointer">
          {number}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 max-h-[80vh] overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : result ? (
          <LotteryResultCard result={result} highlightNumber={number} />
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            Không tìm thấy thông tin kết quả xổ số
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
