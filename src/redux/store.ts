import { configureStore } from '@reduxjs/toolkit';
// We will import reducer functions here later
import syncReducer from './syncSlice';
import pendingChangesReducer from './pendingChangesSlice';
// Import the reducer from the refactored slice
import guidanceSettingsReducer from './userSettingsSlice';
// Assume depletionReducer and guidanceCalculationsReducer exist if needed
import volumeReducer from './depletionSlice';
import guidanceCalculationsReducer from './guidanceCalculationsSlice';

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
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch; 

// --- Typed Hooks ---
// Import hooks from react-redux
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

// Define and export the typed hooks
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector; 