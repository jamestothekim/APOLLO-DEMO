import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { RawDepletionForecastItem } from './depletionSlice';
import { MONTH_NAMES } from '../../volume/util/volumeUtil';

// Types
export interface GuidanceCalculation {
  type: 'direct' | 'percentage' | 'difference';
  format?: 'number' | 'percent';
}

export interface GuidanceValue {
  numerator?: string;
  denominator?: string;
  expression?: string;
}

export interface Guidance {
  id: number;
  label: string;
  sublabel?: string;
  value: string | GuidanceValue;
  calculation: GuidanceCalculation;
}

export interface MonthlyData {
  value: number;
  isActual?: boolean;
  isManuallyModified?: boolean;
}

export interface BaseData {
  months: { [key: string]: MonthlyData };
  case_equivalent_volume?: number;
  py_case_equivalent_volume?: number;
  gross_sales_value?: number;
  py_gross_sales_value?: number;
  gsv_rate?: number;
  py_gsv_rate?: number;
  [key: string]: any;
}

export interface GuidanceCalculationResult {
  [key: string]: number;
}

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

// Helper functions
export const calculateTotal = (months: { [key: string]: MonthlyData }): number => {
  return Object.values(months).reduce((acc, curr) => acc + (curr.value || 0), 0);
};

export const calculateGSVRate = (gsv: number, volume: number): number => {
  return volume > 0 ? gsv / volume : 0;
};

export const calculateGuidanceValue = (
  data: BaseData,
  guidance: Guidance
): number => {
  // For direct values (like py_case_equivalent_volume)
  if (typeof guidance.value === 'string') {
    const fieldName = guidance.value;
    return data[fieldName] || 0;
  }

  // For calculated values
  const value = guidance.value as GuidanceValue;
  const calcType = guidance.calculation.type;

  if (calcType === 'difference' && value.expression) {
    const parts = value.expression.split(' - ');
    const value1 = getFieldValue(data, parts[0]?.trim());
    const value2 = getFieldValue(data, parts[1]?.trim());
    return value1 - value2;
  } else if (calcType === 'percentage' && value.numerator && value.denominator) {
    const numParts = value.numerator.split(' - ');
    const numerator = getFieldValue(data, numParts[0]?.trim()) - getFieldValue(data, numParts[1]?.trim());
    const denominator = getFieldValue(data, value.denominator.trim());
    return denominator === 0 ? 0 : numerator / denominator;
  }

  return 0;
};

// Helper to get field value, handling special cases
const getFieldValue = (data: BaseData, fieldName: string): number => {
  if (!fieldName) return 0;
  
  // Handle special case for case_equivalent_volume (total volume)
  if (fieldName === 'case_equivalent_volume') {
    return data.case_equivalent_volume || calculateTotal(data.months);
  }
  
  // Handle GSV rate calculations
  if (fieldName === 'gsv_rate') {
    return data.gsv_rate || calculateGSVRate(
      data.gross_sales_value || 0,
      data.case_equivalent_volume || calculateTotal(data.months)
    );
  }
  
  if (fieldName === 'py_gsv_rate') {
    return data.py_gsv_rate || calculateGSVRate(
      data.py_gross_sales_value || 0,
      data.py_case_equivalent_volume || 0
    );
  }
  
  // Default case: return the field value or 0
  return data[fieldName] || 0;
};

// Calculate guidance values for a specific data item
export const calculateGuidanceForItem = (
  item: BaseData,
  selectedGuidance: Guidance[]
): GuidanceCalculationResult => {
  const result: GuidanceCalculationResult = {};
  
  // Calculate total volume if not already set
  if (item.case_equivalent_volume === undefined) {
    item.case_equivalent_volume = calculateTotal(item.months);
  }
  
  // Calculate GSV rates if not already set
  if (item.gsv_rate === undefined && item.gross_sales_value !== undefined) {
    item.gsv_rate = calculateGSVRate(item.gross_sales_value, item.case_equivalent_volume);
  }
  
  if (item.py_gsv_rate === undefined && item.py_gross_sales_value !== undefined && item.py_case_equivalent_volume !== undefined) {
    item.py_gsv_rate = calculateGSVRate(item.py_gross_sales_value, item.py_case_equivalent_volume);
  }
  
  // Calculate each guidance value
  selectedGuidance.forEach(guidance => {
    const key = `guidance_${guidance.id}`;
    result[key] = calculateGuidanceValue(item, guidance);
  });
  
  return result;
};

// Calculate monthly guidance values
export const calculateMonthlyGuidanceForItem = (
  item: BaseData,
  guidance: Guidance
): { [month: string]: number } | null => {
  const result: { [month: string]: number } = {};
  
  // For direct values
  if (typeof guidance.value === 'string') {
    const fieldName = guidance.value;
    
    // Check if we have monthly data for this field
    const monthlyFieldName = `${fieldName}_months`;
    if (item[monthlyFieldName] && typeof item[monthlyFieldName] === 'object') {
      MONTH_NAMES.forEach((month: string) => {
        result[month] = item[monthlyFieldName][month]?.value || 0;
      });
      return result;
    }
    
    // If no monthly data, distribute the total value evenly
    const totalValue = item[fieldName] || 0;
    const monthlyValue = totalValue / 12;
    MONTH_NAMES.forEach((month: string) => {
      result[month] = monthlyValue;
    });
    return result;
  }
  
  // For calculated values
  const value = guidance.value as GuidanceValue;
  const calcType = guidance.calculation.type;
  
  if (calcType === 'difference' && value.expression) {
    const parts = value.expression.split(' - ');
    const field1 = parts[0]?.trim();
    const field2 = parts[1]?.trim();
    
    MONTH_NAMES.forEach((month: string) => {
      const value1 = getMonthlyFieldValue(item, field1, month);
      const value2 = getMonthlyFieldValue(item, field2, month);
      result[month] = value1 - value2;
    });
    return result;
  } else if (calcType === 'percentage' && value.numerator && value.denominator) {
    const numParts = value.numerator.split(' - ');
    const numerField1 = numParts[0]?.trim();
    const numerField2 = numParts[1]?.trim();
    const denomField = value.denominator.trim();
    
    MONTH_NAMES.forEach((month: string) => {
      const numerValue1 = getMonthlyFieldValue(item, numerField1, month);
      const numerValue2 = getMonthlyFieldValue(item, numerField2, month);
      const denomValue = getMonthlyFieldValue(item, denomField, month);
      
      const numerator = numerValue1 - numerValue2;
      result[month] = denomValue === 0 ? 0 : numerator / denomValue;
    });
    return result;
  }
  
  return null;
};

// Helper to get monthly field value
const getMonthlyFieldValue = (data: BaseData, fieldName: string, month: string): number => {
  if (!fieldName) return 0;
  
  // Check if we have monthly data for this field
  const monthlyFieldName = `${fieldName}_months`;
  if (data[monthlyFieldName] && typeof data[monthlyFieldName] === 'object') {
    return data[monthlyFieldName][month]?.value || 0;
  }
  
  // Special case for case_equivalent_volume (current forecast volume)
  if (fieldName === 'case_equivalent_volume') {
    return data.months[month]?.value || 0;
  }
  
  // Special case for gsv_rate
  if (fieldName === 'gsv_rate') {
    const monthVolume = data.months[month]?.value || 0;
    const gsvRate = data.gsv_rate || calculateGSVRate(
      data.gross_sales_value || 0,
      data.case_equivalent_volume || calculateTotal(data.months)
    );
    return monthVolume * gsvRate;
  }
  
  // Special case for py_gsv_rate
  if (fieldName === 'py_gsv_rate') {
    const pyMonthVolume = data.py_case_equivalent_volume_months?.[month]?.value || 0;
    const pyGsvRate = data.py_gsv_rate || calculateGSVRate(
      data.py_gross_sales_value || 0,
      data.py_case_equivalent_volume || 0
    );
    return pyMonthVolume * pyGsvRate;
  }
  
  // Default case: return 0
  return 0;
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
    { itemsToCalculate: any[]; guidanceDefinitions: Guidance[] },
    { rejectValue: string }
>(
    'guidanceCalculations/calculateForItems',
    async (_params, { rejectWithValue: _rejectWithValue }) => {
        // --- Use parameters to satisfy linter --- START
        // --- Use parameters to satisfy linter --- END

        // Assume the result processing correctly returns: { itemKey: { guidanceId: calculatedValue } }
        const results: { [key: string]: { [guidanceId: number]: number } } = {};
        // ... placeholder for actual calculation logic ...
        // Replace this with the actual calculation logic that produces the 'results' object
        return results; // Return the calculated values
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

// --- Selector for ALL Summary Calculations --- START
// export const selectSummaryCalculations = (state: { guidanceCalculations: GuidanceCalculationsState }) => state.guidanceCalculations.summaryCalculations;
// --- Selector for ALL Summary Calculations --- END

// Selector to get a specific summary calculation result by aggregate key and guidance ID
// ... existing code ...
// ... existing code ... 