import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import type { RootState } from '../store';

// --- Interfaces --- //

// Defines the grid position and size of a dashboard item
export interface DashboardPlacement {
  row: number; // 0-indexed row (e.g., 0 or 1 for a 2-row dashboard)
  col: number; // 0-indexed starting column (e.g., 0 or 6)
  width: 6 | 12; // Width in MUI Grid units
}

// Configuration needed to recreate a report/visualization from ReportBuilder
// Note: Needs to match the state used in ReportBuilder to generate the report
export interface ReportConfig {
  rowDimId: string | null;
  colDimId: string | null;
  calcId: string; // Calculation/Measure ID is required
  filterIds: string[]; // IDs of dimensions used as filters
  filterValues: { [key: string]: string[] }; // Selected values for each filter dimension
  // Optional: Add other config if needed, e.g., specific chart options
  // chartOptions?: { /* ... */ };
}

// Represents a single item (table, chart) saved to the dashboard
export interface PublishedItem {
  id: string; // Unique identifier, generated automatically
  name: string; // User-defined name for the report/item
  type: 'table' | 'pie' | 'line'; // Type of visualization
  config: ReportConfig; // The configuration to rebuild this item
  order: number;
  gridPosition: DashboardPlacement; // Where it sits on the dashboard grid
}

// Shape of the entire dashboard state slice
export interface DashboardState {
  items: PublishedItem[]; // Array of all items currently on the dashboard
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// --- Initial State --- //

const initialState: DashboardState = {
  items: [], // Start with an empty dashboard
  status: 'idle',
  error: null
};

// --- Slice Definition --- //

const dashboardSlice = createSlice({
  name: 'dashboard', // Name used in Redux DevTools and state path (state.dashboard)
  initialState,
  reducers: {
    // Action to add a new item to the dashboard
    addItem: (state, action) => {
      const newItem: PublishedItem = {
        ...action.payload,
        id: crypto.randomUUID(),
        order: state.items.length // Set order to current length for new items
      };
      state.items.push(newItem);
    },

    // Action to remove an item from the dashboard using its ID
    removeItem: (state, action) => {
      state.items = state.items.filter(item => item.id !== action.payload.id);
      // Reorder remaining items
      state.items = state.items.map((item, index) => ({
        ...item,
        order: index
      }));
      // Sync to backend without affecting state
      syncDashboardToBackend(state.items);
    },

    // Action to update an existing item (e.g., move/resize, maybe update config later)
    updateItem: (state, action) => {
      const index = state.items.findIndex((item) => item.id === action.payload.id);
      if (index !== -1) {
        // Merge the existing item with the provided changes
        state.items[index] = { ...state.items[index], ...action.payload.changes };
      }
    },

    // Action to replace the entire dashboard state (useful for loading persisted state)
    setDashboardState: (state, action) => {
      state.items = action.payload.items;
    },

    reorderItems: (state, action) => {
      const { sourceIndex, destinationIndex } = action.payload;
      const [removed] = state.items.splice(sourceIndex, 1);
      state.items.splice(destinationIndex, 0, removed);
      // Update order values
      state.items = state.items.map((item, index) => ({
        ...item,
        order: index
      }));
      // Sync to backend without affecting state
      syncDashboardToBackend(state.items);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardConfig.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchDashboardConfig.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.sort((a: PublishedItem, b: PublishedItem) => a.order - b.order);
      })
      .addCase(fetchDashboardConfig.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch dashboard configuration';
      })
      .addCase(syncDashboardToBackend.fulfilled, (state, action) => {
        state.items = action.payload;
        state.error = null;
      })
      .addCase(syncDashboardToBackend.rejected, (state, action) => {
        state.error = action.payload as string || 'Failed to sync dashboard';
      });
  }
});

// --- Exports --- //

// Export the generated action creators
export const {
  addItem,
  removeItem,
  updateItem,
  setDashboardState,
  reorderItems
} = dashboardSlice.actions;

// Export the reducer function to be added to the store
export default dashboardSlice.reducer;

// Async thunk for fetching dashboard configuration
export const fetchDashboardConfig = createAsyncThunk(
  'dashboard/fetchConfig',
  async () => {
    // Demo mode - generate dashboard config
    const { generateDashboardConfig } = await import('../../playData/dataGenerators');
    const { simulateApiDelay } = await import('../../playData/demoConfig');
    
    await simulateApiDelay();
    return generateDashboardConfig();
  }
);

// Async thunk for syncing dashboard changes to backend
export const syncDashboardToBackend = createAsyncThunk(
  'dashboard/syncToBackend',
  async (items: PublishedItem[], { rejectWithValue }) => {
    try {
      // Ensure the items are properly structured before sending
      const cleanedItems = items.map(({ id, type, name, order, config, gridPosition }) => ({
        id,
        type,
        name,
        order,
        config,
        gridPosition
      }));

      // Demo mode - simulate dashboard sync
      const { simulateApiDelay } = await import('../../playData/demoConfig');
      await simulateApiDelay(200, 500);
      return items;
    } catch (error: any) {
      console.error('Error syncing dashboard:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to sync dashboard');
    }
  }
);

export const selectDashboardItems = (state: RootState) => state.dashboard.items;
export const selectDashboardStatus = (state: RootState) => state.dashboard.status; 