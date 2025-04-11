// src/utils/stationValidator.js

import { isStationLine } from './parser';

// src/utils/stationValidator.js

/**
 * Validates if a station is available for betting based on current time and day
 * @param {object} parsedStation - The parsed station data from betCodeService
 * @param {object} betConfig - The bet configuration containing station schedules
 * @returns {object} - Validation result {valid: boolean, message: string}
 */
export function validateStationAvailability(parsedStation, betConfig) {
  if (!parsedStation || !betConfig || !betConfig.stationSchedules) {
    return { valid: true }; // Skip validation if missing data
  }

  // Get current time and target day
  const now = new Date();
  const currentHour = now.getHours();
  let targetDate = new Date(now);

  // If it's after 6PM (18:00), we check tomorrow's schedule
  if (currentHour >= 18) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  // Get the day of week in lowercase
  const daysOfWeek = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  const targetDay = daysOfWeek[targetDate.getDay()];
  const timePhrase = currentHour >= 18 ? 'ngày mai' : 'hôm nay';

  // Find all relevant stations to check
  const stationsToCheck = [];

  // Handle multi-station case with specific stations (e.g., vl.ct)
  if (parsedStation.stations) {
    for (const stationItem of parsedStation.stations) {
      const matchingStation = findMatchingStation(
        stationItem.name,
        betConfig.accessibleStations
      );
      if (matchingStation) {
        stationsToCheck.push({
          name: stationItem.name,
          id: matchingStation.id,
        });
      }
    }
  }
  // Handle multiStation case (e.g., 2dmn, 3dmt)
  else if (parsedStation.multiStation) {
    // Get all stations in the region
    const stationsInRegion = betConfig.accessibleStations
      .filter((station) => station.region?.code === parsedStation.region)
      .map((station) => ({ name: station.name, id: station.id }));

    // We need at least 'count' stations from this region
    if (stationsInRegion.length < (parsedStation.count || 1)) {
      const regionName =
        betConfig.regions.find((r) => r.code === parsedStation.region)?.name ||
        parsedStation.region;
      return {
        valid: false,
        message: `Không đủ đài trong ${regionName} để đặt cược.`,
      };
    }

    // Find stations with schedules for the target day
    const availableStations = stationsInRegion.filter((station) => {
      return betConfig.stationSchedules.some(
        (schedule) =>
          schedule.stationId === station.id &&
          (schedule.dayOfWeek === targetDay || schedule.dayOfWeek === 'daily')
      );
    });

    if (availableStations.length < (parsedStation.count || 1)) {
      const regionName =
        betConfig.regions.find((r) => r.code === parsedStation.region)?.name ||
        parsedStation.region;
      return {
        valid: false,
        message: `Không đủ đài trong ${regionName} có lịch xổ số vào ${timePhrase}. Chỉ có ${availableStations.length} đài hoạt động.`,
      };
    }

    return { valid: true };
  }
  // Handle single station case (e.g., mb, tp)
  else {
    const matchingStation = findMatchingStation(
      parsedStation.name,
      betConfig.accessibleStations
    );
    if (matchingStation) {
      stationsToCheck.push({
        name: parsedStation.name,
        id: matchingStation.id,
      });
    }
  }

  // Check each station for valid schedule
  for (const station of stationsToCheck) {
    const hasSchedule = betConfig.stationSchedules.some(
      (schedule) =>
        schedule.stationId === station.id &&
        (schedule.dayOfWeek === targetDay || schedule.dayOfWeek === 'daily')
    );

    if (!hasSchedule) {
      return {
        valid: false,
        message: `Đài "${station.name}" không có lịch xổ số vào ${timePhrase}. Vui lòng chọn đài khác.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Find a matching station in accessibleStations by name
 * @param {string} stationName - The station name to match
 * @param {array} accessibleStations - List of accessible stations
 * @returns {object|null} - Matching station or null
 */
function findMatchingStation(stationName, accessibleStations) {
  if (!stationName || !accessibleStations) return null;

  const normalizedName = stationName.toLowerCase();

  // First, look for exact name match
  let match = accessibleStations.find(
    (station) => station.name.toLowerCase() === normalizedName
  );

  // If no exact match, try aliases
  if (!match) {
    match = accessibleStations.find(
      (station) =>
        station.aliases &&
        Array.isArray(station.aliases) &&
        station.aliases.some((alias) => alias.toLowerCase() === normalizedName)
    );
  }

  return match;
}

/**
 * Validates multiple bet lines with different stations
 * @param {string} betCode - Raw bet code with multiple lines
 * @param {object} betConfig - Configuration including schedules
 * @returns {object} - Validation results for each station line
 */
export function validateMultiStationBetCode(betCode, betConfig) {
  if (!betCode || !betConfig) {
    return { valid: true };
  }

  // Split code into lines and identify station lines
  const lines = betCode
    .trim()
    .split('\n')
    .filter((line) => line.trim());
  const results = [];
  let currentStation = null;
  let isValid = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if this is a station line
    if (isStationLine(line, betConfig)) {
      // Parse station info
      const parsedStation = parseStationFromLine(line, betConfig);
      if (parsedStation) {
        currentStation = parsedStation;

        // Validate this station
        const validation = validateStationAvailability(
          parsedStation,
          betConfig
        );
        if (!validation.valid) {
          results.push({
            lineIndex: i,
            stationLine: line,
            valid: false,
            message: validation.message,
            station: parsedStation,
          });
          isValid = false;
        } else {
          results.push({
            lineIndex: i,
            stationLine: line,
            valid: true,
            station: parsedStation,
          });
        }
      }
    }
  }

  return {
    valid: isValid,
    results: results,
    message: isValid ? null : formatValidationMessages(results),
  };
}

/**
 * Parse station information from a line
 * Helper function for validateMultiStationBetCode
 */
function parseStationFromLine(line, betConfig) {
  try {
    const stationText = line.trim().toLowerCase();

    // First try direct match on station names
    for (const station of betConfig.accessibleStations) {
      if (station.name.toLowerCase() === stationText) {
        return {
          name: station.name,
          region: station.region?.code || 'unknown',
        };
      }

      // Check aliases
      if (
        station.aliases &&
        station.aliases.some((alias) => alias === stationText)
      ) {
        return {
          name: station.name,
          region: station.region?.code || 'unknown',
        };
      }
    }

    // Improved multi-region pattern matching with priority for Vietnamese lottery abbreviations
    // Better mapping for region abbreviations
    if (/^\d+d/i.test(stationText)) {
      const countMatch = stationText.match(/^(\d+)d/i);
      const count = parseInt(countMatch[1], 10);
      let regionCode = 'unknown';

      // Handle common Vietnamese lottery abbreviations with correct precedence
      if (stationText.match(/^(\d+)d(mn|nam|n$)/i)) {
        // 2dmn, 2dnam, 2dn → South region (miền Nam)
        regionCode = 'south';
      } else if (stationText.match(/^(\d+)d(mt|trung|t$)/i)) {
        // 2dmt, 2dtrung, 2dt → Central region (miền Trung)
        regionCode = 'central';
      } else if (stationText.match(/^(\d+)d(mb|bac|b$)/i)) {
        // 2dmb, 2dbac, 2db → North region (miền Bắc)
        regionCode = 'north';
      }

      // Get the display name for the region
      const regionName =
        {
          south: 'Nam',
          central: 'Trung',
          north: 'Bắc',
        }[regionCode] || '?';

      return {
        multiStation: true,
        region: regionCode,
        count: count,
        name: `${count} đài miền ${regionName}`,
      };
    }

    // Handle multi-station case (e.g., vl.ct)
    if (line.includes('.')) {
      const stationParts = line.split('.');
      const stations = [];

      for (const part of stationParts) {
        const trimmedPart = part.trim().toLowerCase();
        for (const station of betConfig.accessibleStations) {
          if (
            station.name.toLowerCase() === trimmedPart ||
            (station.aliases &&
              station.aliases.some((alias) => alias === trimmedPart))
          ) {
            stations.push({
              name: station.name,
              region: station.region?.code || 'unknown',
            });
            break;
          }
        }
      }

      if (stations.length > 0) {
        return {
          stations: stations,
          region: stations[0].region,
          name: stations.map((s) => s.name).join('.'),
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error parsing station:', error);
    return null;
  }
}

/**
 * Format validation messages for all station errors
 */
function formatValidationMessages(results) {
  const invalidResults = results.filter((r) => !r.valid);

  if (invalidResults.length === 0) {
    return null;
  }

  if (invalidResults.length === 1) {
    return invalidResults[0].message;
  }

  return (
    'Lỗi lịch xổ số:\n' +
    invalidResults.map((r) => `- ${r.stationLine}: ${r.message}`).join('\n')
  );
}
