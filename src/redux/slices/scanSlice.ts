import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ScanProduct, ScanAccount, ScanMarket } from '../../scanPlanner/scanPlayData/scanData';

// The detailed ScanPlannerRow interface lives in ScanPlannerView; we only need id and dynamic fields here.
export interface ScanPlannerRow {
  id: string;
  [key: string]: any;
}

// --- Types ------------------------------------------------------------------
export interface ScanState {
  plannerRows: ScanPlannerRow[];
  products: readonly ScanProduct[];
  accounts: readonly ScanAccount[];
  markets: readonly ScanMarket[];
  mode: "budget" | "forecast";
}

// --- Initial State ----------------------------------------------------------
import {
  SCAN_PRODUCTS,
  SCAN_ACCOUNTS,
  SCAN_MARKETS,
} from '../../scanPlanner/scanPlayData/scanData';

const initialState: ScanState = {
  plannerRows: [],
  products: SCAN_PRODUCTS,
  accounts: SCAN_ACCOUNTS,
  markets: SCAN_MARKETS,
  mode: "budget",
};

// --- Slice ------------------------------------------------------------------
const scanSlice = createSlice({
  name: 'scan',
  initialState,
  reducers: {
    setPlannerRows(state, action: PayloadAction<ScanPlannerRow[]>) {
      state.plannerRows = action.payload;
    },
    addPlannerRow(state, action: PayloadAction<ScanPlannerRow>) {
      state.plannerRows.push(action.payload);
    },
    addPlannerRows(state, action: PayloadAction<ScanPlannerRow[]>) {
      state.plannerRows.push(...action.payload);
    },
    saveClusterRows(state, action: PayloadAction<{clusterId:string; rows: ScanPlannerRow[]}>) {
      const { clusterId, rows } = action.payload;
      state.plannerRows = state.plannerRows.filter(r => (r as any).clusterId !== clusterId);
      state.plannerRows.push(...rows);
    },
    updatePlannerRow(state, action: PayloadAction<ScanPlannerRow>) {
      const idx = state.plannerRows.findIndex((r: ScanPlannerRow) => r.id === action.payload.id);
      if (idx !== -1) {
        state.plannerRows[idx] = action.payload;
      }
    },
    deletePlannerRow(state, action: PayloadAction<string>) {
      state.plannerRows = state.plannerRows.filter((r: ScanPlannerRow) => r.id !== action.payload);
    },
    deleteClusterRows(state, action: PayloadAction<string>) {
      state.plannerRows = state.plannerRows.filter((r: ScanPlannerRow) => (r as any).clusterId !== action.payload);
    },
    setMode(state, action: PayloadAction<"budget" | "forecast">) {
      state.mode = action.payload;
    },
    resetPlanner(state) {
      state.plannerRows = [];
    },
  },
});

// --- Exports ----------------------------------------------------------------
export const {
  setPlannerRows,
  addPlannerRow,
  addPlannerRows,
  saveClusterRows,
  updatePlannerRow,
  deletePlannerRow,
  deleteClusterRows,
  setMode,
  resetPlanner,
} = scanSlice.actions;

export default scanSlice.reducer; 