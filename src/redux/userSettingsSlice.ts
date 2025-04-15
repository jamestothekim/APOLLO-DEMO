import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import axios from 'axios';

// Updated Guidance type to match backend response and component usage
export interface Guidance {
  id: number; // Changed from string to number
  label: string; // Renamed from name
  sublabel?: string;
  value:
    | string
    | {
        numerator?: string;
        denominator?: string;
        expression?: string;
      };
  calculation: {
    type: "direct" | "percentage" | "difference";
    format?: "number" | "percent";
  };
}

// Simplified State for Guidance Settings
export interface GuidanceSettingsState {
  availableGuidance: Guidance[];
  // Pending state holds selections modified in the UI before saving
  pendingForecastCols: number[];
  pendingForecastRows: number[];
  pendingSummaryCols: number[];
  pendingSummaryRows: number[];
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
    // REMOVED reducers for setSelectedMarkets, setSelectedBrands, etc.
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
} = guidanceSettingsSlice.actions;

// Export selectors
export const selectAvailableGuidance = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.availableGuidance;
export const selectGuidanceStatus = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.guidanceStatus;
export const selectPendingForecastCols = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.pendingForecastCols;
export const selectPendingForecastRows = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.pendingForecastRows;
export const selectPendingSummaryCols = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.pendingSummaryCols;
export const selectPendingSummaryRows = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.pendingSummaryRows;
export const selectIsGuidanceInitialized = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.isGuidanceInitialized;

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


export default guidanceSettingsSlice.reducer; 