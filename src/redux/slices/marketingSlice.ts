import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MarketingProgram } from '../../marketingPlanner/marketingPlayData/marketingData';

interface MarketingFilters {
  markets: number[];
  brands: number[];
  tags: number[];
}

interface MarketingState {
  programs: MarketingProgram[];
  filters: MarketingFilters;
}

const initialState: MarketingState = {
  programs: [],
  filters: {
    markets: [],
    brands: [],
    tags: [],
  },
};

const marketingSlice = createSlice({
  name: 'marketing',
  initialState,
  reducers: {
    setPrograms(state, action: PayloadAction<MarketingProgram[]>) {
      state.programs = action.payload;
    },
    addProgram(state, action: PayloadAction<MarketingProgram>) {
      state.programs.push(action.payload);
    },
    updateProgram(state, action: PayloadAction<MarketingProgram>) {
      const idx = state.programs.findIndex(p => p.id === action.payload.id);
      if (idx !== -1) {
        state.programs[idx] = action.payload;
      }
    },
    setFilters(state, action: PayloadAction<MarketingFilters>) {
      state.filters = action.payload;
    },
  },
});

export const { setPrograms, addProgram, updateProgram, setFilters } = marketingSlice.actions;

export const selectPrograms = (state: { marketing: MarketingState }) => state.marketing.programs;
export const selectFilters = (state: { marketing: MarketingState }) => state.marketing.filters;

export default marketingSlice.reducer;
