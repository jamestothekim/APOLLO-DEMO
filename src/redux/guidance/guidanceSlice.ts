import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import axios from 'axios';

// ------------------------------------------------------------------
//  Types
// ------------------------------------------------------------------

export interface SubCalculation {
  id: string;
  cyField: string;
  pyField: string;
  calculationType: 'percentage' | 'difference' | 'direct';
}

export interface BaseCalculation {
  type: string; // 'direct' | 'difference' | 'percentage' | 'multi_calc'
  format?: 'number' | 'percent';
}

export interface StandardCalculation extends BaseCalculation {
  type: 'direct' | 'difference' | 'percentage';
}

export interface MultiCalculation extends BaseCalculation {
  type: 'multi_calc';
  subCalculations: SubCalculation[];
}

export interface ExpressionValue {
  expression: string;
}

export interface FractionValue {
  numerator: string;
  denominator: string;
}

export interface Guidance {
  id: number; // client-assigned unique id
  label: string;
  sublabel?: string;
  value: string | ExpressionValue | FractionValue | null;
  calculation: StandardCalculation | MultiCalculation;
  period: 'FY' | 'YTD' | 'TG'; // NEW – needed for YTD / To-Go logic
  metric?: string; // optional metadata (e.g., 'vol_9l', 'gsv')
  dimension?: string; // TY / LY / LC
  calcType?: 'direct' | 'diff' | 'percent' | 'trend';
  displayType: 'row' | 'column' | 'both';
  availability: 'depletions' | 'summary' | 'both';
}

// ------------------------------------------------------------------
//  Utility Functions for Guidance Rules
// ------------------------------------------------------------------

export const isTrends = (guidance: Guidance): boolean => {
  // More robust check - look for the multi_calc type and specific fields
  return guidance.calculation.type === 'multi_calc' && 
         guidance.label === 'TRENDS' &&
         guidance.calculation.subCalculations?.some(sub => sub.id === '3M' || sub.id === '6M' || sub.id === '12M');
};

export const canBeRow = (guidance: Guidance): boolean => {
  return guidance.period === 'FY' && !isTrends(guidance);
};

export const canBeColumn = (guidance: Guidance): boolean => {
  return guidance.displayType === 'column' || guidance.displayType === 'both';
};

export const isDeletable = (guidance: Guidance): boolean => {
  return !isTrends(guidance);
};

// Create the default Trends guidance definition for migration/initialization only
export const createTrendsGuidance = (): Guidance => ({
  id: 1,
  label: 'TRENDS',
  sublabel: '3M / 6M / 12M',
  value: null,
  calculation: {
    type: 'multi_calc',
    format: 'percent',
    subCalculations: [
      {
        id: '3M',
        cyField: 'cy_3m_case_equivalent_volume',
        pyField: 'py_3m_case_equivalent_volume',
        calculationType: 'percentage',
      },
      {
        id: '6M',
        cyField: 'cy_6m_case_equivalent_volume',
        pyField: 'py_6m_case_equivalent_volume',
        calculationType: 'percentage',
      },
      {
        id: '12M',
        cyField: 'cy_12m_case_equivalent_volume',
        pyField: 'py_12m_case_equivalent_volume',
        calculationType: 'percentage',
      },
    ],
  } as MultiCalculation,
  period: 'FY',
  displayType: 'column',
  availability: 'both',
});

// ------------------------------------------------------------------
//  State shape - Adding summary independence while maintaining depletion backward compatibility
// ------------------------------------------------------------------

interface GuidanceState {
  // DEPLETION/FORECAST GUIDANCE (existing - maintained for backward compatibility)
  defs: Guidance[];
  pendingForecastCols: number[];
  pendingForecastRows: number[];
  pendingSummaryCols: number[];
  pendingSummaryRows: number[];
  nextId: number;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  
  // SUMMARY GUIDANCE (new - independent context)
  summary: {
    defs: Guidance[];
    pendingCols: number[];
    pendingRows: number[];
    nextId: number;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
  };
  
  // SHIPMENT GUIDANCE (existing - independent context)
  shipment: {
    defs: Guidance[];
    pendingCols: number[];
    pendingRows: number[];
    nextId: number;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
  };
}

// Initialize with independence between all three contexts
const initialState: GuidanceState = {
  // DEPLETION/FORECAST guidance (existing structure - backward compatibility)
  defs: [createTrendsGuidance()], // Always include Trends in forecast definitions
  pendingForecastCols: [], // Trends starts disabled
  pendingForecastRows: [],
  pendingSummaryCols: [], // Legacy - will be migrated to summary context
  pendingSummaryRows: [], // Legacy - will be migrated to summary context
  nextId: 2, // Start from 2 since 1 is reserved for Trends
  status: 'idle',
  error: null,
  
  // SUMMARY guidance (new - independent)
  summary: {
    defs: [{ ...createTrendsGuidance(), id: 1001 }], // Separate Trends copy with different ID
    pendingCols: [], // Trends starts disabled
    pendingRows: [],
    nextId: 1002, // Start from 1002 to avoid conflicts
    status: 'idle',
    error: null,
  },
  
  // SHIPMENT guidance (existing - independent)
  shipment: {
    defs: [], // Start with empty shipment guidance
    pendingCols: [],
    pendingRows: [],
    nextId: 2000, // Start from 2000 to avoid conflicts
    status: 'idle',
    error: null,
  },
};

// ------------------------------------------------------------------
//  Thunks – load & sync
// ------------------------------------------------------------------

export const loadGuidanceSettings = createAsyncThunk<
  GuidanceState,
  void,
  { rejectValue: string }
>('guidance/loadSettings', async (_, { rejectWithValue }) => {
  try {
    const res = await axios.get(`${import.meta.env.VITE_API_URL}/users/settings`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });

    const remote: any = res.data?.guidance_settings ?? {};
    let defs = remote.forecast_defs ?? remote.guidance_defs ?? [];

    const summaryDefsRaw = remote.summary_defs ?? [];

    // One-time migration: Convert old Trends (ID 14) to new format (ID 1) if it exists
    const hasOldTrends = defs.some((def: Guidance) => def.id === 14 && def.label === 'TRENDS');
    if (hasOldTrends) {
      defs = defs.map((def: Guidance) => {
        if (def.id === 14 && def.label === 'TRENDS') {
          return { ...createTrendsGuidance(), id: 1 }; // Ensure proper structure
        }
        return def;
      });
    }

    // For existing users without Trends, add it (but don't duplicate if already exists)
    const hasTrends = defs.some((def: Guidance) => isTrends(def));
    if (!hasTrends) {
      defs = [createTrendsGuidance(), ...defs];
    }

    // Update IDs in column/row arrays (migrate 14 to 1)
    const migrateIds = (ids: number[]) => 
      ids.map(id => id === 14 ? 1 : id);

    return {
      defs,
      pendingForecastCols: migrateIds(remote.forecast_cols ?? []),
      pendingForecastRows: migrateIds(remote.forecast_rows ?? []),
      pendingSummaryCols: migrateIds(remote.summary_cols ?? []),
      pendingSummaryRows: migrateIds(remote.summary_rows ?? []),
      nextId: Math.max(2, (defs.reduce((max: number, g: Guidance) => Math.max(max, g.id), 1) || 1) + 1),
      summary: {
        defs: summaryDefsRaw.length > 0 ? summaryDefsRaw : [{ ...createTrendsGuidance(), id: 1001 }],
        pendingCols: migrateIds(remote.summary_cols ?? []),
        pendingRows: migrateIds(remote.summary_rows ?? []),
        nextId: Math.max(1002, (summaryDefsRaw.reduce((m: number, g: Guidance)=>Math.max(m,g.id),1001)||1001)+1),
        status: 'succeeded',
        error: null,
      },
      status: 'succeeded',
      error: null,
    } as GuidanceState;
  } catch (err: any) {
    return rejectWithValue(err.message || 'Failed to load guidance settings');
  }
});

export const syncGuidanceSettings = createAsyncThunk<
  void,
  void,
  { state: { guidance: GuidanceState }; rejectValue: string }
>('guidance/syncSettings', async (_, { getState, rejectWithValue }) => {
  try {
    const state = getState().guidance;
    const payload = {
      guidance_settings: {
        forecast_defs: state.defs,
        forecast_cols: state.pendingForecastCols,
        forecast_rows: state.pendingForecastRows,
        summary_defs: state.summary.defs,
        summary_cols: state.summary.pendingCols,
        summary_rows: state.summary.pendingRows,
      },
    };
    await axios.patch(`${import.meta.env.VITE_API_URL}/users/sync-settings`, payload, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
  } catch (err: any) {
    return rejectWithValue(err.message || 'Failed to sync guidance settings');
  }
});

// ------------------------------------------------------------------
//  Slice
// ------------------------------------------------------------------

const guidanceSlice = createSlice({
  name: 'guidance',
  initialState,
  reducers: {
    // DEPLETION GUIDANCE ACTIONS (existing - maintained for backward compatibility)
    addOrUpdateDefinition: (state, action: PayloadAction<Guidance>) => {
      const idx = state.defs.findIndex((d) => d.id === action.payload.id);
      if (idx === -1) {
        state.defs.push(action.payload);
      } else {
        state.defs[idx] = action.payload;
      }
    },
    setDefinitions: (state, action: PayloadAction<Guidance[]>) => {
      // No more auto-injection - just set what's provided
      state.defs = action.payload;
      // Update nextId
      state.nextId = Math.max(2, (action.payload.reduce((m, g) => Math.max(m, g.id), 1) || 1) + 1);
    },
    removeDefinition: (state, action: PayloadAction<number>) => {
      const id = action.payload;
      const guidanceToRemove = state.defs.find(def => def.id === id);
      
      // Prevent deletion of Trends
      if (guidanceToRemove && isTrends(guidanceToRemove)) {
        console.warn('Cannot delete Trends guidance');
        return;
      }
      
      state.defs = state.defs.filter(def => def.id !== id);
      
      // Remove from all selection arrays
      state.pendingForecastCols = state.pendingForecastCols.filter(colId => colId !== id);
      state.pendingForecastRows = state.pendingForecastRows.filter(rowId => rowId !== id);
      state.pendingSummaryCols = state.pendingSummaryCols.filter(colId => colId !== id);
      state.pendingSummaryRows = state.pendingSummaryRows.filter(rowId => rowId !== id);
    },
    setPendingForecastCols: (state, action: PayloadAction<number[]>) => {
      state.pendingForecastCols = action.payload;
    },
    setPendingForecastRows: (state, action: PayloadAction<number[]>) => {
      // Filter out Trends and non-FY guidance from rows
      const validRowIds = action.payload.filter(id => {
        const guidance = state.defs.find(def => def.id === id);
        return guidance && canBeRow(guidance);
      });
      state.pendingForecastRows = validRowIds;
    },
    setPendingSummaryCols: (state, action: PayloadAction<number[]>) => {
      state.pendingSummaryCols = action.payload;
    },
    setPendingSummaryRows: (state, action: PayloadAction<number[]>) => {
      // Filter out Trends and non-FY guidance from rows
      const validRowIds = action.payload.filter(id => {
        const guidance = state.defs.find(def => def.id === id);
        return guidance && canBeRow(guidance);
      });
      state.pendingSummaryRows = validRowIds;
    },
    incrementNextId: (state) => {
      state.nextId += 1;
    },
    
    // SUMMARY GUIDANCE ACTIONS (new - independent context)
    addOrUpdateSummaryDefinition: (state, action: PayloadAction<Guidance>) => {
      const idx = state.summary.defs.findIndex((d) => d.id === action.payload.id);
      if (idx === -1) {
        state.summary.defs.push(action.payload);
      } else {
        state.summary.defs[idx] = action.payload;
      }
    },
    setSummaryDefinitions: (state, action: PayloadAction<Guidance[]>) => {
      state.summary.defs = action.payload;
      // Update nextId for summary context
      state.summary.nextId = Math.max(1002, (action.payload.reduce((m, g) => Math.max(m, g.id), 1001) || 1001) + 1);
    },
    removeSummaryDefinition: (state, action: PayloadAction<number>) => {
      const id = action.payload;
      state.summary.defs = state.summary.defs.filter(def => def.id !== id);
      
      // Remove from summary selection arrays
      state.summary.pendingCols = state.summary.pendingCols.filter(colId => colId !== id);
      state.summary.pendingRows = state.summary.pendingRows.filter(rowId => rowId !== id);
    },
    setSummaryPendingCols: (state, action: PayloadAction<number[]>) => {
      state.summary.pendingCols = action.payload;
    },
    setSummaryPendingRows: (state, action: PayloadAction<number[]>) => {
      // Filter for valid summary row guidance
      const validRowIds = action.payload.filter(id => {
        const guidance = state.summary.defs.find(def => def.id === id);
        return guidance && canBeRow(guidance);
      });
      state.summary.pendingRows = validRowIds;
    },
    incrementSummaryNextId: (state) => {
      state.summary.nextId += 1;
    },
    
    // SHIPMENT GUIDANCE ACTIONS (new - independent context)
    addOrUpdateShipmentDefinition: (state, action: PayloadAction<Guidance>) => {
      const idx = state.shipment.defs.findIndex((d) => d.id === action.payload.id);
      if (idx === -1) {
        state.shipment.defs.push(action.payload);
      } else {
        state.shipment.defs[idx] = action.payload;
      }
    },
    setShipmentDefinitions: (state, action: PayloadAction<Guidance[]>) => {
      state.shipment.defs = action.payload;
      // Update nextId for shipment context
      state.shipment.nextId = Math.max(2000, (action.payload.reduce((m, g) => Math.max(m, g.id), 1999) || 1999) + 1);
    },
    removeShipmentDefinition: (state, action: PayloadAction<number>) => {
      const id = action.payload;
      state.shipment.defs = state.shipment.defs.filter(def => def.id !== id);
      
      // Remove from shipment selection arrays
      state.shipment.pendingCols = state.shipment.pendingCols.filter(colId => colId !== id);
      state.shipment.pendingRows = state.shipment.pendingRows.filter(rowId => rowId !== id);
    },
    setShipmentPendingCols: (state, action: PayloadAction<number[]>) => {
      state.shipment.pendingCols = action.payload;
    },
    setShipmentPendingRows: (state, action: PayloadAction<number[]>) => {
      // Filter for valid shipment row guidance
      const validRowIds = action.payload.filter(id => {
        const guidance = state.shipment.defs.find(def => def.id === id);
        return guidance && canBeRow(guidance);
      });
      state.shipment.pendingRows = validRowIds;
    },
    incrementShipmentNextId: (state) => {
      state.shipment.nextId += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadGuidanceSettings.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadGuidanceSettings.fulfilled, (state, action) => {
        // Merge loaded definitions with existing ones, preserving Trends if it exists
        const loadedDefs = action.payload.defs;
        const existingTrends = state.defs.find(isTrends);
        const loadedTrends = loadedDefs.find(isTrends);
        
        // Use loaded Trends if it exists, otherwise keep existing Trends
        const trendsToUse = loadedTrends || existingTrends;
        const otherDefs = loadedDefs.filter(def => !isTrends(def));
        
        state.defs = trendsToUse ? [trendsToUse, ...otherDefs] : loadedDefs;
        state.pendingForecastCols = action.payload.pendingForecastCols;
        state.pendingForecastRows = action.payload.pendingForecastRows;
        state.pendingSummaryCols = action.payload.pendingSummaryCols;
        state.pendingSummaryRows = action.payload.pendingSummaryRows;
        state.nextId = action.payload.nextId;
        state.summary = action.payload.summary;
        state.status = action.payload.status;
        state.error = action.payload.error;
      })
      .addCase(loadGuidanceSettings.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(syncGuidanceSettings.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

// ------------------------------------------------------------------
//  Selectors
// ------------------------------------------------------------------

// DEPLETION GUIDANCE SELECTORS (existing - maintained for backward compatibility)
export const selectGuidanceDefs = (s: { guidance: GuidanceState }) => s.guidance.defs;
export const selectNextGuidanceId = (s: { guidance: GuidanceState }) => s.guidance.nextId;
export const selectPendingForecastColsIds = (s: { guidance: GuidanceState }) => s.guidance.pendingForecastCols;
export const selectPendingForecastRowsIds = (s: { guidance: GuidanceState }) => s.guidance.pendingForecastRows;
export const selectPendingSummaryColsIds = (s: { guidance: GuidanceState }) => s.guidance.pendingSummaryCols;
export const selectPendingSummaryRowsIds = (s: { guidance: GuidanceState }) => s.guidance.pendingSummaryRows;

// SUMMARY GUIDANCE SELECTORS (new - independent context)
export const selectSummaryGuidanceDefs = (s: { guidance: GuidanceState }) => s.guidance.summary.defs;
export const selectSummaryNextGuidanceId = (s: { guidance: GuidanceState }) => s.guidance.summary.nextId;
export const selectSummaryPendingColsIds = (s: { guidance: GuidanceState }) => s.guidance.summary.pendingCols;
export const selectSummaryPendingRowsIds = (s: { guidance: GuidanceState }) => s.guidance.summary.pendingRows;
export const selectSummaryGuidanceStatus = (s: { guidance: GuidanceState }) => s.guidance.summary.status;
export const selectSummaryGuidanceError = (s: { guidance: GuidanceState }) => s.guidance.summary.error;

// SHIPMENT GUIDANCE SELECTORS (existing - independent context)
export const selectShipmentGuidanceDefs = (s: { guidance: GuidanceState }) => s.guidance.shipment.defs;
export const selectShipmentNextGuidanceId = (s: { guidance: GuidanceState }) => s.guidance.shipment.nextId;
export const selectShipmentPendingColsIds = (s: { guidance: GuidanceState }) => s.guidance.shipment.pendingCols;
export const selectShipmentPendingRowsIds = (s: { guidance: GuidanceState }) => s.guidance.shipment.pendingRows;
export const selectShipmentGuidanceStatus = (s: { guidance: GuidanceState }) => s.guidance.shipment.status;
export const selectShipmentGuidanceError = (s: { guidance: GuidanceState }) => s.guidance.shipment.error;

// Helper function to create a unique key for guidance deduplication based on functional properties
// This is the CANONICAL implementation - all other createGuidanceKey functions should match this
export const createGuidanceKey = (guidance: Guidance): string => {
  return `${guidance.label}|${guidance.sublabel || ''}|${guidance.period}|${guidance.calculation.type}`;
};

// Map ID arrays to Guidance objects (memoised) with deduplication for rows
const makeIdSelector = (idsSelector: (s: { guidance: GuidanceState }) => number[], deduplicate = false) =>
  createSelector([selectGuidanceDefs, idsSelector], (defs, ids) => {
    const map = new Map(defs.map((d) => [d.id, d]));
    const result = ids.map((id) => map.get(id)).filter((g): g is Guidance => g !== undefined);
    
    if (deduplicate) {
      // Deduplicate based on functional properties, keeping the first occurrence
      const seen = new Set<string>();
      return result.filter((guidance) => {
        const key = createGuidanceKey(guidance);
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
    }
    
    return result;
  });

// Map Shipment ID arrays to Shipment Guidance objects (for shipment context)
const makeShipmentIdSelector = (idsSelector: (s: { guidance: GuidanceState }) => number[], deduplicate = false) =>
  createSelector([selectShipmentGuidanceDefs, idsSelector], (defs, ids) => {
    const map = new Map(defs.map((d) => [d.id, d]));
    const result = ids.map((id) => map.get(id)).filter((g): g is Guidance => g !== undefined);
    
    if (deduplicate) {
      // Deduplicate based on functional properties, keeping the first occurrence
      const seen = new Set<string>();
      return result.filter((guidance) => {
        const key = createGuidanceKey(guidance);
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
    }
    
    return result;
  });

// Map Summary ID arrays to Summary Guidance objects (for summary context)
const makeSummaryIdSelector = (idsSelector: (s: { guidance: GuidanceState }) => number[], deduplicate = false) =>
  createSelector([selectSummaryGuidanceDefs, idsSelector], (defs, ids) => {
    const map = new Map(defs.map((d) => [d.id, d]));
    const result = ids.map((id) => map.get(id)).filter((g): g is Guidance => g !== undefined);
    
    if (deduplicate) {
      // Deduplicate based on functional properties, keeping the first occurrence
      const seen = new Set<string>();
      return result.filter((guidance) => {
        const key = createGuidanceKey(guidance);
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
    }
    
    return result;
  });

// DEPLETION GUIDANCE OBJECT SELECTORS (existing)
export const selectPendingForecastCols = makeIdSelector(selectPendingForecastColsIds, true); // Enable deduplication for columns
export const selectPendingForecastRows = makeIdSelector(selectPendingForecastRowsIds, true); // Enable deduplication for rows
export const selectPendingSummaryCols = makeIdSelector(selectPendingSummaryColsIds, true); // Enable deduplication for columns
export const selectPendingSummaryRows = makeIdSelector(selectPendingSummaryRowsIds, true); // Enable deduplication for rows

// SUMMARY GUIDANCE OBJECT SELECTORS (new - independent)
export const selectSummaryPendingCols = makeSummaryIdSelector(selectSummaryPendingColsIds, true); // Enable deduplication for columns
export const selectSummaryPendingRows = makeSummaryIdSelector(selectSummaryPendingRowsIds, true); // Enable deduplication for rows

// SHIPMENT GUIDANCE OBJECT SELECTORS (existing)
export const selectShipmentPendingCols = makeShipmentIdSelector(selectShipmentPendingColsIds, true); // Enable deduplication for columns
export const selectShipmentPendingRows = makeShipmentIdSelector(selectShipmentPendingRowsIds, true); // Enable deduplication for rows

// Filtered selectors based on guidance rules (DEPLETION)
export const selectColumnEligibleGuidance = createSelector(
  [selectGuidanceDefs],
  (defs) => defs.filter(canBeColumn)
);

export const selectRowEligibleGuidance = createSelector(
  [selectGuidanceDefs],
  (defs) => defs.filter(canBeRow)
);

export const selectDeletableGuidance = createSelector(
  [selectGuidanceDefs],
  (defs) => defs.filter(isDeletable)
);

export const selectTrendsGuidance = createSelector(
  [selectGuidanceDefs],
  (defs) => defs.find(isTrends)
);

// Filtered selectors based on guidance rules (SUMMARY)
export const selectSummaryColumnEligibleGuidance = createSelector(
  [selectSummaryGuidanceDefs],
  (defs) => defs.filter(canBeColumn)
);

export const selectSummaryRowEligibleGuidance = createSelector(
  [selectSummaryGuidanceDefs],
  (defs) => defs.filter(canBeRow)
);

export const selectSummaryDeletableGuidance = createSelector(
  [selectSummaryGuidanceDefs],
  (defs) => defs.filter(isDeletable)
);

export const selectSummaryTrendsGuidance = createSelector(
  [selectSummaryGuidanceDefs],
  (defs) => defs.find(isTrends)
);

// Filtered selectors based on guidance rules (SHIPMENT)
export const selectShipmentColumnEligibleGuidance = createSelector(
  [selectShipmentGuidanceDefs],
  (defs) => defs.filter(canBeColumn)
);

export const selectShipmentRowEligibleGuidance = createSelector(
  [selectShipmentGuidanceDefs],
  (defs) => defs.filter(canBeRow)
);

export const selectShipmentDeletableGuidance = createSelector(
  [selectShipmentGuidanceDefs],
  (defs) => defs.filter(isDeletable)
);

// ------------------------------------------------------------------
export const {
  // DEPLETION GUIDANCE ACTIONS (existing - backward compatibility)
  addOrUpdateDefinition,
  setDefinitions,
  removeDefinition,
  setPendingForecastCols,
  setPendingForecastRows,
  setPendingSummaryCols,
  setPendingSummaryRows,
  incrementNextId,
  // SUMMARY GUIDANCE ACTIONS (new - independent context)
  addOrUpdateSummaryDefinition,
  setSummaryDefinitions,
  removeSummaryDefinition,
  setSummaryPendingCols,
  setSummaryPendingRows,
  incrementSummaryNextId,
  // SHIPMENT GUIDANCE ACTIONS (new)
  addOrUpdateShipmentDefinition,
  setShipmentDefinitions,
  removeShipmentDefinition,
  setShipmentPendingCols,
  setShipmentPendingRows,
  incrementShipmentNextId,
} = guidanceSlice.actions;

export default guidanceSlice.reducer; 