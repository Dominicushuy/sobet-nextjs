// src/services/bet/stationValidator.js

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

  //   console.log('validateStationAvailability', parsedStation, betConfig);

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
