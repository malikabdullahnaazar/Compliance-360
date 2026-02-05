import { addToast } from '../slices/uiSlice';

/**
 * Middleware to check for Role Based Access Control
 * Checks for actions with meta: { roles: ['required_role'] }
 */
export const rbacMiddleware = store => next => action => {
  // If the action has a meta field with roles
  if (action.meta && action.meta.roles) {
    const state = store.getState();
    const userRoles = state.auth.roles || [];
    const requiredRoles = action.meta.roles;

    // Check if user has at least one of the required roles
    const hasPermission = requiredRoles.some(role => userRoles.includes(role));

    if (!hasPermission) {
      // Dispatch an error toast or unauthorized action
      store.dispatch(addToast({
        type: 'error',
        message: 'Access Denied: You do not have permission to perform this action.',
      }));
      
      // Block the action
      return;
    }
  }

  return next(action);
};
