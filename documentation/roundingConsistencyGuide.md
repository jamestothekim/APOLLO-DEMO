# Rounding Consistency Guide for APOLLO

## Overview

This document explains the rounding consistency approach implemented in APOLLO to ensure that exported data from both the Depletions and Summary views reconciles correctly, since all data originates from the same source.

## Problem Identified

Previously, there were inconsistencies in how rounding was applied across different stages of data processing:

1. **Raw Data Processing**: Used 2 decimal places (hundredths) - `Math.round(x * 100) / 100`
2. **Summary Aggregation**: Used 1 decimal place (tenths) - `Math.round(x * 10) / 10`
3. **Display/Export**: Used 1 decimal place for formatting

This led to potential discrepancies where:

- Raw data was rounded during aggregation
- Summary totals didn't match individual row totals
- Export reconciliation issues between views

## Solution Implemented

### Core Principle: Raw Aggregation, Display Rounding

1. **Aggregation Stage**: All calculations and aggregations use raw, unrounded values
2. **Display Stage**: Rounding is applied only at the final display/export stage
3. **Consistency**: Both views use the same rounding method (tenths precision)

### Implementation Details

#### 1. Centralized Rounding Function

```typescript
/**
 * Rounds a number to one decimal place (tenths precision) for consistent display.
 * This should be used at the final display/export stage, not during aggregation.
 */
export const roundToTenth = (num: number | null | undefined): number => {
  const n = num || 0;
  return Math.round(n * 10) / 10;
};
```

This function is available in both:

- `src/volume/util/volumeUtil.tsx`
- `src/volume/calculations/depletionCalculations.ts`

#### 2. Raw Data Processing Changes

**Before:**

```typescript
// In processRawData - applied rounding during aggregation
aggregatedItem.months[monthName]!.value +=
  Math.round((valueToAdd || 0) * 100) / 100;
```

**After:**

```typescript
// Store raw values without intermediate rounding for accurate aggregation
aggregatedItem.months[monthName]!.value += Number(valueToAdd) || 0;
```

#### 3. Display Formatting

All display and export functions now use:

```typescript
roundToTenth(value).toLocaleString(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
```

### Files Modified

1. **`src/volume/calculations/depletionCalculations.ts`**

   - Added `roundToTenth` function
   - Removed intermediate rounding in `processRawData`
   - Store raw values during aggregation

2. **`src/volume/util/volumeUtil.tsx`**

   - Added `roundToTenth` function
   - Updated `exportToCSV` to use consistent rounding
   - Applied rounding in export formatting

3. **`src/volume/depletions/depletions.tsx`**

   - Updated display rendering to use `roundToTenth`
   - Maintained formatting while ensuring consistency

4. **`src/volume/summary/summary.tsx`**
   - Updated display rendering to use `roundToTenth`
   - Ensured summary totals use same rounding method

## Benefits

1. **Data Reconciliation**: Exports from both views now reconcile correctly
2. **Single Source of Truth**: Raw data aggregation ensures accuracy
3. **Consistent Display**: All users see the same rounded values
4. **Maintainability**: Centralized rounding function makes future changes easier

## Usage Guidelines

### ✅ Do

- Use `roundToTenth()` for final display values
- Perform aggregations on raw, unrounded data
- Apply rounding only at the display/export stage

### ❌ Don't

- Round values during intermediate calculations
- Use different rounding methods in different views
- Apply rounding during data aggregation

## Testing Recommendations

1. **Export Reconciliation**: Verify that totals from Summary and Depletions exports match
2. **Precision Testing**: Test edge cases with values like 1.95, 1.949, 1.951
3. **Large Aggregations**: Test with many rows to ensure no accumulation errors

## Future Considerations

- If business requirements change the display precision, only update the `roundToTenth` function
- Maintain the principle of raw aggregation, display rounding
- Consider adding unit tests for rounding consistency
