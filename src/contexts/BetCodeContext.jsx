// src/contexts/BetCodeContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useReducer,
} from 'react';
import betCodeService from '@/services/bet';
import { useBetConfig } from './BetConfigContext';

// Define action types
const ACTION_TYPES = {
  INIT_CODES: 'INIT_CODES',
  ADD_DRAFT: 'ADD_DRAFT',
  REMOVE_DRAFT: 'REMOVE_DRAFT',
  EDIT_DRAFT: 'EDIT_DRAFT',
  SELECT_CODE: 'SELECT_CODE',
  CLEAR_SELECTION: 'CLEAR_SELECTION',
  BATCH_DELETE: 'BATCH_DELETE',
  FILTER_CODES: 'FILTER_CODES',
};

// Reducer to manage state
const betCodeReducer = (state, action) => {
  switch (action.type) {
    case ACTION_TYPES.INIT_CODES:
      return {
        ...state,
        draftCodes: action.payload.draftCodes || [],
        isInitialized: true,
      };

    case ACTION_TYPES.ADD_DRAFT: {
      // Create new code with unique ID
      const uniqueId = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      // Prepare new code
      const newCode = {
        ...action.payload,
        id: action.payload.id || uniqueId,
        createdAt: action.payload.createdAt || new Date().toISOString(),
        isDraft: true,
        status: 'pending',
      };

      // If this is an automatically expanded code, add info about the expansion
      if (action.payload.autoExpanded) {
        newCode.autoExpanded = true;
        newCode.specialCase = action.payload.specialCase || true;
        // Don't store too detailed specialCases info in state
        delete newCode.specialCases;

        return {
          ...state,
          draftCodes: [...state.draftCodes, newCode],
          lastOperation: {
            type: 'add_draft',
            timestamp: new Date().toISOString(),
            autoExpanded: true,
            specialCase: action.payload.specialCase || true,
          },
        };
      }

      return {
        ...state,
        draftCodes: [...state.draftCodes, newCode],
        lastOperation: {
          type: 'add_draft',
          timestamp: new Date().toISOString(),
        },
      };
    }

    case ACTION_TYPES.REMOVE_DRAFT:
      return {
        ...state,
        draftCodes: state.draftCodes.filter(
          (code) => code.id !== action.payload.id
        ),
        lastOperation: {
          type: 'remove_draft',
          timestamp: new Date().toISOString(),
          codeId: action.payload.id,
        },
      };

    case ACTION_TYPES.EDIT_DRAFT:
      return {
        ...state,
        draftCodes: state.draftCodes.map((code) =>
          code.id === action.payload.id
            ? {
                ...code,
                ...action.payload.updates,
                updatedAt: new Date().toISOString(),
              }
            : code
        ),
        lastOperation: {
          type: 'edit_draft',
          timestamp: new Date().toISOString(),
          codeId: action.payload.id,
        },
      };

    case ACTION_TYPES.SELECT_CODE:
      return {
        ...state,
        selectedCodeId: action.payload.id,
      };

    case ACTION_TYPES.CLEAR_SELECTION:
      return {
        ...state,
        selectedCodeId: null,
      };

    case ACTION_TYPES.BATCH_DELETE:
      return {
        ...state,
        draftCodes: state.draftCodes.filter(
          (code) => !action.payload.ids.includes(code.id)
        ),
        lastOperation: {
          type: 'batch_delete',
          timestamp: new Date().toISOString(),
          count: action.payload.ids.length,
        },
      };

    case ACTION_TYPES.FILTER_CODES:
      return {
        ...state,
        filterCriteria: action.payload.criteria,
      };

    default:
      return state;
  }
};

// Initial state
const initialState = {
  draftCodes: [], // Draft bet codes
  selectedCodeId: null, // ID of selected bet code
  isInitialized: false, // Whether initialized from storage
  lastOperation: null, // Info about last operation
  filterCriteria: null, // Filter criteria
};

const BetCodeContext = createContext();

export function BetCodeProvider({ children }) {
  const [state, dispatch] = useReducer(betCodeReducer, initialState);
  const { draftCodes, selectedCodeId, isInitialized } = state;

  const betConfig = useBetConfig();

  // Load from session storage on mount
  useEffect(() => {
    try {
      const savedDraftCodes = sessionStorage.getItem('draftCodes');

      dispatch({
        type: ACTION_TYPES.INIT_CODES,
        payload: {
          draftCodes: savedDraftCodes ? JSON.parse(savedDraftCodes) : [],
        },
      });
    } catch (error) {
      console.error('Error loading from session storage:', error);
      // Initialize with empty arrays if error
      dispatch({
        type: ACTION_TYPES.INIT_CODES,
        payload: { draftCodes: [] },
      });
    }
  }, []);

  // Save to session storage when state changes
  useEffect(() => {
    if (!isInitialized) return;

    try {
      sessionStorage.setItem('draftCodes', JSON.stringify(draftCodes));
    } catch (error) {
      console.error('Error saving to session storage:', error);
    }
  }, [draftCodes, isInitialized]);

  // Add a new draft code
  const addDraftCode = useCallback((code) => {
    dispatch({
      type: ACTION_TYPES.ADD_DRAFT,
      payload: code,
    });
  }, []);

  // Remove a draft code
  const removeDraftCode = useCallback((id) => {
    dispatch({
      type: ACTION_TYPES.REMOVE_DRAFT,
      payload: { id },
    });
  }, []);

  // Edit a draft code
  const editDraftCode = useCallback((id, updates) => {
    dispatch({
      type: ACTION_TYPES.EDIT_DRAFT,
      payload: { id, updates },
    });
  }, []);

  // Save a draft code (simplified to just log action, no state change)
  const confirmDraftCode = useCallback((id) => {
    console.log('Save action triggered for code:', id);
    // In a real app, you might trigger navigation or API call here
    // But we don't actually modify the state anymore
  }, []);

  // Save all draft codes (simplified to just log action, no state change)
  const confirmDraftCodes = useCallback(() => {
    console.log('Save all action triggered');
    // In a real app, you might trigger navigation or API call here
    // But we don't actually modify the state anymore

    console.log('Draft codes to be saved:', state.draftCodes);
  }, [state]);

  // Select a code
  const selectBetCode = useCallback((id) => {
    dispatch({
      type: ACTION_TYPES.SELECT_CODE,
      payload: { id },
    });
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    dispatch({
      type: ACTION_TYPES.CLEAR_SELECTION,
    });
  }, []);

  // Batch delete codes
  const batchDeleteCodes = useCallback((ids) => {
    dispatch({
      type: ACTION_TYPES.BATCH_DELETE,
      payload: { ids },
    });
  }, []);

  // Filter codes
  const filterCodes = useCallback((criteria) => {
    dispatch({
      type: ACTION_TYPES.FILTER_CODES,
      payload: { criteria },
    });
  }, []);

  // Get a specific bet code by id
  const getBetCode = useCallback(
    (id) => {
      return draftCodes.find((code) => code.id === id);
    },
    [draftCodes]
  );

  // Get currently selected bet code
  const getSelectedBetCode = useCallback(() => {
    if (!selectedCodeId) return null;
    return getBetCode(selectedCodeId);
  }, [selectedCodeId, getBetCode]);

  // Get total statistics (simplified for draft codes only)
  const getStatistics = useCallback(() => {
    const totalDraftCodes = draftCodes.length;
    const totalAutoExpandedCodes = draftCodes.filter(
      (code) => code.autoExpanded
    ).length;

    // Calculate total stake and potential amounts
    const totalDraftStake = draftCodes.reduce(
      (sum, code) => sum + (code.stakeAmount || 0),
      0
    );
    const totalDraftPotential = draftCodes.reduce(
      (sum, code) => sum + (code.potentialWinning || 0),
      0
    );

    // Count by station
    const stationCounts = {};
    draftCodes.forEach((code) => {
      const stationName = code.station?.name || 'Unknown';
      stationCounts[stationName] = (stationCounts[stationName] || 0) + 1;
    });

    // Add special case statistics
    const specialCaseStats = {
      autoExpanded: totalAutoExpandedCodes,
      groupedNumbers: draftCodes.filter(
        (code) => code.specialCase === 'number_grouped'
      ).length,
      multipleBetTypes: draftCodes.filter(
        (code) => code.specialCase === 'multiple_bet_types'
      ).length,
      daGrouped: draftCodes.filter((code) => code.specialCase === 'da_grouped')
        .length,
    };

    return {
      totalBetCodes: 0, // No saved codes in simplified version
      totalDraftCodes,
      totalStake: 0, // No saved codes in simplified version
      totalPotential: 0, // No saved codes in simplified version
      totalDraftStake,
      totalDraftPotential,
      stationCounts,
      specialCaseStats,
    };
  }, [draftCodes]);

  // Function to calculate statistics for filtered codes
  const getFilteredStatistics = useCallback((filteredCodes = []) => {
    if (!filteredCodes || filteredCodes.length === 0) {
      return {
        totalStake: 0,
        totalPotential: 0,
        count: 0,
      };
    }

    const totalStake = filteredCodes.reduce(
      (sum, code) => sum + (code.stakeAmount || 0),
      0
    );
    const totalPotential = filteredCodes.reduce(
      (sum, code) => sum + (code.potentialWinning || 0),
      0
    );

    return {
      totalStake,
      totalPotential,
      count: filteredCodes.length,
    };
  }, []);

  // Filter codes with the current filter criteria
  const getFilteredCodes = useCallback(() => {
    // In the simplified version, all codes are drafts
    const { filterCriteria } = state;
    const codes = draftCodes;

    if (!filterCriteria) return codes;

    return codes.filter((code) => {
      // If we only have searchText, perform a comprehensive text search
      if (
        Object.keys(filterCriteria).length === 1 &&
        filterCriteria.searchText
      ) {
        const searchText = filterCriteria.searchText.toLowerCase();

        // Function to check if search text exists in any numbers array
        const hasMatchInNumbers = (lines) => {
          if (!lines || !Array.isArray(lines)) return false;

          for (const line of lines) {
            // Check in numbers array
            if (line.numbers && Array.isArray(line.numbers)) {
              if (line.numbers.some((num) => num.includes(searchText))) {
                return true;
              }
            }

            // Check in original line text
            if ((line.originalLine || '').toLowerCase().includes(searchText)) {
              return true;
            }

            // Check in bet type
            if (
              (line.betType?.alias || '').toLowerCase().includes(searchText)
            ) {
              return true;
            }
          }
          return false;
        };

        // Search in original text
        if ((code.originalText || '').toLowerCase().includes(searchText)) {
          return true;
        }

        // Search in formatted text
        if ((code.formattedText || '').toLowerCase().includes(searchText)) {
          return true;
        }

        // Search in station name or other station properties
        if ((code.station?.name || '').toLowerCase().includes(searchText)) {
          return true;
        }

        // If station has multiple stations (e.g., vl.ct)
        if (code.station?.stations && Array.isArray(code.station.stations)) {
          if (
            code.station.stations.some((s) =>
              (s.name || '').toLowerCase().includes(searchText)
            )
          ) {
            return true;
          }
        }

        // Search in all numbers and bet types from lines
        if (hasMatchInNumbers(code.lines)) {
          return true;
        }

        // Search in bet type names using BET_CONFIG
        const matchesBetType = betConfig.betTypes.some(
          (betType) =>
            betType.name.toLowerCase().includes(searchText) ||
            betType.aliases.some((alias) =>
              alias.toLowerCase().includes(searchText)
            )
        );

        if (
          matchesBetType &&
          code.lines &&
          code.lines.some((line) =>
            betConfig.betTypes.some(
              (bt) =>
                bt.name === line.betType?.id ||
                bt.aliases.some(
                  (a) => a.toLowerCase() === line.betType?.alias?.toLowerCase()
                )
            )
          )
        ) {
          return true;
        }

        return false;
      }

      // Handle combined criteria search
      if (filterCriteria.searchText) {
        const searchText = filterCriteria.searchText.toLowerCase();
        let foundMatch = false;

        // Search in original text
        if ((code.originalText || '').toLowerCase().includes(searchText)) {
          foundMatch = true;
        }

        // Search in formatted text
        else if (
          (code.formattedText || '').toLowerCase().includes(searchText)
        ) {
          foundMatch = true;
        }

        // Search in station name
        else if (
          (code.station?.name || '').toLowerCase().includes(searchText)
        ) {
          foundMatch = true;
        }

        // Search in multiple stations
        else if (
          code.station?.stations &&
          Array.isArray(code.station.stations)
        ) {
          if (
            code.station.stations.some((s) =>
              (s.name || '').toLowerCase().includes(searchText)
            )
          ) {
            foundMatch = true;
          }
        }

        // Search in numbers array and bet types
        else if (code.lines && Array.isArray(code.lines)) {
          for (const line of code.lines) {
            // Search in original line
            if ((line.originalLine || '').toLowerCase().includes(searchText)) {
              foundMatch = true;
              break;
            }

            // Search in numbers
            if (line.numbers && Array.isArray(line.numbers)) {
              if (line.numbers.some((num) => num.includes(searchText))) {
                foundMatch = true;
                break;
              }
            }

            // Search in bet type alias
            if (
              (line.betType?.alias || '').toLowerCase().includes(searchText)
            ) {
              foundMatch = true;
              break;
            }

            // Search in bet type name using betConfig
            const betType = betConfig.betTypes.find(
              (bt) =>
                bt.name === line.betType?.id ||
                bt.aliases.some(
                  (a) => a.toLowerCase() === line.betType?.alias?.toLowerCase()
                )
            );

            if (
              betType &&
              (betType.name.toLowerCase().includes(searchText) ||
                betType.aliases.some((alias) =>
                  alias.toLowerCase().includes(searchText)
                ))
            ) {
              foundMatch = true;
              break;
            }
          }
        }

        if (!foundMatch) return false;
      }

      // Other filter criteria remain unchanged
      if (
        filterCriteria.station &&
        code.station?.name !== filterCriteria.station
      ) {
        return false;
      }

      if (filterCriteria.dateFrom || filterCriteria.dateTo) {
        const codeDate = new Date(code.createdAt).getTime();

        if (filterCriteria.dateFrom) {
          const fromDate = new Date(filterCriteria.dateFrom).getTime();
          if (codeDate < fromDate) return false;
        }

        if (filterCriteria.dateTo) {
          const toDate = new Date(filterCriteria.dateTo).getTime();
          if (codeDate > toDate) return false;
        }
      }

      if (
        filterCriteria.minAmount &&
        code.stakeAmount < filterCriteria.minAmount
      ) {
        return false;
      }

      if (
        filterCriteria.maxAmount &&
        code.stakeAmount > filterCriteria.maxAmount
      ) {
        return false;
      }

      // Match specific bet types if specified
      if (filterCriteria.betType) {
        const betTypeToMatch = filterCriteria.betType.toLowerCase();
        let hasBetType = false;

        if (code.lines && Array.isArray(code.lines)) {
          for (const line of code.lines) {
            // Direct match with alias
            if (line.betType?.alias?.toLowerCase() === betTypeToMatch) {
              hasBetType = true;
              break;
            }

            // Match with any alias in betConfig
            const betType = betConfig.betTypes.find(
              (bt) =>
                bt.name === line.betType?.id ||
                bt.aliases.some(
                  (a) => a.toLowerCase() === line.betType?.alias?.toLowerCase()
                )
            );

            if (
              betType &&
              betType.aliases.some(
                (alias) => alias.toLowerCase() === betTypeToMatch
              )
            ) {
              hasBetType = true;
              break;
            }
          }
        }

        if (!hasBetType) return false;
      }

      return true;
    });
  }, [state, draftCodes]);

  // Analyze a new bet code without adding it
  const analyzeBetCode = useCallback((text) => {
    return betCodeService.analyzeBetCode(text, betConfig);
  }, []);

  const value = {
    draftCodes,
    isInitialized,
    selectedCodeId,
    addDraftCode,
    removeDraftCode,
    editDraftCode,
    confirmDraftCodes,
    confirmDraftCode,
    getBetCode,
    selectBetCode,
    clearSelection,
    getSelectedBetCode,
    batchDeleteCodes,
    filterCodes,
    getStatistics,
    getFilteredCodes,
    getFilteredStatistics,
    analyzeBetCode,
  };

  return (
    <BetCodeContext.Provider value={value}>{children}</BetCodeContext.Provider>
  );
}

export function useBetCode() {
  const context = useContext(BetCodeContext);
  if (context === undefined) {
    throw new Error('useBetCode must be used within a BetCodeProvider');
  }
  return context;
}
