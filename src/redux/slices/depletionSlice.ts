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
    py_case_equivalent_volume?: number;
    gross_sales_value?: number;
    py_gross_sales_value?: number;
    forecast_method?: string; // Forecast logic/method used for this *source* row
    data_type?: string; // e.g., 'actual_complete', 'forecast'
    is_manual_input?: boolean;
    // Include other potential fields from the API response if necessary
    // Example: id, market_name, customer_name (if consistently provided)
    cy_3m_case_equivalent_volume?: number;
    cy_6m_case_equivalent_volume?: number;
    cy_12m_case_equivalent_volume?: number;
    py_3m_case_equivalent_volume?: number;
    py_6m_case_equivalent_volume?: number;
    py_12m_case_equivalent_volume?: number;
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

// Helper function to determine the default reporting year
const getCurrentReportingYear = (): string => {
    // Currently returns the calendar year
    // TODO: Adapt this function for fiscal year logic based on client/settings if needed on frontend
    return new Date().getFullYear().toString();
  };

// --- Async Thunk for Fetching Depletions Data ---
// Naming: 'fetchVolumeData' implies it's the core data source for the volume view.
export const fetchVolumeData = createAsyncThunk<
    { rawData: RawDepletionForecastItem[], lastActualMonthIndex: number }, // Return type of the payload creator
    { markets: string[] | null; brands: string[] | null, isCustomerView: boolean, year?: string }, // Argument type: Add optional year
    { rejectValue: string, state: RootState } // Include RootState for potential future logic
>(
    'volume/fetchData', // Slice name convention: feature/actionName
    async ({ markets, brands, isCustomerView, year }, { rejectWithValue }) => { // Add year to args

        // Get current year if not provided, using the utility function
        const targetYear = year || getCurrentReportingYear();

        try {
            const token = localStorage.getItem("token");
            if (!token) {
                 console.error('[fetchVolumeData] Error: Auth token not found.');
                return rejectWithValue("Authentication token not found.");
            }

            // Use null for empty arrays if the API expects that
            const marketsParam = !isCustomerView && markets && markets.length > 0 ? JSON.stringify(markets) : null;
            const customersParam = isCustomerView && markets && markets.length > 0 ? JSON.stringify(markets) : null;
            const brandsParam = brands && brands.length > 0 ? JSON.stringify(brands) : null;

            // --- Log API Call Parameters --- START
            const requestUrl = `${import.meta.env.VITE_API_URL}/volume/depletions-forecast`;
            const requestParams = {
                isMarketView: !isCustomerView,
                markets: marketsParam,
                customers: customersParam,
                year: targetYear, // Send the year param
                // Only include 'brands' param if not null
                ...(brandsParam && { brands: brandsParam }),
            };
            // --- Log API Call Parameters --- END
            
            const response = await axios.get(
                requestUrl, // Use the defined URL
                {
                    params: requestParams, // Use the defined params
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
          
            if (!response.data) {
                console.warn('[fetchVolumeData] API returned no data.');
                return rejectWithValue("No data received from API.");
            }

            const rawData: RawDepletionForecastItem[] = response.data;
            
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
    // Combine market and customer rows for comprehensive summary
    // Summary should always show state-level aggregates regardless of management type
    const allRows = [...marketRows, ...customerRows];
    return aggregateFromProcessedRows(allRows, lastActualIndex);
  }
);

// Filtered summary aggregates selector for market filtering
export const selectFilteredSummaryAggregates = createSelector(
  [
    selectSummaryAggregates,
    (_: RootState, selectedMarkets: string[]) => selectedMarkets,
  ],
  (summaryAggregates, selectedMarkets) => {
    if (selectedMarkets.length === 0) {
      return summaryAggregates; // No filtering needed
    }
    
    // For Summary, we don't filter at variant level since it should show
    // state-level aggregates. The filtering happens at the data source level
    // in the processRawData function. Return the aggregates as-is.
    return summaryAggregates;
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