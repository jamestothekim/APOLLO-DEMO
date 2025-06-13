import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface MonthData {
  value: number;
  isActual: boolean;
  isManuallyModified?: boolean;
}

interface SidebarState {
  months: { [key: string]: MonthData };
  total: number;
  holdTotal: boolean;
  selectedTrendLines: string[];
}

const initialState: SidebarState = {
  months: {},
  total: 0,
  holdTotal: true,
  selectedTrendLines: [],
};

const sidebarSlice = createSlice({
  name: 'sidebar',
  initialState,
  reducers: {
    setMonths: (state, action: PayloadAction<{ [key: string]: MonthData }>) => {
      state.months = action.payload;
      // Recalculate total
      state.total = Object.values(action.payload).reduce(
        (sum, month) => sum + (month.value || 0),
        0
      );
    },
    updateMonthValue: (
      state,
      action: PayloadAction<{ month: string; value: number }>
    ) => {
      const { month, value } = action.payload;
      if (state.months[month]) {
        console.log('[sidebarSlice] updateMonthValue:', month, value); // DEBUG
        state.months[month] = {
          ...state.months[month],
          value,
          isManuallyModified: true,
        };
        // Recalculate total
        state.total = Object.values(state.months).reduce(
          (sum, month) => sum + (month.value || 0),
          0
        );
      }
    },
    setHoldTotal: (state, action: PayloadAction<boolean>) => {
      state.holdTotal = action.payload;
    },
    setSelectedTrendLines: (state, action: PayloadAction<string[]>) => {
      state.selectedTrendLines = action.payload;
    },
  },
});

export const {
  setMonths,
  updateMonthValue,
  setHoldTotal,
  setSelectedTrendLines,
} = sidebarSlice.actions;

export default sidebarSlice.reducer; 