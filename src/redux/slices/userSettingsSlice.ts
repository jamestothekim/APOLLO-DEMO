import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import axios from 'axios';

// Updated Guidance type to match backend response and component usage

// Define the structure for a single sub-calculation within multi_calc
interface SubCalculation {
  id: string; // e.g., "3M", "6M", "12M"
  cyField: string; // Field name for current year value
  pyField: string; // Field name for prior year value
  calculationType: 'percentage' | 'difference' | 'direct'; // Type of calculation for this part
}

// Define the possible structures for the calculation field
interface BaseCalculation {
  type: string; // 'direct', 'percentage', 'difference', 'multi_calc'
  format?: 'number' | 'percent';
}

interface StandardCalculation extends BaseCalculation {
  type: 'direct' | 'percentage' | 'difference';
}

interface MultiCalculation extends BaseCalculation {
  type: 'multi_calc';
  subCalculations: SubCalculation[];
}

// Define the possible structures for the value field
interface ExpressionValue {
  expression: string;
}

interface FractionValue {
  numerator: string;
  denominator: string;
}

// Main Guidance Interface
export interface Guidance {
  id: number;
  label: string;
  sublabel?: string;
  // Value can be a string, an object for expression/fraction, or null for multi_calc
  value: string | ExpressionValue | FractionValue | null;
  // Calculation uses the union type
  calculation: StandardCalculation | MultiCalculation;
  displayType: 'row' | 'column' | 'both';
  availability: 'summary' | 'depletions' | 'both';
}

// Simplified State for Guidance Settings
export interface GuidanceSettingsState {
  availableGuidance: Guidance[];
  // Pending state holds selections modified in the UI before saving
  pendingForecastCols: number[];
  pendingForecastRows: number[];
  pendingSummaryCols: number[];
  pendingSummaryRows: number[];
  selectedBrands: string[];
  selectedMarkets: string[];
  isGuidanceInitialized: boolean; // Tracks if pending state is initialized from UserContext
  // Status for fetching available guidance options
  guidanceStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  guidanceError: string | null;
}

// Simplified Initial State
const initialState: GuidanceSettingsState = {
  availableGuidance: [],
  pendingForecastCols: [],
  pendingForecastRows: [],
  pendingSummaryCols: [],
  pendingSummaryRows: [],
  selectedBrands: [],
  selectedMarkets: [],
  isGuidanceInitialized: false,
  guidanceStatus: 'idle',
  guidanceError: null,
};

// Keep only fetchGuidance thunk
export const fetchGuidance = createAsyncThunk<Guidance[]>(
  'guidanceSettings/fetchGuidance',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/util/get-guidance`
      );
      return response.data as Guidance[];
    } catch (error) {
        console.error('Error fetching guidance:', error);
        if (axios.isAxiosError(error)) {
          return rejectWithValue(error.response?.data || 'Failed to fetch guidance');
        }
        return rejectWithValue('An unexpected error occurred');
    }
  }
);

// REMOVED fetchMarkets, fetchBrands, loadUserPreferences thunks

// Slice definition
const guidanceSettingsSlice = createSlice({
  name: 'guidanceSettings', // Renamed slice for clarity
  initialState,
  reducers: {
    // Accepts initial settings from UserContext
    initializePendingGuidance: (state, action: PayloadAction<{ forecastCols: number[], forecastRows: number[], summaryCols: number[], summaryRows: number[] }>) => {
      // Always update pending state from payload when this action is dispatched
      state.pendingForecastCols = action.payload.forecastCols;
      state.pendingForecastRows = action.payload.forecastRows;
      state.pendingSummaryCols = action.payload.summaryCols;
      state.pendingSummaryRows = action.payload.summaryRows;
      state.isGuidanceInitialized = true; // Still mark as initialized
    },
    // Reducers to update pending state based on user actions
    setPendingForecastCols: (state, action: PayloadAction<number[]>) => {
      state.pendingForecastCols = action.payload;
    },
    setPendingForecastRows: (state, action: PayloadAction<number[]>) => {
      state.pendingForecastRows = action.payload;
    },
    setPendingSummaryCols: (state, action: PayloadAction<number[]>) => {
      state.pendingSummaryCols = action.payload;
    },
    setPendingSummaryRows: (state, action: PayloadAction<number[]>) => {
      state.pendingSummaryRows = action.payload;
    },
    // Resets the initialization flag (e.g., on logout)
    resetGuidanceInitialization: (state) => {
      state.isGuidanceInitialized = false;
      // Optionally clear pending state on reset/logout too
      state.pendingForecastCols = [];
      state.pendingForecastRows = [];
      state.pendingSummaryCols = [];
      state.pendingSummaryRows = [];
    },
    setSelectedBrands: (state, action: PayloadAction<string[]>) => {
      state.selectedBrands = action.payload;
    },
    setSelectedMarkets: (state, action: PayloadAction<string[]>) => {
      state.selectedMarkets = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Keep only handlers for fetchGuidance
    builder
      .addCase(fetchGuidance.pending, (state) => {
        state.guidanceStatus = 'loading';
        state.guidanceError = null; // Clear error on pending
      })
      .addCase(fetchGuidance.fulfilled, (state, action) => {
        state.guidanceStatus = 'succeeded';
        state.availableGuidance = action.payload; // Store fetched guidance
      })
      .addCase(fetchGuidance.rejected, (state, action) => {
        state.guidanceStatus = 'failed';
        state.guidanceError = action.payload as string || action.error.message || 'Failed to fetch guidance';
      });
  },
});

// Export actions
export const {
  initializePendingGuidance,
  setPendingForecastCols,
  setPendingForecastRows,
  setPendingSummaryCols,
  setPendingSummaryRows,
  resetGuidanceInitialization,
  setSelectedBrands,
  setSelectedMarkets,
} = guidanceSettingsSlice.actions;

// Export selectors
export const selectAvailableGuidance = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.availableGuidance;
export const selectGuidanceStatus = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.guidanceStatus;
export const selectPendingForecastCols = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.pendingForecastCols;
export const selectPendingForecastRows = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.pendingForecastRows;
export const selectPendingSummaryCols = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.pendingSummaryCols;
export const selectPendingSummaryRows = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.pendingSummaryRows;
export const selectIsGuidanceInitialized = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.isGuidanceInitialized;
export const selectSelectedBrands = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.selectedBrands;
export const selectSelectedMarkets = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.selectedMarkets;

// Selectors to get derived Guidance objects from PENDING IDs
const selectAvailableGuidanceState = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.availableGuidance;
const selectPendingForecastColsState = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.pendingForecastCols;
const selectPendingForecastRowsState = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.pendingForecastRows;
const selectPendingSummaryColsState = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.pendingSummaryCols;
const selectPendingSummaryRowsState = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.pendingSummaryRows;

export const selectPendingGuidanceForecastColumns = createSelector(
    [selectAvailableGuidanceState, selectPendingForecastColsState],
    (availableGuidance, selectedIds): Guidance[] => {
        if (!availableGuidance || !selectedIds) return [];
        const guidanceMap = new Map(availableGuidance.map(g => [g.id, g]));
        const result = selectedIds
            .map(id => guidanceMap.get(id))
            .filter((g): g is Guidance => g !== undefined);
        return result;
    }
);

export const selectPendingGuidanceForecastRows = createSelector(
    [selectAvailableGuidanceState, selectPendingForecastRowsState],
    (availableGuidance, selectedIds): Guidance[] => {
         if (!availableGuidance || !selectedIds) return [];
        const guidanceMap = new Map(availableGuidance.map(g => [g.id, g]));
        return selectedIds
            .map(id => guidanceMap.get(id))
            .filter((g): g is Guidance => g !== undefined);
    }
);

export const selectPendingGuidanceSummaryColumns = createSelector(
    [selectAvailableGuidanceState, selectPendingSummaryColsState],
    (availableGuidance, selectedIds): Guidance[] => {
        if (!availableGuidance || !selectedIds) return [];
        const guidanceMap = new Map(availableGuidance.map(g => [g.id, g]));
        return selectedIds
            .map(id => guidanceMap.get(id))
            .filter((g): g is Guidance => g !== undefined);
    }
);

export const selectPendingGuidanceSummaryRows = createSelector(
    [selectAvailableGuidanceState, selectPendingSummaryRowsState],
    (availableGuidance, selectedIds): Guidance[] => {
        if (!availableGuidance || !selectedIds) return [];
        const guidanceMap = new Map(availableGuidance.map(g => [g.id, g]));
        return selectedIds
            .map(id => guidanceMap.get(id))
            .filter((g): g is Guidance => g !== undefined);
    }
);

// Remove the syncSelectedBrands thunk and keep just the local state update
export const updateSelectedBrands = (brands: string[]) => ({
  type: 'guidanceSettings/setSelectedBrands',
  payload: brands
});

// Add a new thunk for syncing all settings during logout
export const syncAllSettings = createAsyncThunk(
  'guidanceSettings/syncAllSettings',
  async (_, { getState }) => {
    try {
      const state = getState() as { guidanceSettings: GuidanceSettingsState };
      const {
        selectedBrands,
        selectedMarkets,
        pendingForecastCols,
        pendingForecastRows,
        pendingSummaryCols,
        pendingSummaryRows
      } = state.guidanceSettings;

      // Prepare the complete payload for backend sync
      const settingsToSync = {
        summary_selected_brands: selectedBrands,
        summary_selected_markets: selectedMarkets,
        guidance_settings: {
          forecast_cols: pendingForecastCols,
          forecast_rows: pendingForecastRows,
          summary_cols: pendingSummaryCols,
          summary_rows: pendingSummaryRows,
        }
      };

      // Sync to backend with namespaced keys
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/users/sync-settings`,
        settingsToSync // Send the complete settings object
      );

      return true;
    } catch (error) {
      console.error('Error syncing settings during logout:', error);
      throw error;
    }
  }
);

// Add action for updating selected markets
export const updateSelectedMarkets = (markets: string[]) => ({
  type: 'guidanceSettings/setSelectedMarkets',
  payload: markets
});

export default guidanceSettingsSlice.reducer; 