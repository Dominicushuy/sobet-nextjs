// src/app/actions/user-stations.js
'use server';

import { createClient } from '@/utils/supabase/server';

export async function fetchUserStationsAccess(userId) {
  try {
    const supabase = await createClient();

    // Lấy tất cả đài được active và user có quyền truy cập
    const { data: stationsAccess, error: accessError } = await supabase
      .from('user_station_access')
      .select(
        `
        id,
        is_enabled,
        stations (
          id,
          name,
          region_id,
          aliases,
          is_active,
          region:regions (id, name, code, aliases),
          schedules:station_schedules (id, day_of_week, order_number)
        )
      `
      )
      .eq('user_id', userId)
      .eq('is_enabled', true);

    if (accessError) {
      console.error('Error fetching user stations access:', accessError);
      return { data: null, error: accessError.message };
    }

    // Lọc các đài không active
    const activeStations = stationsAccess.filter(
      (item) => item.stations?.is_active === true
    );

    // Nhóm đài theo miền
    const groupedStations = {};
    activeStations.forEach((item) => {
      const station = item.stations;
      if (station && station.region) {
        if (!groupedStations[station.region.id]) {
          groupedStations[station.region.id] = {
            ...station.region,
            stations: [],
          };
        }
        groupedStations[station.region.id].stations.push(station);
      }
    });

    return {
      data: {
        groupedStations: Object.values(groupedStations),
        totalStations: activeStations.length,
      },
      error: null,
    };
  } catch (error) {
    console.error('Unexpected error in fetchUserStationsAccess:', error);
    return { data: null, error: 'Internal server error' };
  }
}
