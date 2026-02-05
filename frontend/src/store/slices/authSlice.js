import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: false,
  roles: [], // e.g., ['admin', 'auditor', 'viewer']
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.roles = action.payload.user.roles || [];
      localStorage.setItem('token', action.payload.token);
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.roles = [];
      localStorage.removeItem('token');
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.roles = action.payload.roles || [];
      state.isAuthenticated = true;
    }
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, setUser } = authSlice.actions;

export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectUserRoles = (state) => state.auth.roles;

export default authSlice.reducer;
