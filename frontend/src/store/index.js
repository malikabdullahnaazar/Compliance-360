import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import themeReducer from './slices/themeSlice';
import { rbacMiddleware } from './middleware/rbacMiddleware';

const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    theme: themeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(rbacMiddleware),
});

export default store;
