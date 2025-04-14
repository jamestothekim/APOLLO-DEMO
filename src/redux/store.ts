import { configureStore } from '@reduxjs/toolkit';
// We will import reducer functions here later
import syncReducer from './syncSlice';
import pendingChangesReducer from './pendingChangesSlice';

export const store = configureStore({
  reducer: {
    // Add reducers here, e.g.:
    sync: syncReducer,
    pendingChanges: pendingChangesReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch; 