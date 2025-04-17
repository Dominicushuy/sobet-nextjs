import { useState, Fragment } from 'react';
import { ChevronDown, ChevronRight, XCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { formatDate } from '@/utils/formatters';
import { BetStatusBadge } from './BetStatusBadge';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { WinningNumberTooltip } from './WinningNumberTooltip';

export function StationEntriesGroup({
  entriesByStation,
  stationTotals,
  userId,
  isSelectable = false,
  selectedEntryIds = [],
  onSelectEntry,
}) {
  const [expandedStations, setExpandedStations] = useState({});

  // Toggle station group expansion
  const toggleStationExpansion = (stationKey) => {
    setExpandedStations((prev) => ({
      ...prev,
      [stationKey]: !prev[stationKey],
    }));
  };

  // Toggle selection for all entries in a station
  const toggleSelectAllStation = (stationKey) => {
    if (!onSelectEntry) return;

    const stationData = entriesByStation[stationKey];
    const entryIds = stationData.entries
      .filter((entry) => entry.status === 'draft') // Only allow selection of draft entries
      .map((entry) => entry.id);

    // Check if all entries in this station are selected
    const allSelected = entryIds.every((id) => selectedEntryIds.includes(id));

    if (allSelected) {
      // Deselect all entries in this station
      onSelectEntry(selectedEntryIds.filter((id) => !entryIds.includes(id)));
    } else {
      // Select all entries in this station
      const newSelection = [...selectedEntryIds];
      entryIds.forEach((id) => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      onSelectEntry(newSelection);
    }
  };

  // Render winning amount cell based on entry status
  const renderWinningAmount = (entry) => {
    // Nếu chưa xử lý, hiển thị dấu gạch
    if (entry.status !== 'processed') {
      return <span className="text-gray-400">-</span>;
    }

    // Nếu đã xử lý và có thắng
    if (entry.winning_status === true) {
      return (
        <span className="text-green-600 font-bold">
          {formatCurrency(entry.actual_winning)}
        </span>
      );
    }

    // Nếu đã xử lý và không thắng
    return (
      <span className="text-red-500 flex items-center">
        <XCircle className="h-4 w-4 mr-1" />0
      </span>
    );
  };

  // console.log({ entriesByStation });

  return (
    <>
      {Object.keys(entriesByStation).map((stationKey) => {
        const stationData = entriesByStation[stationKey];
        const stationTotal = stationTotals[stationKey];
        const isStationExpanded =
          expandedStations[stationKey] === undefined
            ? true
            : expandedStations[stationKey];

        // Calculate if all selectable entries in this station are selected
        const selectableEntries = stationData.entries.filter(
          (entry) => entry.status === 'draft'
        );
        const stationSelectableCount = selectableEntries.length;
        const stationSelectedCount = selectableEntries.filter((entry) =>
          selectedEntryIds.includes(entry.id)
        ).length;
        const isAllStationSelected =
          stationSelectableCount > 0 &&
          stationSelectableCount === stationSelectedCount;

        return (
          <Fragment key={stationKey}>
            {/* Station group header */}
            <TableRow
              className="bg-muted/40 hover:bg-muted cursor-pointer"
              onClick={() => toggleStationExpansion(stationKey)}
            >
              {isSelectable && (
                <TableCell className="w-10">
                  {stationSelectableCount > 0 && (
                    <Checkbox
                      checked={isAllStationSelected}
                      onCheckedChange={() => toggleSelectAllStation(stationKey)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select all entries for ${stationData.name}`}
                    />
                  )}
                </TableCell>
              )}
              <TableCell colSpan={isSelectable ? 7 : 8} className="py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isStationExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-medium">{stationData.name}</span>
                    <Badge variant="outline" className="ml-2">
                      {stationTotal.count} mã
                    </Badge>
                    {stationSelectableCount > 0 && (
                      <Badge
                        variant="outline"
                        className="ml-1 bg-primary/10 text-primary border-primary/20"
                      >
                        {stationSelectedCount}/{stationSelectableCount} đã chọn
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span>{formatCurrency(stationTotal.totalAmount)}</span>
                    <span>→</span>
                    <span className="font-medium">
                      {formatCurrency(stationTotal.totalStake)}
                    </span>
                  </div>
                </div>
              </TableCell>
            </TableRow>

            {/* Entries for this station */}
            {isStationExpanded &&
              stationData.entries.map((entry) => (
                <TableRow
                  key={entry.id}
                  className={
                    selectedEntryIds.includes(entry.id) ? 'bg-primary/5' : ''
                  }
                >
                  {isSelectable && (
                    <TableCell className="w-10">
                      {entry.status === 'draft' && (
                        <Checkbox
                          checked={selectedEntryIds.includes(entry.id)}
                          onCheckedChange={() => {
                            if (onSelectEntry) {
                              if (selectedEntryIds.includes(entry.id)) {
                                onSelectEntry(
                                  selectedEntryIds.filter(
                                    (id) => id !== entry.id
                                  )
                                );
                              } else {
                                onSelectEntry([...selectedEntryIds, entry.id]);
                              }
                            }
                          }}
                          aria-label={`Select entry ${entry.id}`}
                        />
                      )}
                    </TableCell>
                  )}
                  <TableCell className="pl-8 whitespace-nowrap">
                    {entry.station?.name ||
                      (entry.station_data?.multiStation
                        ? `${entry.station_data.count} Đài ${entry.station_data.name}`
                        : entry.station_data?.name) ||
                      '-'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {entry.bet_type_name} ({entry.bet_type_alias})
                  </TableCell>
                  <TableCell className="w-[250px] max-w-[250px]">
                    {Array.isArray(entry.numbers) &&
                    entry.numbers.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto py-1">
                        {entry.numbers.map((number, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className={`font-medium text-xs ${
                              entry.matched_numbers &&
                              entry.matched_numbers.includes(number)
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800'
                                : 'bg-primary/10 text-primary border-primary/20'
                            }`}
                          >
                            {entry.matched_numbers &&
                            entry.matched_numbers.includes(number) ? (
                              <WinningNumberTooltip
                                number={number}
                                matchedNumbers={entry.matched_numbers}
                                entryId={entry.id}
                                station={entry.station}
                                drawDate={entry.draw_date}
                                station_data={entry.station_data}
                              />
                            ) : (
                              number
                            )}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatCurrency(entry.amount)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span className="text-orange-500 font-semibold">
                        {formatCurrency(entry.original_stake)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {renderWinningAmount(entry)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <BetStatusBadge
                      status={entry.status}
                      winningStatus={entry.winning_status}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(entry.draw_date)}
                  </TableCell>
                </TableRow>
              ))}
          </Fragment>
        );
      })}
    </>
  );
}
