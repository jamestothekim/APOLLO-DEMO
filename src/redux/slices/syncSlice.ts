import { createSlice } from '@reduxjs/toolkit';

interface SyncState {
  lastSyncTrigger: number; // A simple timestamp or counter
}

const initialState: SyncState = {
  lastSyncTrigger: 0,
};

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    // Action: Called when a change is made in Depletions
    triggerSync: (state: SyncState) => {
      // Redux Toolkit allows us to write "mutating" logic in reducers.
      // It doesn't actually mutate the state because it uses the Immer library,
      // which detects changes to a "draft state" and produces a brand new
      // immutable state based off those changes
      state.lastSyncTrigger = Date.now(); // Using timestamp for uniqueness
    },
  },
});

// Export the action creator
export const { triggerSync } = syncSlice.actions;

// Export the reducer
export default syncSlice.reducer; 