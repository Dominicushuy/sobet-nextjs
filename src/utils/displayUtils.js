// src/utils/displayUtils.js
// Create this new file if it doesn't exist

/**
 * Get formatted station name from entry data
 * Handles various station data formats including arrays of stations
 * @param {Object} entry - The bet entry object
 * @returns {String} Formatted station name
 */
export function getStationName(entry) {
  if (entry.station?.name) {
    return entry.station.name;
  } else if (entry.station_data) {
    if (
      entry.station_data.stations &&
      Array.isArray(entry.station_data.stations)
    ) {
      // Handle stations array format
      return entry.station_data.stations.map((s) => s.name).join(', ');
    } else if (entry.station_data.multiStation) {
      // Handle multi-station format
      return `${entry.station_data.count} Đài ${entry.station_data.name}`;
    } else if (entry.station_data.name) {
      // Simple station name
      return entry.station_data.name;
    }
  }
  return 'Không xác định';
}
