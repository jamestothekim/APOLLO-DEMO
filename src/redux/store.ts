import { configureStore } from '@reduxjs/toolkit';
// We will import reducer functions here later
import syncReducer from './slices/syncSlice';
import pendingChangesReducer from './slices/pendingChangesSlice';
// Import the reducer from the refactored slice
import guidanceSettingsReducer from './slices/userSettingsSlice';
// Assume depletionReducer and guidanceCalculationsReducer exist if needed
import volumeReducer from './slices/depletionSlice';
import guidanceCalculationsReducer from './slices/guidanceCalculationsSlice';
// --- Import Dashboard Reducer --- START
import dashboardReducer from './slices/dashboardSlice';
// --- Import Dashboard Reducer --- END
import sidebarReducer from './slices/sidebarSlice';
import scanReducer from './slices/scanSlice';
import guidanceReducer from './guidance/guidanceSlice';

export const store = configureStore({
  reducer: {
    // Add reducers here, e.g.:
    sync: syncReducer,
    pendingChanges: pendingChangesReducer,
    // Use the new reducer name
    guidanceSettings: guidanceSettingsReducer,
    // Add other reducers as needed
    volume: volumeReducer,
    guidanceCalculations: guidanceCalculationsReducer,
    // --- Add Dashboard Reducer --- START
    dashboard: dashboardReducer,
    // --- Add Dashboard Reducer --- END
    sidebar: sidebarReducer,
    scan: scanReducer,
    guidance: guidanceReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// --- Typed Hooks ---
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

// Define and export the typed hooks
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;