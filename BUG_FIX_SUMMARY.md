# Bug Fix: Forecast Value Aggregation Issue

## Problem

Users reported that when they edited May 2025 projection values and saved, the values were recalculating instead of keeping their input. The frontend was showing incorrect aggregated values (e.g., 2,675.4) that didn't match either the saved value (2087.66) or the projected value.

## Root Cause

The backend was returning duplicate records for the same month/market/product combination - both saved (current_version=3) and draft (current_version=0) versions. The frontend aggregation logic in `processRawData` was summing all these values instead of taking only the latest version.

Example of the issue:

- Saved version: case_equivalent_volume = 2087.66
- Draft version: case_equivalent_volume = 587.66
- Frontend was showing: 2675.4 (2087.66 + 587.66 = 2675.32, rounded to 2675.4)

## Solution

### Backend Changes (Primary Fix)

**File: `APOLLO-BACKEND/routes/volume.mjs`**

Modified both the `/depletions-forecast` and `/change-forecast` routes to use CTEs (Common Table Expressions) that filter for only the latest `current_version` for each unique combination of market_id, customer_id, variant_size_pack_id, and month.

```sql
WITH raw_forecast AS (
  SELECT * FROM wg_forecast.get_depletions_forecast(...)
  WHERE "year"::text = $4
),
ranked_forecast AS (
  SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY market_id, COALESCE(customer_id, ''), variant_size_pack_id, month
      ORDER BY COALESCE(current_version, 0) DESC
    ) as rn
  FROM raw_forecast
)
SELECT * FROM ranked_forecast WHERE rn = 1
```

### Frontend Changes (Failsafe)

**File: `APOLLO/src/volume/depletions/depletions.tsx`**

Added a failsafe in the `processRawData` function to handle any remaining duplicates:

1. **Month-level deduplication**: Group items by month and take only the item with the highest `current_version` for each month
2. **Set instead of aggregate**: Changed from `+=` to `=` when setting monthly values since we're now using the latest single record per month
3. **Comment preservation**: Added logic to use comments from the latest saved versions instead of just the first prioritized item
4. **Total calculation**: Calculate total volumes from the monthly breakdowns after deduplication

## Key Changes Made

### Backend

- Modified `/depletions-forecast` route query (both with and without tag filtering)
- Modified `/change-forecast` route query
- Added window function to rank records by `current_version` DESC
- Filter to only return rank 1 (latest) records

### Frontend

- Added month-level deduplication logic as failsafe
- Changed aggregation strategy from sum to latest-value-selection
- Preserved comment logic to work with deduplicated data
- Maintained all existing functionality for guidance calculations

## Testing

The fix ensures that:

1. Only the latest saved version of each month's data is used
2. Manual edits are preserved correctly
3. Comments from the latest versions are displayed
4. Guidance calculations continue to work properly
5. Redis-based unsaved changes still override saved data as expected

## Impact

- Resolves the incorrect value aggregation issue
- Maintains backward compatibility
- Improves data consistency
- Adds redundancy (backend + frontend filtering)
- Preserves all existing functionality including comments, guidance, and manual edits
