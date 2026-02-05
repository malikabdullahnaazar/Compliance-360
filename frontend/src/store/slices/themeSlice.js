import { createSlice } from '@reduxjs/toolkit';

// Check system preference or localStorage
const getInitialTheme = () => {
  if (localStorage.getItem('theme')) {
    return localStorage.getItem('theme');
  }
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

const initialState = {
  mode: getInitialTheme(),
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', state.mode);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(state.mode);
      if (state.mode === 'dark') document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', state.mode);
    },
    setTheme: (state, action) => {
      state.mode = action.payload;
      localStorage.setItem('theme', action.payload);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(state.mode);
      if (state.mode === 'dark') document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', state.mode);
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export const selectTheme = (state) => state.theme.mode;

export default themeSlice.reducer;
