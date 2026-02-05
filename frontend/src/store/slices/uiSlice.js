import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isLoading: false,
  loadingMessage: '',
  
  // Confirmation Modal State
  confirmationModal: {
    isOpen: false,
    title: '',
    message: '',
    variant: 'info', // info, danger, warning
    onConfirmType: null, // String identifier for the action
    onConfirmPayload: null,
  },

  // Toast Notifications
  toasts: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload.isLoading;
      state.loadingMessage = action.payload.message || '';
    },
    
    openConfirmation: (state, action) => {
      const { title, message, variant, onConfirmType, onConfirmPayload } = action.payload;
      state.confirmationModal = {
        isOpen: true,
        title,
        message,
        variant: variant || 'info',
        onConfirmType,
        onConfirmPayload,
      };
    },
    
    closeConfirmation: (state) => {
      state.confirmationModal.isOpen = false;
      state.confirmationModal.onConfirmType = null;
      state.confirmationModal.onConfirmPayload = null;
    },

    addToast: (state, action) => {
      state.toasts.push({
        id: Date.now(),
        type: action.payload.type || 'info', // success, error, warning, info
        message: action.payload.message,
        duration: action.payload.duration || 3000,
      });
    },

    removeToast: (state, action) => {
      state.toasts = state.toasts.filter(toast => toast.id !== action.payload);
    },
  },
});

export const { setLoading, openConfirmation, closeConfirmation, addToast, removeToast } = uiSlice.actions;

export const selectIsLoading = (state) => state.ui.isLoading;
export const selectLoadingMessage = (state) => state.ui.loadingMessage;
export const selectConfirmationModal = (state) => state.ui.confirmationModal;
export const selectToasts = (state) => state.ui.toasts;

export default uiSlice.reducer;
