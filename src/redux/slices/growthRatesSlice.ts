import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Growth rate data structure for each row
export interface RowGrowthRates {
  rowId: string; // Matches the forecast row ID
  rates: {
    '3M': number;  // 3-month growth rate as percentage (e.g., 0.15 for 15%)
    '6M': number;  // 6-month growth rate as percentage
    '12M': number; // 12-month growth rate as percentage
  };
  lastCalculated: string; // ISO timestamp of when rates were last calculated
  forecastLogic: string;  // Current forecast logic for this row
}

// State interface
interface GrowthRatesState {
  rowGrowthRates: { [rowId: string]: RowGrowthRates };
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// Initial state
const initialState: GrowthRatesState = {
  rowGrowthRates: {},
  status: 'idle',
  error: null,
};

// Helper function to calculate growth rate from current and prior year values
const calculateGrowthRate = (currentValue: number, priorValue: number): number => {
  if (priorValue === 0) return 0; // Avoid division by zero
  return (currentValue - priorValue) / priorValue;
};

// Slice
const growthRatesSlice = createSlice({
  name: 'growthRates',
  initialState,
  reducers: {
    // Calculate and store growth rates for a specific row
    calculateRowGrowthRates: (
      state,
      action: PayloadAction<{
        rowId: string;
        forecastLogic: string;
        cy_3m_case_equivalent_volume: number;
        py_3m_case_equivalent_volume: number;
        cy_6m_case_equivalent_volume: number;
        py_6m_case_equivalent_volume: number;
        cy_12m_case_equivalent_volume: number;
        py_12m_case_equivalent_volume: number;
      }>
    ) => {
      const {
        rowId,
        forecastLogic,
        cy_3m_case_equivalent_volume,
        py_3m_case_equivalent_volume,
        cy_6m_case_equivalent_volume,
        py_6m_case_equivalent_volume,
        cy_12m_case_equivalent_volume,
        py_12m_case_equivalent_volume,
      } = action.payload;

      const rate3M = calculateGrowthRate(cy_3m_case_equivalent_volume, py_3m_case_equivalent_volume);
      const rate6M = calculateGrowthRate(cy_6m_case_equivalent_volume, py_6m_case_equivalent_volume);
      const rate12M = calculateGrowthRate(cy_12m_case_equivalent_volume, py_12m_case_equivalent_volume);

      state.rowGrowthRates[rowId] = {
        rowId,
        rates: {
          '3M': rate3M,
          '6M': rate6M,
          '12M': rate12M,
        },
        lastCalculated: new Date().toISOString(),
        forecastLogic,
      };
    },

    // Update growth rates for a specific row (manual override)
    updateRowGrowthRates: (
      state,
      action: PayloadAction<{
        rowId: string;
        rates: { '3M'?: number; '6M'?: number; '12M'?: number };
        forecastLogic?: string;
      }>
    ) => {
      const { rowId, rates, forecastLogic } = action.payload;
      
      if (state.rowGrowthRates[rowId]) {
        // Update existing rates
        if (rates['3M'] !== undefined) state.rowGrowthRates[rowId].rates['3M'] = rates['3M'];
        if (rates['6M'] !== undefined) state.rowGrowthRates[rowId].rates['6M'] = rates['6M'];
        if (rates['12M'] !== undefined) state.rowGrowthRates[rowId].rates['12M'] = rates['12M'];
        if (forecastLogic) state.rowGrowthRates[rowId].forecastLogic = forecastLogic;
        state.rowGrowthRates[rowId].lastCalculated = new Date().toISOString();
      }
    },

    // Apply growth rate to forecast volumes based on forecast logic
    applyGrowthRateToForecast: (
      state,
      action: PayloadAction<{
        rowId: string;
        forecastLogic: string;
        baseVolumes: { [month: string]: number }; // LY volumes by month
      }>
    ) => {
      const { rowId, forecastLogic } = action.payload;
      
      if (state.rowGrowthRates[rowId]) {
        // Update the forecast logic for this row
        state.rowGrowthRates[rowId].forecastLogic = forecastLogic;
        state.rowGrowthRates[rowId].lastCalculated = new Date().toISOString();
      }
    },

    // Get applicable growth rate based on forecast logic
    getApplicableGrowthRate: (
      _state,
      _action: PayloadAction<{ rowId: string; forecastLogic: string }>
    ) => {
      // This is a pure selector-like action that doesn't modify state
      // The actual logic will be handled in selectors
    },

    // Clear growth rates for all rows (reset)
    clearAllGrowthRates: (state) => {
      state.rowGrowthRates = {};
    },

    // Remove growth rates for a specific row
    removeRowGrowthRates: (state, action: PayloadAction<string>) => {
      const rowId = action.payload;
      delete state.rowGrowthRates[rowId];
    },

    // Bulk update growth rates for multiple rows
    bulkUpdateGrowthRates: (
      state,
      action: PayloadAction<{ [rowId: string]: RowGrowthRates }>
    ) => {
      state.rowGrowthRates = { ...state.rowGrowthRates, ...action.payload };
    },

    // Set error state
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.status = 'failed';
    },

    // Clear error state
    clearError: (state) => {
      state.error = null;
      state.status = 'idle';
    },
  },
});

// Action creators
export const {
  calculateRowGrowthRates,
  updateRowGrowthRates,
  applyGrowthRateToForecast,
  getApplicableGrowthRate,
  clearAllGrowthRates,
  removeRowGrowthRates,
  bulkUpdateGrowthRates,
  setError,
  clearError,
} = growthRatesSlice.actions;

// Selectors
export const selectAllGrowthRates = (state: { growthRates: GrowthRatesState }) => 
  state.growthRates.rowGrowthRates;

export const selectRowGrowthRates = (state: { growthRates: GrowthRatesState }, rowId: string) => 
  state.growthRates.rowGrowthRates[rowId];

export const selectGrowthRateStatus = (state: { growthRates: GrowthRatesState }) => 
  state.growthRates.status;

export const selectGrowthRateError = (state: { growthRates: GrowthRatesState }) => 
  state.growthRates.error;

// Helper selector to get applicable growth rate based on forecast logic
export const selectApplicableGrowthRate = (
  state: { growthRates: GrowthRatesState }, 
  rowId: string, 
  forecastLogic: string
): number => {
  const rowRates = state.growthRates.rowGrowthRates[rowId];
  if (!rowRates) return 0;

  // Map forecast logic to appropriate growth rate period
  switch (forecastLogic) {
    case 'three_month':
      return rowRates.rates['3M'];
    case 'six_month':
      return rowRates.rates['6M'];
    case 'twelve_month':
      return rowRates.rates['12M'];
    case 'flat':
      return 0; // No growth for flat forecast
    default:
      return rowRates.rates['6M']; // Default to 6M rate
  }
};

// Helper function to apply growth rate to a volume value
export const applyGrowthRateToVolume = (baseVolume: number, growthRate: number): number => {
  return baseVolume * (1 + growthRate);
};

export default growthRatesSlice.reducer; 