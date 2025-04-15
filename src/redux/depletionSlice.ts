import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import type { RootState } from './store'; // Assuming your store file is named store.ts

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
    [key: string]: any; // Allow other properties
}


// Define the state structure for this slice
interface DepletionsState {
    rawApiData: RawDepletionForecastItem[]; // Store the raw, unprocessed data from the API
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
    lastActualMonthIndex: number; // Store the calculated last actual month index from the raw data
    // We avoid storing derived/processed data here; selectors will handle that.
}

const initialState: DepletionsState = {
    rawApiData: [],
    status: 'idle',
    error: null,
    lastActualMonthIndex: -1,
};

// --- Async Thunk for Fetching Depletions Data ---
// Naming: 'fetchVolumeData' implies it's the core data source for the volume view.
export const fetchVolumeData = createAsyncThunk<
    { rawData: RawDepletionForecastItem[], lastActualMonthIndex: number }, // Return type of the payload creator
    { markets: string[] | null; brands: string[] | null, isCustomerView: boolean }, // Argument type for the payload creator
    { rejectValue: string, state: RootState } // Include RootState for potential future logic
>(
    'volume/fetchData', // Slice name convention: feature/actionName
    async ({ markets, brands, isCustomerView }, { rejectWithValue }) => {

        // Optional: Check if data for these exact filters is already loading/loaded
        // const currentStatus = getState().depletions.status;
        // if (currentStatus === 'loading') {
        //     console.log('[fetchVolumeData] Fetch already in progress. Aborting.');
        //     return rejectWithValue('Fetch already in progress.'); // Prevent duplicate fetches
        // }

        try {
            const token = localStorage.getItem("token");
            if (!token) {
                 console.error('[fetchVolumeData] Error: Auth token not found.');
                return rejectWithValue("Authentication token not found.");
            }

            // Prepare API parameters carefully
            // Use null for empty arrays if the API expects that
            const marketsParam = !isCustomerView && markets && markets.length > 0 ? JSON.stringify(markets) : null;
            const customersParam = isCustomerView && markets && markets.length > 0 ? JSON.stringify(markets) : null;
            const brandsParam = brands && brands.length > 0 ? JSON.stringify(brands) : null;

            const response = await axios.get(
                `${import.meta.env.VITE_API_URL}/volume/depletions-forecast`,
                {
                    params: {
                        isMarketView: !isCustomerView,
                        markets: marketsParam,
                        customers: customersParam,
                        // Only include 'brands' param if not null
                        ...(brandsParam && { brands: brandsParam }),
                    },
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
             console.log(`[fetchVolumeData] Received ${rawData.length} raw items from API.`);

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
             console.log(`[fetchVolumeData] Calculated last actual month index: ${maxActualIndex}`);

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
            .addCase(fetchVolumeData.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchVolumeData.fulfilled, (state, action: PayloadAction<{ rawData: RawDepletionForecastItem[], lastActualMonthIndex: number }>) => {
                state.status = 'succeeded';
                state.rawApiData = action.payload.rawData; // Store the raw data
                state.lastActualMonthIndex = action.payload.lastActualMonthIndex;
                state.error = null; // Clear any previous error
            })
            .addCase(fetchVolumeData.rejected, (state, action) => {
                 console.error('[volumeSlice] fetchVolumeData failed:', action.payload);
                state.status = 'failed';
                state.error = action.payload ?? "Unknown error occurred";
                state.rawApiData = []; // Clear data on failure
                state.lastActualMonthIndex = -1;
            });
    },
});

// --- Selectors ---
// Naming: Clear, descriptive names for accessing state parts.

// Base selector for the raw data
export const selectRawVolumeData = (state: RootState): RawDepletionForecastItem[] => state.volume.rawApiData;

// Selector for the loading status
export const selectVolumeDataStatus = (state: RootState): DepletionsState['status'] => state.volume.status;

// Selector for any error message
export const selectVolumeDataError = (state: RootState): string | null => state.volume.error;

// Selector for the last actual month index
export const selectLastActualMonthIndex = (state: RootState): number => state.volume.lastActualMonthIndex;

// Selectors for derived/processed data will be added later (using createSelector for memoization)
// Example placeholder:
// export const selectProcessedDepletionsForTable = createSelector(
//     [selectRawVolumeData, selectPendingChanges], // Example dependencies
//     (rawVolumeData, pendingChanges) => {
//         // ... processing logic from processRawData in Depletions.tsx ...
//         return processedData;
//     }
// );
// export const selectAggregatedDataForSummary = createSelector(
//     [selectRawVolumeData, selectPendingChanges], // Example dependencies
//     (rawVolumeData, pendingChanges) => {
//         // ... aggregation logic from Summary.tsx ...
//         return aggregatedData;
//     }
// );


// Export the reducer as the default export
export default volumeSlice.reducer;

// Export specific actions if needed (e.g., clearVolumeData)
// export const { clearVolumeData } = volumeSlice.actions;