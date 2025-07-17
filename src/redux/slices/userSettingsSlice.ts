import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

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
  // guidance column/row selections have moved to guidance slice; only brand / market filters remain here
  selectedBrands: string[];
  selectedMarkets: string[];
  volumeForecastMarkets: string[];
  volumeForecastBrands: string[];
  volumeForecastTags: number[];
  // Status for fetching available guidance options
  guidanceStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  guidanceError: string | null;
}

// Simplified Initial State
const initialState: GuidanceSettingsState = {
  availableGuidance: [],
  selectedBrands: [],
  selectedMarkets: [],
  volumeForecastMarkets: [],
  volumeForecastBrands: [],
  volumeForecastTags: [],
  guidanceStatus: 'idle',
  guidanceError: null,
};

// Keep only fetchGuidance thunk
export const fetchGuidance = createAsyncThunk<Guidance[]>(
  'guidanceSettings/fetchGuidance',
  async (_, { rejectWithValue }) => {
    try {
      // Demo mode - return static guidance data
      const { simulateApiDelay } = await import('../../playData/demoConfig');
      await simulateApiDelay();
      
      // Return basic guidance structure
      const guidance: Guidance[] = [
        { 
          id: 1, 
          label: 'TRENDS', 
          sublabel: '3M / 6M / 12M',
          value: null,
          calculation: {
            type: 'multi_calc',
            format: 'percent',
            subCalculations: [
              { id: '3M', cyField: 'cy_3m_case_equivalent_volume', pyField: 'py_3m_case_equivalent_volume', calculationType: 'percentage' },
              { id: '6M', cyField: 'cy_6m_case_equivalent_volume', pyField: 'py_6m_case_equivalent_volume', calculationType: 'percentage' },
              { id: '12M', cyField: 'cy_12m_case_equivalent_volume', pyField: 'py_12m_case_equivalent_volume', calculationType: 'percentage' }
            ]
          },
          displayType: 'column',
          availability: 'both'
        },
        { 
          id: 2, 
          label: 'VOL LY', 
          sublabel: 'FY (9L)',
          value: 'py_case_equivalent_volume',
          calculation: { type: 'direct', format: 'number' },
          displayType: 'both',
          availability: 'both'
        },
        { 
          id: 9, 
          label: 'VOL LC', 
          sublabel: 'FY (9L)',
          value: 'prev_published_case_equivalent_volume',
          calculation: { type: 'direct', format: 'number' },
          displayType: 'both',
          availability: 'both'
        }
      ];
      
      return guidance;
    } catch (error) {
        console.error('Error fetching guidance:', error);
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
    // (legacy pending-guidance reducers removed)
    setSelectedBrands: (state, action: PayloadAction<string[]>) => {
      state.selectedBrands = action.payload;
    },
    setSelectedMarkets: (state, action: PayloadAction<string[]>) => {
      state.selectedMarkets = action.payload;
    },
    setVolumeForecastMarkets: (state, action: PayloadAction<string[]>) => {
      state.volumeForecastMarkets = action.payload;
    },
    setVolumeForecastBrands: (state, action: PayloadAction<string[]>) => {
      state.volumeForecastBrands = action.payload;
    },
    setVolumeForecastTags: (state, action: PayloadAction<number[]>) => {
      state.volumeForecastTags = action.payload;
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
  setSelectedBrands,
  setSelectedMarkets,
  setVolumeForecastMarkets,
  setVolumeForecastBrands,
  setVolumeForecastTags,
} = guidanceSettingsSlice.actions;

// Export selectors
export const selectAvailableGuidance = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.availableGuidance;
export const selectGuidanceStatus = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.guidanceStatus;
export const selectSelectedBrands = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.selectedBrands;
export const selectSelectedMarkets = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.selectedMarkets;
export const selectVolumeForecastMarkets = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.volumeForecastMarkets;
export const selectVolumeForecastBrands = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.volumeForecastBrands;
export const selectVolumeForecastTags = (state: { guidanceSettings: GuidanceSettingsState }) => state.guidanceSettings.volumeForecastTags;

// Selectors for guidance columns/rows have moved to guidance slice

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
      // Pull guidance selections from the authoritative `guidance` slice so we
      // don't accidentally overwrite them with stale data that may live in
      // guidanceSettings.  We still take brand / market filter prefs from the
      // guidanceSettings slice.

      const state = getState() as {
        guidanceSettings: GuidanceSettingsState;
        // `guidance` slice shape is declared in its own file and not exported.
        // We use `any` here just to satisfy TypeScript without creating a
        // duplicate public type.
        guidance: any;
      };

      const {
        selectedBrands: _selectedBrands,
        selectedMarkets: _selectedMarkets,
        volumeForecastMarkets: _volumeForecastMarkets,
        volumeForecastBrands: _volumeForecastBrands,
        volumeForecastTags: _volumeForecastTags,
      } = state.guidanceSettings;

      const {
        pendingForecastCols: _forecast_cols,
        pendingForecastRows: _forecast_rows,
        summary: { pendingCols: _summary_cols, pendingRows: _summary_rows },
      } = state.guidance;

      // Demo mode - simulate sync
      const { simulateApiDelay } = await import('../../playData/demoConfig');
      await simulateApiDelay(200, 500);

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