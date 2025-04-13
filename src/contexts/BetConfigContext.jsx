// src/contexts/BetConfigContext.jsx
'use client';

import { useState, useEffect, useContext, createContext } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { fetchBetConfig } from '@/app/actions/bet-codes';

// Giá trị mặc định
const DEFAULT_CONFIG = {
  betTypes: [],
  accessibleStations: [],
  regions: [],
  numberCombinations: [],
  stationSchedules: [],
  commissionSettings: {
    priceRate: 0.8,
    exportPriceRate: 0.74,
    returnPriceRate: 0.95,
  },
};

// Context để lưu trữ và chia sẻ dữ liệu
const BetConfigContext = createContext(DEFAULT_CONFIG);

export function BetConfigProvider({ children }) {
  const { user } = useAuth();
  const [betConfig, setBetConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // console.log({ betConfig });

  // Fetch dữ liệu khi user thay đổi
  useEffect(() => {
    async function loadBetConfig() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await fetchBetConfig(user.id);

        if (error) {
          console.error('Error loading bet config:', error);
          setError(error);
        } else if (data) {
          // Chuyển đổi dữ liệu để khớp với cấu trúc BET_CONFIG
          const configData = {
            betTypes: data.betTypes || DEFAULT_CONFIG.betTypes,
            accessibleStations:
              data.accessibleStations || DEFAULT_CONFIG.accessibleStations,
            regions: data.regions || DEFAULT_CONFIG.regions,
            numberCombinations:
              data.numberCombinations || DEFAULT_CONFIG.numberCombinations,
            stationSchedules:
              data.stationSchedules || DEFAULT_CONFIG.stationSchedules,
            commissionSettings:
              data.commissionSettings || DEFAULT_CONFIG.commissionSettings,
          };

          setBetConfig(configData);
        }
      } catch (err) {
        console.error('Failed to load bet configuration:', err);
        setError(err.message || 'Failed to load bet configuration');
      } finally {
        setLoading(false);
      }
    }

    loadBetConfig();
  }, [user?.id]);

  return (
    <BetConfigContext.Provider
      value={{
        ...betConfig,
        loading,
        error,
        isReady: !loading && !error,
      }}
    >
      {children}
    </BetConfigContext.Provider>
  );
}

export function useBetConfig() {
  const context = useContext(BetConfigContext);
  if (!context) {
    throw new Error('useBetConfig must be used within a BetConfigProvider');
  }
  return context;
}
