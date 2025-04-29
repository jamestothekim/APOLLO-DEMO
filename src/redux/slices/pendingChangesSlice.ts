import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

// Define RestoredState interface (copy from previous attempts or define as needed)
// Ensure this matches the structure returned by /redi/sync-forecast
export interface RestoredState {
    userId?: string;
    state?: string;
    market_id: string;
    market_name: string;
    market_code?: string;
    customer_id?: string;
    customer_name?: string;
    brand?: string;
    variant?: string;
    variant_id?: string;
    variant_size_pack_id?: string;
    variant_size_pack_desc: string;
    forecastType: string;
    timestamp: number;
    isManualEdit: boolean;
    comment?: string;
    key?: string;
    months: {
      [key: string]: {
        value: number;
        isActual: boolean;
        isManuallyModified?: boolean;
      };
    };
  }


interface PendingChangesState {
  data: RestoredState[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: PendingChangesState = {
  data: [],
  status: 'idle',
  error: null,
};

// Async thunk action to fetch pending changes
export const fetchPendingChanges = createAsyncThunk(
  'pendingChanges/fetch',
  // Thunk argument should match what we dispatch from the component
  async (filters: { markets: string[] | null; brands: string[] | null }, { rejectWithValue }) => {
    try {
        const marketsParam = filters.markets ? JSON.stringify(filters.markets) : null;
        const brandsParam = filters.brands ? JSON.stringify(filters.brands) : null;
        const response = await axios.get(
            `${import.meta.env.VITE_API_URL}/redi/sync-forecast`,
            {
              params: {
                markets: marketsParam,
                brands: brandsParam,
              },
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );
      return response.data as RestoredState[]; // Ensure data is typed
    } catch (error: any) {
        const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch pending changes';
        console.error("[Redux Thunk] Error fetching from /redi/sync-forecast:", errorMessage);
        return rejectWithValue(errorMessage);
    }
  }
);

const pendingChangesSlice = createSlice({
  name: 'pendingChanges',
  initialState,
  reducers: {
    // Optional: Reducer to reset state if needed
    resetPendingChanges: (state) => {
        state.data = [];
        state.status = 'idle';
        state.error = null;
    }
  }, 
  extraReducers: (builder) => {
    builder
      .addCase(fetchPendingChanges.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPendingChanges.fulfilled, (state, action: PayloadAction<RestoredState[]>) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchPendingChanges.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const { resetPendingChanges } = pendingChangesSlice.actions;
export default pendingChangesSlice.reducer; 