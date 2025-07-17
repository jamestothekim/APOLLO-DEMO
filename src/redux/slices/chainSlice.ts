import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { generateChainForecastData } from '../../chains/chainPlayData/chainPlayData';

// Chain forecast data interface - keep in sync with chainPlanner.tsx
export interface ChainForecastData {
  id: string;
  market: string;
  chain: string;
  product: string;
  forecastLogic: string;
  tyVol: number;
  months: {
    [key: string]: {
      value: number;
      isManuallyModified?: boolean;
      isActual?: boolean;
    };
  };
  comments?: string;
  status?: 'draft' | 'review' | 'approved';
}

// Filter state for chain data
export interface ChainFilters {
  selectedMarkets: string[];
  selectedChains: string[];
  selectedProducts: string[];
}

// Chain slice state
interface ChainState {
  data: ChainForecastData[];
  filteredData: ChainForecastData[];
  filters: ChainFilters;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

// Initial state
const initialState: ChainState = {
  data: [],
  filteredData: [],
  filters: {
    selectedMarkets: [],
    selectedChains: [],
    selectedProducts: [],
  },
  loading: false,
  error: null,
  lastUpdated: null,
};

// Generate dynamic play data on each fetch
const generatePlayData = (): ChainForecastData[] => {
  return generateChainForecastData();
};

// Async thunk for fetching chain data
// TODO: Replace with real API call when backend is ready
export const fetchChainData = createAsyncThunk(
  'chain/fetchData',
  async (_filters?: Partial<ChainFilters>) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // TODO: Replace with actual API call
    // const response = await axios.get(`${API_URL}/chains/forecast`, { params: filters });
    // return response.data;
    
    // For now, return dynamically generated data
    return generatePlayData();
  }
);

// Async thunk for updating forecast logic
// TODO: Replace with real API call when backend is ready
export const updateChainForecastLogic = createAsyncThunk(
  'chain/updateForecastLogic',
  async ({ id, forecastLogic }: { id: string; forecastLogic: string }) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // TODO: Replace with actual API call
    // const response = await axios.post(`${API_URL}/chains/forecast/${id}/logic`, { forecastLogic });
    // return response.data;
    
    // For now, return the update
    return { id, forecastLogic };
  }
);

// Async thunk for updating monthly values
// TODO: Replace with real API call when backend is ready
export const updateChainMonthlyValue = createAsyncThunk(
  'chain/updateMonthlyValue',
  async ({ id, month, value }: { id: string; month: string; value: number }) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // TODO: Replace with actual API call
    // const response = await axios.post(`${API_URL}/chains/forecast/${id}/month`, { month, value });
    // return response.data;
    
    // For now, return the update
    return { id, month, value };
  }
);

// Helper function to apply filters
const applyFilters = (data: ChainForecastData[], filters: ChainFilters): ChainForecastData[] => {
  return data.filter(row => {
    if (filters.selectedMarkets.length && !filters.selectedMarkets.includes(row.market)) return false;
    if (filters.selectedChains.length && !filters.selectedChains.includes(row.chain)) return false;
    if (filters.selectedProducts.length && !filters.selectedProducts.includes(row.product)) return false;
    return true;
  });
};

// Chain slice
const chainSlice = createSlice({
  name: 'chain',
  initialState,
  reducers: {
    // Update filters
    setFilters: (state, action: PayloadAction<Partial<ChainFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.filteredData = applyFilters(state.data, state.filters);
    },
    
    // Clear filters
    clearFilters: (state) => {
      state.filters = {
        selectedMarkets: [],
        selectedChains: [],
        selectedProducts: [],
      };
      state.filteredData = state.data;
    },
    
    // Update single row forecast logic (optimistic update)
    updateForecastLogicOptimistic: (state, action: PayloadAction<{ id: string; forecastLogic: string }>) => {
      const { id, forecastLogic } = action.payload;
      const rowIndex = state.data.findIndex(row => row.id === id);
      if (rowIndex !== -1) {
        state.data[rowIndex].forecastLogic = forecastLogic;
      }
      // Update filtered data too
      state.filteredData = applyFilters(state.data, state.filters);
    },
    
    // Update single month value (optimistic update)
    updateMonthValueOptimistic: (state, action: PayloadAction<{ id: string; month: string; value: number }>) => {
      const { id, month, value } = action.payload;
      const rowIndex = state.data.findIndex(row => row.id === id);
      if (rowIndex !== -1) {
        const existingMonth = state.data[rowIndex].months[month];
        state.data[rowIndex].months[month] = {
          value,
          isManuallyModified: true,
          isActual: existingMonth?.isActual || false, // Preserve existing isActual flag
        };
      }
      // Update filtered data too
      state.filteredData = applyFilters(state.data, state.filters);
    },
    
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch chain data
      .addCase(fetchChainData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChainData.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.filteredData = applyFilters(action.payload, state.filters);
        state.lastUpdated = Date.now();
      })
      .addCase(fetchChainData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch chain data';
      })
      
      // Update forecast logic
      .addCase(updateChainForecastLogic.fulfilled, (state, action) => {
        const { id, forecastLogic } = action.payload;
        const rowIndex = state.data.findIndex(row => row.id === id);
        if (rowIndex !== -1) {
          state.data[rowIndex].forecastLogic = forecastLogic;
        }
        state.filteredData = applyFilters(state.data, state.filters);
      })
      .addCase(updateChainForecastLogic.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update forecast logic';
      })
      
      // Update monthly value
      .addCase(updateChainMonthlyValue.fulfilled, (state, action) => {
        const { id, month, value } = action.payload;
        const rowIndex = state.data.findIndex(row => row.id === id);
        if (rowIndex !== -1) {
          state.data[rowIndex].months[month] = {
            value,
            isManuallyModified: true,
          };
        }
        state.filteredData = applyFilters(state.data, state.filters);
      })
      .addCase(updateChainMonthlyValue.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update monthly value';
      });
  },
});

// Export actions
export const {
  setFilters,
  clearFilters,
  updateForecastLogicOptimistic,
  updateMonthValueOptimistic,
  clearError,
} = chainSlice.actions;

// Selectors
export const selectChainData = (state: { chain: ChainState }) => state.chain.data;
export const selectFilteredChainData = (state: { chain: ChainState }) => state.chain.filteredData;
export const selectChainFilters = (state: { chain: ChainState }) => state.chain.filters;
export const selectChainLoading = (state: { chain: ChainState }) => state.chain.loading;
export const selectChainError = (state: { chain: ChainState }) => state.chain.error;
export const selectChainLastUpdated = (state: { chain: ChainState }) => state.chain.lastUpdated;

// Derived selectors for filter options
export const selectMarketOptions = (state: { chain: ChainState }) => 
  Array.from(new Set(state.chain.data.map(d => d.market))).sort();

export const selectChainOptions = (state: { chain: ChainState }) => 
  Array.from(new Set(state.chain.data.map(d => d.chain))).sort();

export const selectProductOptions = (state: { chain: ChainState }) => 
  Array.from(new Set(state.chain.data.map(d => d.product))).sort();

// Export reducer
export default chainSlice.reducer; 