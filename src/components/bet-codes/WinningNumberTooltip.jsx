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
  station_data,
}) {
  const [result, setResult] = useState(null);

  // Fetch all lottery results for the date
  const { data: resultsData, isLoading } = useServerQuery(
    ['lotteryResults', drawDate, entryId],
    () => fetchLotteryResults({ date: drawDate }),
    {
      enabled: !!drawDate,
    }
  );

  useEffect(() => {
    if (resultsData?.data && resultsData.data.length > 0) {
      let matchingResult = null;

      // If we have a direct station, find that specific result
      if (station?.id) {
        matchingResult = resultsData.data.find(
          (result) => result.station_id === station.id
        );
      }
      // Otherwise, try to find a match based on station_data
      else if (station_data) {
        // If it's a multi-station bet
        if (station_data.multiStation && station_data.region) {
          // Try to find a result where the number matches in one of the prizes
          for (const res of resultsData.data) {
            if (res.station?.region?.code === station_data.region) {
              // Check if this number matches in any of the prizes
              const allPrizes = [
                ...(res.special_prize || []),
                ...(res.first_prize || []),
                ...(res.second_prize || []),
                ...(res.third_prize || []),
                ...(res.fourth_prize || []),
                ...(res.fifth_prize || []),
                ...(res.sixth_prize || []),
                ...(res.seventh_prize || []),
                ...(res.eighth_prize || []),
              ];

              // Match by the last n digits where n is the length of the number
              const matchFound = allPrizes.some((prize) =>
                prize.endsWith(number)
              );

              if (matchFound) {
                matchingResult = res;
                break;
              }
            }
          }

          // If no match found, just take the first result from this region
          if (!matchingResult) {
            matchingResult = resultsData.data.find(
              (result) => result.station?.region?.code === station_data.region
            );
          }
        }
        // If station_data has a specific ID, use that
        else if (station_data.id) {
          matchingResult = resultsData.data.find(
            (result) => result.station_id === station_data.id
          );
        }
        // If station_data has a name, try to match by name
        else if (station_data.name) {
          matchingResult = resultsData.data.find(
            (result) =>
              result.station?.name.toLowerCase() ===
              station_data.name.toLowerCase()
          );
        }
      }

      setResult(matchingResult);
    }
  }, [resultsData, station, station_data, number]);

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
