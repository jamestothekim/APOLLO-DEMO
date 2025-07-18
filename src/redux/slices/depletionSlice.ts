import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import axios from 'axios';
import type { RootState } from '../store'; // Assuming your store file is named store.ts
import { processRawData } from "../../volume/calculations/depletionCalculations";
import {
  selectPendingForecastColsIds,
  selectGuidanceDefs,
} from "../guidance/guidanceSlice";
import type { Guidance } from "../guidance/guidanceSlice";
import { aggregateFromProcessedRows } from "../../volume/calculations/summaryCalculations";

// Define the shape of a single raw depletion forecast item from the API
// This reflects the data structure BEFORE aggregation/processing
export interface RawDepletionForecastItem {
    market_id: string;
    market?: string; // Often included, use market_name preferably
    customer_id?: string;
    customer?: string; // Often included, use customer_name preferably
    variant_size_pack_desc: string;
    brand?: string;
    variant?: string;
    variant_id?: string;
    variant_size_pack_id?: string;
    month: number; // Month number (1-12)
    case_equivalent_volume?: number;
    py_case_equivalent_volume?: string | number;
    gross_sales_value?: string | number;
    py_gross_sales_value?: string | number;
    forecast_method?: string; // Forecast logic/method used for this *source* row
    data_type?: string; // e.g., 'actual_complete', 'forecast'
    is_manual_input?: boolean;
    // Include other potential fields from the API response if necessary
    // Example: id, market_name, customer_name (if consistently provided)
    cy_3m_case_equivalent_volume?: string | number;
    cy_6m_case_equivalent_volume?: string | number;
    cy_12m_case_equivalent_volume?: string | number;
    py_3m_case_equivalent_volume?: string | number;
    py_6m_case_equivalent_volume?: string | number;
    py_12m_case_equivalent_volume?: string | number;
    [key: string]: any; // Allow other properties
}


// Define the state structure for this slice
interface DepletionsState {
    rawApiData: RawDepletionForecastItem[]; // Store the raw, unprocessed data from the API (Market View)
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
    lastActualMonthIndex: number; // Store the calculated last actual month index from the raw data (Market View)
    // Add state for customer-specific data
    customerRawApiData: RawDepletionForecastItem[];
    customerStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    customerError: string | null;
    customerLastActualMonthIndex: number; // Add if needed, or calculate via selector
}

const initialState: DepletionsState = {
    rawApiData: [],
    status: 'idle',
    error: null,
    lastActualMonthIndex: -1,
    // Initialize customer state
    customerRawApiData: [],
    customerStatus: 'idle',
    customerError: null,
    customerLastActualMonthIndex: -1, // Initialize if storing
};

// Helper function to get current reporting year

// --- Async Thunk for Fetching Depletions Data ---
// Naming: 'fetchVolumeData' implies it's the core data source for the volume view.
export const fetchVolumeData = createAsyncThunk<
    { rawData: RawDepletionForecastItem[], lastActualMonthIndex: number }, // Return type of the payload creator
    { markets: string[] | null; brands: string[] | null, isCustomerView: boolean, year?: string }, // Argument type: Add optional year
    { rejectValue: string, state: RootState } // Include RootState for potential future logic
>(
    'volume/fetchData', // Slice name convention: feature/actionName
    async ({ markets, brands, isCustomerView, year: _year }, { rejectWithValue }) => { // Add year to args

        // Get current year for backend call (unused in demo mode but needed for real API)

        try {
            const token = localStorage.getItem("token");
            if (!token) {
                 console.error('[fetchVolumeData] Error: Auth token not found.');
                return rejectWithValue("Authentication token not found.");
            }

            // Demo mode - generate volume data
            const { generateVolumeData } = await import('../../playData/dataGenerators');
            const { simulateApiDelay } = await import('../../playData/demoConfig');
            
            await simulateApiDelay(); // Simulate API delay
            
            const rawData: RawDepletionForecastItem[] = generateVolumeData(markets || [], brands, isCustomerView);
            
            // Calculate last actual month index directly from the fetched data
            let maxActualIndex = -1;
            rawData.forEach((item) => {
                if (item?.data_type?.includes("actual")) {
                    // Ensure month is a valid number between 1 and 12
                    const monthNum = Number(item.month);
                    if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
                        const monthIndex = monthNum - 1; // 0-based index
                         if (monthIndex > maxActualIndex) {
                             maxActualIndex = monthIndex;
                         }
                    }
                }
            });
             
            return { rawData, lastActualMonthIndex: maxActualIndex };

        } catch (error: any) {
            console.error("[fetchVolumeData] Error fetching volume data:", error);
            const message = axios.isAxiosError(error) && error.response?.data?.message
                ? error.response.data.message
                : error.message || "Failed to fetch volume data";
            return rejectWithValue(message);
        }
    }
);

// --- Slice Definition ---
// Naming: 'volumeSlice' reflects the broader "Volume View" feature this data supports.
const volumeSlice = createSlice({
    name: 'volume', // Feature name
    initialState,
    reducers: {
        // clearVolumeData: (state) => { // Example reducer if needed later
        //     state.rawApiData = [];
        //     state.status = 'idle';
        //     state.error = null;
        //     state.lastActualMonthIndex = -1;
        // }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchVolumeData.pending, (state, action) => {
                // Update status based on view type
                if (action.meta.arg.isCustomerView) {
                    state.customerStatus = 'loading';
                    state.customerError = null;
                } else {
                    state.status = 'loading';
                    state.error = null;
                }
            })
            .addCase(fetchVolumeData.fulfilled, (state, action) => {
                // Access meta.arg - TypeScript might need help here if inference fails
                const isCustomerView = (action.meta as any).arg.isCustomerView;
                const payload = action.payload as { rawData: RawDepletionForecastItem[], lastActualMonthIndex: number }; // Assert payload type

                // Update state based on view type
                if (isCustomerView) {
                    state.customerStatus = 'succeeded';
                    state.customerRawApiData = payload.rawData;
                    state.customerLastActualMonthIndex = payload.lastActualMonthIndex; // Store if needed
                    state.customerError = null;
                } else {
                    state.status = 'succeeded';
                    state.rawApiData = payload.rawData;
                    state.lastActualMonthIndex = payload.lastActualMonthIndex;
                    state.error = null;
                }
            })
            .addCase(fetchVolumeData.rejected, (state, action) => {
                 // Access meta.arg
                 const isCustomerView = (action.meta as any).arg.isCustomerView;
                 console.error('[volumeSlice] fetchVolumeData failed:', action.payload, 'Args:', (action.meta as any).arg);
                // Update state based on view type
                if (isCustomerView) {
                    state.customerStatus = 'failed';
                    state.customerError = (action.payload as string | undefined) ?? "Unknown error occurred";
                    state.customerRawApiData = [];
                    state.customerLastActualMonthIndex = -1;
                } else {
                    state.status = 'failed';
                    state.error = (action.payload as string | undefined) ?? "Unknown error occurred";
                    state.rawApiData = [];
                    state.lastActualMonthIndex = -1;
                }
            });
    },
});

// Base selector for the raw data
export const selectRawVolumeData = (state: RootState): RawDepletionForecastItem[] => state.volume.rawApiData;

// Selector for the loading status
export const selectVolumeDataStatus = (state: RootState): DepletionsState['status'] => state.volume.status;

// Selector for any error message
export const selectVolumeDataError = (state: RootState): string | null => state.volume.error;

// Selector for the last actual month index
export const selectLastActualMonthIndex = (state: RootState): number => state.volume.lastActualMonthIndex;

// --- Add Selectors for Customer Data ---
export const selectCustomerRawVolumeData = (state: RootState): RawDepletionForecastItem[] => state.volume.customerRawApiData;
export const selectCustomerVolumeDataStatus = (state: RootState): DepletionsState['customerStatus'] => state.volume.customerStatus;
export const selectCustomerVolumeDataError = (state: RootState): string | null => state.volume.customerError;
// Optional: Selector for customer last actual month index if needed
export const selectCustomerLastActualMonthIndex = (state: RootState): number => state.volume.customerLastActualMonthIndex;

// --- Selector for Dashboard Data (Add this section) ---

// Define the shape for the dashboard component
interface DashboardData {
    brand: string;
    jan: number;
    feb: number;
    mar: number;
    apr: number;
    may: number;
    jun: number;
    jul: number;
    aug: number;
    sep: number;
    oct: number;
    nov: number;
    dec: number;
    total: number;
}

export const selectDashboardData = createSelector(
    [selectRawVolumeData], // Input selector
    (rawApiData): DashboardData[] => {
        const aggregated: { [brand: string]: DashboardData } = {};

        rawApiData.forEach((item) => {
            const brand = item.brand;
            const volume = item.case_equivalent_volume ?? 0;
            const month = item.month; // Month number (1-12)

            if (!brand || !month || month < 1 || month > 12) {
                return; // Skip items without brand or valid month
            }

            // Initialize brand entry if it doesn't exist
            if (!aggregated[brand]) {
                aggregated[brand] = {
                    brand: brand,
                    jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
                    jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0,
                    total: 0,
                };
            }

            // Add volume to the correct month and total
            const monthKey = [
                'jan', 'feb', 'mar', 'apr', 'may', 'jun',
                'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
            ][month - 1] as keyof Omit<DashboardData, 'brand' | 'total'>;

            if (monthKey) {
                aggregated[brand][monthKey] += volume;
            }
            aggregated[brand].total += volume;
        });

        // Convert to array, round values, and sort
        const result = Object.values(aggregated).map(row => ({
            ...row,
            jan: roundToWhole(row.jan),
            feb: roundToWhole(row.feb),
            mar: roundToWhole(row.mar),
            apr: roundToWhole(row.apr),
            may: roundToWhole(row.may),
            jun: roundToWhole(row.jun),
            jul: roundToWhole(row.jul),
            aug: roundToWhole(row.aug),
            sep: roundToWhole(row.sep),
            oct: roundToWhole(row.oct),
            nov: roundToWhole(row.nov),
            dec: roundToWhole(row.dec),
            total: roundToWhole(row.total),
        })).sort((a, b) => a.brand.localeCompare(b.brand));

        return result;
    }
);

// -----------------------------------------------------------------------------
// Centralized Processed Forecast Rows Selectors (Single Source of Truth)
// -----------------------------------------------------------------------------

// Helper: map pending column IDs to full guidance objects
const selectActiveGuidance = createSelector(
  [selectGuidanceDefs, selectPendingForecastColsIds],
  (defs, ids) => {
    const map = new Map(defs.map((d) => [d.id, d]));
    return ids.map((id) => map.get(id)).filter((g): g is Guidance => g != null);
  }
);

// Core selector – returns { marketRows, customerRows } with all processing applied
export const selectProcessedForecastRows = createSelector(
  [
    selectRawVolumeData,
    selectCustomerRawVolumeData,
    selectActiveGuidance,
    (state: RootState) => state.pendingChanges.data, // Redis overlays
  ],
  (rawData, customerData, guidanceDefs, pendingChanges) => {
    const marketRows = processRawData(
      rawData,
      pendingChanges,
      false, // isCustomerView
      guidanceDefs
    );
    const customerRows = processRawData(
      customerData,
      pendingChanges,
      true, // isCustomerView
      guidanceDefs
    );
    return { marketRows, customerRows };
  }
);

// Summary aggregation selector - converts processed rows to summary format
export const selectSummaryAggregates = createSelector(
  [selectProcessedForecastRows, selectLastActualMonthIndex],
  ({ marketRows, customerRows }, lastActualIndex) => {
    // Avoid double-counting by using customer-level data when available, market-level otherwise
    // Determine which markets have customer breakdown
    const marketsWithCustomers = new Set(
      customerRows.map(row => row.market_id).filter(Boolean)
    );
    
    // Use customer rows for markets with customer breakdown, market rows for others
    const marketOnlyRows = marketRows.filter(row => !marketsWithCustomers.has(row.market_id));
    const allRows = [...marketOnlyRows, ...customerRows];
    
    return aggregateFromProcessedRows(allRows, lastActualIndex);
  }
);

// Filtered summary aggregates selector for market and brand filtering
export const selectFilteredSummaryAggregates = createSelector(
  [
    selectProcessedForecastRows,
    selectLastActualMonthIndex,
    (_state: RootState, selectedMarkets: string[]) => selectedMarkets,
    (_state: RootState, _selectedMarkets: string[], selectedBrands: string[]) => selectedBrands,
  ],
  ({ marketRows, customerRows }, lastActualIndex, selectedMarkets, selectedBrands) => {
    // Avoid double-counting by using customer-level data when available, market-level otherwise
    // Determine which markets have customer breakdown
    const marketsWithCustomers = new Set(
      customerRows.map(row => row.market_id).filter(Boolean)
    );
    
    // Use customer rows for markets with customer breakdown, market rows for others
    const marketOnlyRows = marketRows.filter(row => !marketsWithCustomers.has(row.market_id));
    let allRows = [...marketOnlyRows, ...customerRows];
    
    // Apply market filtering
    if (selectedMarkets.length > 0) {
      allRows = allRows.filter((row) => {
        // Check if this row matches any of the selected markets
        // This handles both market-managed and customer-managed markets
        const matches = selectedMarkets.some((selectedMarket) => {
          // Handle customer IDs (prefixed with "C.")
          if (selectedMarket.startsWith("C.")) {
            const cleanSelectedId = selectedMarket.substring(2);
            return row.customer_id === cleanSelectedId;
          }
          // Handle market IDs (direct match)
          return row.market_id === selectedMarket;
        });
        return matches;
      });
    }
    
    // Apply brand filtering
    if (selectedBrands.length > 0) {
      allRows = allRows.filter((row) => selectedBrands.includes(row.brand));
    }
    
    // Aggregate the filtered rows
    return aggregateFromProcessedRows(allRows, lastActualIndex);
  }
);

// Filtered depletions selector for market, brand, and tag filtering
export const selectFilteredDepletionsRows = createSelector(
  [
    selectProcessedForecastRows,
    (_state: RootState, selectedMarkets: string[]) => selectedMarkets,
    (_state: RootState, _selectedMarkets: string[], selectedBrands: string[]) => selectedBrands,
    (_state: RootState, _selectedMarkets: string[], _selectedBrands: string[], selectedTags: number[]) => selectedTags,
    (_state: RootState, _selectedMarkets: string[], _selectedBrands: string[], _selectedTags: number[], isCustomerView: boolean) => isCustomerView,
  ],
  ({ marketRows, customerRows }, selectedMarkets, selectedBrands, selectedTags, isCustomerView) => {
    // Choose the appropriate rows based on view type
    const relevantRows = isCustomerView ? customerRows : marketRows;
    
    // Apply filtering
    return relevantRows.filter((row) => {
      // Market filtering
      const marketMatch =
        selectedMarkets.length === 0 ||
        (isCustomerView
          ? selectedMarkets.some((selectedMarket) => {
              // Handle both prefixed ("C.17054") and non-prefixed ("17054") customer IDs
              const cleanSelectedId = selectedMarket.startsWith("C.")
                ? selectedMarket.substring(2)
                : selectedMarket;
              return row.customer_id === cleanSelectedId;
            })
          : selectedMarkets.includes(row.market_id));
      
      // Brand filtering
      const brandMatch =
        selectedBrands.length === 0 || selectedBrands.includes(row.brand);

      // Tag filtering
      const tagMatch =
        selectedTags.length === 0 ||
        (row.tags && row.tags.some((tag) => selectedTags.includes(tag.tag_id)));

      return marketMatch && brandMatch && tagMatch;
    });
  }
);

// Export the reducer as the default export
export default volumeSlice.reducer;

// Export specific actions if needed (e.g., clearVolumeData)
// export const { clearVolumeData } = volumeSlice.actions;

// Helper function for rounding numbers (add this)
function roundToWhole(num: number | null | undefined): number {
    return Math.round(num || 0);
}