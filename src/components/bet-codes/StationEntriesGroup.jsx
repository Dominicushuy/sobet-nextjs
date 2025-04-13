'use client';

import { useState, Fragment } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { formatDateTime } from '@/utils/formatters';
import { BetStatusBadge } from './BetStatusBadge';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';

export function StationEntriesGroup({
  entriesByStation,
  stationTotals,
  userId,
}) {
  const [expandedStations, setExpandedStations] = useState({});

  // Toggle station group expansion
  const toggleStationExpansion = (stationKey) => {
    setExpandedStations((prev) => ({
      ...prev,
      [stationKey]: !prev[stationKey],
    }));
  };

  return (
    <>
      {Object.keys(entriesByStation).map((stationKey) => {
        const stationData = entriesByStation[stationKey];
        const stationTotal = stationTotals[stationKey];
        const isStationExpanded =
          expandedStations[stationKey] === undefined
            ? true
            : expandedStations[stationKey];

        return (
          <Fragment key={stationKey}>
            {/* Station group header */}
            <TableRow
              className="bg-muted/40 hover:bg-muted cursor-pointer"
              onClick={() => toggleStationExpansion(stationKey)}
            >
              <TableCell colSpan={7} className="py-2">
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
                <TableRow key={entry.id}>
                  <TableCell className="pl-8">
                    {entry.station?.name ||
                      (entry.station_data?.multiStation
                        ? `${entry.station_data.count} Đài ${entry.station_data.name}`
                        : entry.station_data?.name) ||
                      '-'}
                  </TableCell>
                  <TableCell>
                    {entry.bet_type_name} ({entry.bet_type_alias})
                  </TableCell>
                  <TableCell className="flex items-center gap-2">
                    {Array.isArray(entry.numbers)
                      ? entry.numbers.map((number, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="font-medium bg-primary/10 text-primary border-primary/20 text-xs"
                          >
                            {number}
                          </Badge>
                        ))
                      : entry.numbers || '-'}
                  </TableCell>
                  <TableCell>{formatCurrency(entry.amount)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-orange-500 font-semibold">
                        {formatCurrency(entry.original_stake)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <BetStatusBadge
                      status={entry.status}
                      winningStatus={entry.winning_status}
                    />
                  </TableCell>
                  <TableCell>{formatDateTime(entry.draw_date)}</TableCell>
                </TableRow>
              ))}
          </Fragment>
        );
      })}
    </>
  );
}
