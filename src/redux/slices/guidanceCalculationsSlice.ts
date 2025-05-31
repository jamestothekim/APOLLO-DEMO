import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { RawDepletionForecastItem } from './depletionSlice';
import { 
  calculateGuidanceForItem,
  type MonthlyData,
  type BaseData,
  type GuidanceCalculationResult
} from '../../volume/calculations/guidanceCalculations';
import type { Guidance } from '../../redux/slices/userSettingsSlice';

// --- Define structure for calculated summary values --- START
export interface CalculatedGuidanceValue {
    total?: number;
    monthly?: { [month: string]: number };
}

export interface SummaryCalculationsState {
    [aggregateKey: string]: { // e.g., "variant:Brand_VariantId", "brand:BrandName"
        [guidanceId: number]: CalculatedGuidanceValue;
    };
}
// --- Define structure for calculated summary values --- END

export interface GuidanceCalculationsState {
    // Existing state for granular calculations
    calculations: {
        [key: string]: { // key format: 'forecast:marketId:variantSizePackDesc' or 'forecast:customerId:variantSizePackDesc'
            [guidanceId: number]: { // Using guidance ID as key
                value: number; // The calculated guidance value
            };
        };
    };
    // --- Add state for summary calculations --- START
    summaryCalculations: SummaryCalculationsState;
    summaryStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    summaryError: string | null;
    // --- Add state for summary calculations --- END
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

// Initial state
const initialState: GuidanceCalculationsState = {
  calculations: {},
  summaryCalculations: {}, // Initialize new state
  summaryStatus: 'idle',
  summaryError: null,
  status: 'idle',
  error: null,
};

// --- Thunk for calculating summary guidance --- START
export const calculateSummaryGuidance = createAsyncThunk<
    SummaryCalculationsState, // Return type
    {
        filteredData: RawDepletionForecastItem[];
        columnGuidanceDefs: Guidance[];
        rowGuidanceDefs: Guidance[];
    }, // Argument type
    { rejectValue: string } // Thunk options
>(
    'guidanceCalculations/calculateSummary',
    async (_payload, { rejectWithValue }) => {
        // This thunk no longer performs calculations.
        // It might be used solely for status tracking (pending/fulfilled/rejected)
        // or removed entirely if status is managed in the component.
        console.warn("calculateSummaryGuidance thunk was called but no longer performs calculations.");
        try {
            // Simulate async operation if needed for status tracking
            await new Promise(resolve => setTimeout(resolve, 0)); 
            return {} as SummaryCalculationsState; // Return empty object
        } catch (error: any) { 
            console.error("Error in placeholder calculateSummaryGuidance thunk:", error);
            return rejectWithValue('Placeholder thunk failed');
        }
    }
);
// --- Thunk for calculating summary guidance --- END

// Existing thunk for granular calculations
export const calculateGuidanceForItems = createAsyncThunk<
    { [key: string]: { [guidanceId: number]: number } },
    { itemsToCalculate: BaseData[]; guidanceDefinitions: Guidance[] },
    { rejectValue: string }
>(
    'guidanceCalculations/calculateForItems',
    async ({ itemsToCalculate, guidanceDefinitions }, { rejectWithValue }) => {
        try {
            const results: { [key: string]: { [guidanceId: number]: number } } = {};
            
            itemsToCalculate.forEach((item, index) => {
                const itemKey = `item_${index}`; // You may want to use a better key
                const calculationResult = calculateGuidanceForItem(item, guidanceDefinitions);
                
                // Convert to the expected format
                const guidanceValues: { [guidanceId: number]: number } = {};
                Object.entries(calculationResult).forEach(([key, value]) => {
                    const guidanceId = parseInt(key.replace('guidance_', ''), 10);
                    guidanceValues[guidanceId] = value;
                });
                
                results[itemKey] = guidanceValues;
            });
            
            return results;
        } catch (error: any) {
            console.error("Error calculating guidance for items:", error);
            return rejectWithValue(error.message || 'Failed to calculate guidance');
        }
    }
);

const guidanceCalculationsSlice = createSlice({
    name: 'guidanceCalculations',
    initialState,
    reducers: {
        clearGuidanceCalculations: (state) => {
            state.calculations = {};
            state.status = 'idle';
            state.error = null;
        },
        clearSummaryGuidanceCalculations: (state) => {
            state.summaryCalculations = {};
            state.summaryStatus = 'idle';
            state.summaryError = null;
        },
    },
    extraReducers: (builder) => {
        // --- Handle Summary Calculation Thunk --- START
        builder
            .addCase(calculateSummaryGuidance.pending, (state) => {
                state.summaryStatus = 'loading';
                state.summaryError = null;
            })
            .addCase(calculateSummaryGuidance.fulfilled, (state, action: PayloadAction<SummaryCalculationsState>) => {
                state.summaryStatus = 'succeeded';
                state.summaryCalculations = action.payload;
            })
            .addCase(calculateSummaryGuidance.rejected, (state, action) => {
                state.summaryStatus = 'failed';
                state.summaryError = action.payload ?? action.error.message ?? 'Failed to calculate summary guidance';
            });
        // --- Handle Summary Calculation Thunk --- END

        // Existing handlers for calculateGuidanceForItems
        builder
            .addCase(calculateGuidanceForItems.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(calculateGuidanceForItems.fulfilled, (state, action: PayloadAction<{ [key: string]: { [guidanceId: number]: number } }>) => {
                state.status = 'succeeded';
                 // Merge new calculations with existing ones
                 Object.entries(action.payload).forEach(([itemKey, guidanceValues]) => {
                    // Ensure the item key exists in the state
                    if (!state.calculations[itemKey]) {
                        state.calculations[itemKey] = {};
                    }
                    // Assign each calculated guidance value correctly
                    Object.entries(guidanceValues).forEach(([guidanceIdStr, value]) => {
                        const guidanceId = parseInt(guidanceIdStr, 10);
                        // --- Explicitly assign the { value: number } structure --- START
                        state.calculations[itemKey][guidanceId] = { value: value };
                        // --- Explicitly assign the { value: number } structure --- END
                    });
                });
            })
            .addCase(calculateGuidanceForItems.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload ?? action.error.message ?? 'Unknown error calculating guidance';
            });
    },
});

// Export actions and reducer
export const { clearGuidanceCalculations, clearSummaryGuidanceCalculations } = guidanceCalculationsSlice.actions;
export default guidanceCalculationsSlice.reducer;

// --- Selectors ---

// Existing selector for granular calculations
export const selectGuidanceCalculations = (state: { guidanceCalculations: GuidanceCalculationsState }) => state.guidanceCalculations.calculations;
export const selectGuidanceCalculationsStatus = (state: { guidanceCalculations: GuidanceCalculationsState }) => state.guidanceCalculations.status;
export const selectGuidanceCalculationsError = (state: { guidanceCalculations: GuidanceCalculationsState }) => state.guidanceCalculations.error;

// --- Selectors for Summary Calculations --- START
export const selectSummaryCalculationsState = (state: { guidanceCalculations: GuidanceCalculationsState }) => state.guidanceCalculations.summaryCalculations;
export const selectSummaryCalculationsStatus = (state: { guidanceCalculations: GuidanceCalculationsState }) => state.guidanceCalculations.summaryStatus;
export const selectSummaryCalculationsError = (state: { guidanceCalculations: GuidanceCalculationsState }) => state.guidanceCalculations.summaryError;

// Selector to get specific calculation for a summary aggregate key and guidance ID
// Returns CalculatedGuidanceValue | undefined
export const selectSummaryCalculation = (
    state: { guidanceCalculations: GuidanceCalculationsState },
    aggregateKey: string,
    guidanceId: number
): CalculatedGuidanceValue | undefined => {
    return state.guidanceCalculations.summaryCalculations[aggregateKey]?.[guidanceId];
};

// Export types for use in other files
export type { MonthlyData, BaseData, GuidanceCalculationResult }; 